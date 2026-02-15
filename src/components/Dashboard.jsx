import React, { useState, useEffect } from 'react';
import {
  LogOut, BarChart3, Users, Package, Settings, Eye, EyeOff,
  Plus, Edit, Trash, Check, X, DollarSign, TrendingUp, Copy, RefreshCw,
  Share2, Download, Truck, Calendar, PhoneCall, MapPin, AlertCircle, CheckCircle2, Printer, Send
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { 
  getUserOrders, createOrder, addOrderItems, updateOrderStatus, deleteOrder,
  createWithdrawal, getAffiliatorWithdrawals,
  getAffiliatorByEmail, updateAffiliator, updateProduct, deleteAffiliator, reorderProduct,
  searchCustomers, upsertCustomer, setAffiliatorProductLink, getAffiliatorProductLink
} from '../lib/supabaseQueries';
import { getAffiliatorDashboardSummary, validateWithdrawalRequest, getTopAffiliators } from '../lib/affiliateLogic';
import { getAffiliatorBindings } from '../lib/bindingLogic';
import { generateOrderNumber, calculateOrderTotal, formatOrderForWA } from '../lib/orderUtils';
import { sendOrderConfirmation, sendInvoice, sendResiNotification, sendInvoiceNotification, sendAffiliatorApprovalNotification } from '../lib/fonntePush';
import { validateOngkir, validateResi, validateNomorWA, validateAlamat, validateNama } from '../lib/validation';
import { handleError, safeApiCall, withTimeout } from '../lib/errorHandler';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

export default function Dashboard({ user, onLogout }) {
  // ======================
  // DETERMINE USER TYPE
  // ======================
  const isAdmin = user.type === 'admin';
  const isAffiliator = user.type === 'affiliator';

  // ======================
  // STATE: TABS & UI
  // ======================
  const [activeTab, setActiveTab] = useState(isAdmin ? 'orders' : 'dashboard');
  const [loading, setLoading] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null); // State spesifik untuk delete operation
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ======================
  // STATE: DATA
  // ======================
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [products, setProducts] = useState([]);
  const [affiliators, setAffiliators] = useState([]);
  const [summary, setSummary] = useState(null);

  // ======================
  // STATE: MODALS & FORMS
  // ======================
  const [showOfflineOrderForm, setShowOfflineOrderForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingResi, setEditingResi] = useState(null);
  const [resiNumber, setResiNumber] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [couriername, setCourierName] = useState('J&T');
  const [billOrder, setBillOrder] = useState('');
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);
  const [showResiNotificationModal, setShowResiNotificationModal] = useState(false);
  const [selectedOrderForResiNotif, setSelectedOrderForResiNotif] = useState(null);
  const [resiNotifNumber, setResiNotifNumber] = useState('');

  // Couriers that require bill order
  const couriersWithBill = ['J&T', 'WAHANA', 'ID Express', 'Indah Cargo'];

  // Offline order form
  const [offlineOrder, setOfflineOrder] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    items: [{ product_id: '', quantity: 1, price: 0, varian: '', satuan: '100gr' }],
    shipping_cost: 0,
    courier_name: 'J&T',
    payment_method: 'transfer',
    notes: ''
  });

  // Withdrawal form
  const [withdrawalForm, setWithdrawalForm] = useState({
    nominal: '',
    bank_name: '',
    account_name: '',
    account_number: ''
  });

  // Product Edit Modal
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    product_code: '',
    commission_rate: 10,
    default_link: '',
    sort_order: 0
  });

  // Product Reorder Modal
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderingProduct, setReorderingProduct] = useState(null);
  const [reorderDestination, setReorderDestination] = useState('');

  // Customer Autocomplete & Add Modal
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [showCustomerSearchDropdown, setShowCustomerSearchDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    nama: '',
    nomor_wa: '',
    alamat: ''
  });

  // Affiliator Edit Modal
  const [showEditAffiliatorModal, setShowEditAffiliatorModal] = useState(false);
  const [editingAffiliator, setEditingAffiliator] = useState(null);
  const [editAffiliatorForm, setEditAffiliatorForm] = useState({
    nama: '',
    nomor_wa: '',
    email: '',
    password_hash: '',
    status: 'active',
    current_balance: 0,
    total_commission: 0,
    total_withdrawn: 0,
    akun_tiktok: '',
    bank_name: '',
    account_number: ''
  });

  // Edit Product Link Modal (for Affiliator)
  const [showEditProductLinkModal, setShowEditProductLinkModal] = useState(false);
  const [editingProductForLink, setEditingProductForLink] = useState(null);
  const [productLinkForm, setProductLinkForm] = useState({
    tiktok_shop: ''
  });

  // Share Product Link Modal (for Affiliator)
  const [showShareProductModal, setShowShareProductModal] = useState(false);
  const [sharingProduct, setSharingProduct] = useState(null);

  // Bulk Edit TikTok Links (for Affiliator)
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({});
  const [bulkLinkInput, setBulkLinkInput] = useState(''); // Single link to apply to all

  // Bulk Edit TikTok Links (for Admin) - edit default_link on products table
  const [selectedAdminProducts, setSelectedAdminProducts] = useState([]);
  const [showAdminBulkEditModal, setShowAdminBulkEditModal] = useState(false);
  const [adminBulkEditForm, setAdminBulkEditForm] = useState({});
  const [adminBulkLinkInput, setAdminBulkLinkInput] = useState('');

  // ======================
  // LOAD DATA
  // ======================
  useEffect(() => {
    loadInitialData();
  }, [activeTab, user.id, user.type]);

  const loadInitialData = async () => {
    setErrorMsg('');
    try {
      if (isAdmin) {
        // Admin: load all orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*, users(*), order_items(*, products(*))')
          .order('created_at', { ascending: false });
        setOrders(ordersData || []);

        // Load products
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true });
        setProducts(productsData || []);

        // Load affiliators
        const { data: affiliatorsData } = await supabase
          .from('affiliators')
          .select('*')
          .order('nama', { ascending: true });
        setAffiliators(affiliatorsData || []);
      } else if (isAffiliator) {
        // Affiliator: Load products for all to display
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true });
        setProducts(productsData || []);

        // Load their dashboard summary
        const summaryResult = await getAffiliatorDashboardSummary(user.id);
        if (summaryResult.success) {
          setSummary(summaryResult.summary);
        }

        // Load their bindings
        const bindingsResult = await getAffiliatorBindings(user.id);
        if (bindingsResult.success) {
          setBindings(bindingsResult.bindings || []);
        }

        // Load their withdrawals
        const withdrawalsResult = await getAffiliatorWithdrawals(user.id);
        if (withdrawalsResult.success) {
          setWithdrawals(withdrawalsResult.withdrawals || []);
        }
      }
    } catch (err) {
      setErrorMsg('Error loading data: ' + err.message);
      console.error(err);
    }
  };

  // ======================
  // ADMIN: ORDER MANAGEMENT
  // ======================
  const handleApproveOrder = async (orderId) => {
    try {
      const result = await updateOrderStatus(orderId, 'processing');
      if (result.success) {
        setSuccessMsg('Order disetujui dan sedang diproses');
        loadInitialData();
      } else {
        setErrorMsg(result.error);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handlePrintLabel = async (orderId) => {
    try {
      // Update order status ke 'processing' saat membuka print label
      // (Belum 'shipped' karena masih dalam proses pengiriman)
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Trigger browser print dialog
      window.print();
      
      setSuccessMsg('Status order berubah ke Processing. Silakan print label dan input resi.');
      loadInitialData(); // Refresh data
    } catch (err) {
      setErrorMsg('Error updating status: ' + err.message);
      console.error(err);
    }
  };

  const handleRePrintLabel = (order) => {
    setSelectedOrderForLabel(order);
    setShowPrintLabel(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      image_url: product.image_url || '',
      product_code: product.product_code || '',
      commission_rate: product.commission_rate || 10,
      default_link: product.default_link || '',
      sort_order: product.sort_order || 0
    });
    setShowEditProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    if (!editProductForm.name.trim()) {
      setErrorMsg('Nama produk harus diisi');
      return;
    }

    try {
      setLoading(true);
      const result = await updateProduct(editingProduct.id, editProductForm);
      if (result.success) {
        setSuccessMsg('Produk berhasil diupdate');
        setShowEditProductModal(false);
        setEditingProduct(null);
        loadInitialData();
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSortOrder = async (productId, newSortOrder) => {
    try {
      const result = await updateProduct(productId, { sort_order: newSortOrder });
      if (result.success) {
        loadInitialData();
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    }
  };

  // ===== CUSTOMER AUTOCOMPLETE HANDLERS =====
  const handleCustomerNameChange = async (value) => {
    setOfflineOrder({ ...offlineOrder, customer_name: value });
    
    if (value.trim().length > 1) {
      const result = await searchCustomers(value);
      if (result.success) {
        setCustomerSearchResults(result.customers);
        setShowCustomerSearchDropdown(true);
      }
    } else {
      setShowCustomerSearchDropdown(false);
    }
  };

  const handleCustomerPhoneChange = async (value) => {
    setOfflineOrder({ ...offlineOrder, customer_phone: value });
    
    if (value.trim().length > 2) {
      const result = await searchCustomers(value);
      if (result.success) {
        setCustomerSearchResults(result.customers);
        setShowCustomerSearchDropdown(true);
      }
    } else {
      setShowCustomerSearchDropdown(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setOfflineOrder({
      ...offlineOrder,
      customer_name: customer.nama,
      customer_phone: customer.nomor_wa,
      customer_address: customer.alamat || offlineOrder.customer_address
    });
    setShowCustomerSearchDropdown(false);
    setCustomerSearchResults([]);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerForm.nama.trim()) {
      setErrorMsg('Nama customer harus diisi');
      return;
    }
    if (!newCustomerForm.nomor_wa.trim()) {
      setErrorMsg('Nomor WhatsApp harus diisi');
      return;
    }

    try {
      setLoading(true);
      const result = await upsertCustomer(
        newCustomerForm.nama,
        newCustomerForm.nomor_wa,
        newCustomerForm.alamat || null
      );

      if (result.success) {
        setSuccessMsg('Customer berhasil ditambahkan');
        // Auto-fill form dengan data customer baru
        setOfflineOrder({
          ...offlineOrder,
          customer_name: result.customer.nama,
          customer_phone: result.customer.nomor_wa,
          customer_address: result.customer.alamat || offlineOrder.customer_address
        });
        setShowAddCustomerModal(false);
        setNewCustomerForm({ nama: '', nomor_wa: '', alamat: '' });
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle intelligent product reordering
  const handleReorderProduct = async (productId, destinationPosition) => {
    try {
      setLoading(true);
      
      if (destinationPosition < 1 || destinationPosition > products.length) {
        setErrorMsg(`Posisi harus antara 1 dan ${products.length}`);
        return;
      }

      const result = await reorderProduct(productId, destinationPosition);
      
      if (result.success) {
        setSuccessMsg(`Produk berhasil dipindahkan ke posisi ${destinationPosition}`);
        loadInitialData();
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== AFFILIATOR HANDLERS =====
  const handleEditAffiliator = (affiliator) => {
    setEditingAffiliator(affiliator);
    setEditAffiliatorForm({
      nama: affiliator.nama || '',
      nomor_wa: affiliator.nomor_wa || '',
      email: affiliator.email || '',
      password_hash: '',
      status: affiliator.status || 'active',
      current_balance: affiliator.current_balance || 0,
      total_commission: affiliator.total_commission || 0,
      total_withdrawn: affiliator.total_withdrawn || 0,
      akun_tiktok: Array.isArray(affiliator.akun_tiktok) ? affiliator.akun_tiktok.join(', ') : '',
      bank_name: affiliator.bank_name || '',
      account_number: affiliator.account_number || ''
    });
    setShowEditAffiliatorModal(true);
  };

  const handleSaveAffiliator = async () => {
    if (!editingAffiliator) return;
    if (!editAffiliatorForm.nama.trim()) {
      setErrorMsg('Nama harus diisi');
      return;
    }

    try {
      setLoading(true);
      // Send all updatable fields from affiliators table
      const updateData = {
        nama: editAffiliatorForm.nama,
        nomor_wa: editAffiliatorForm.nomor_wa,
        email: editAffiliatorForm.email,
        status: editAffiliatorForm.status,
        current_balance: parseFloat(editAffiliatorForm.current_balance) || 0,
        total_commission: parseFloat(editAffiliatorForm.total_commission) || 0,
        total_withdrawn: parseFloat(editAffiliatorForm.total_withdrawn) || 0,
        bank_name: editAffiliatorForm.bank_name,
        account_number: editAffiliatorForm.account_number
      };

      // Only include password if it's provided
      if (editAffiliatorForm.password_hash.trim()) {
        updateData.password_hash = editAffiliatorForm.password_hash;
      }

      // Convert TikTok accounts string to array
      if (editAffiliatorForm.akun_tiktok.trim()) {
        updateData.akun_tiktok = editAffiliatorForm.akun_tiktok.split(',').map(acc => acc.trim()).filter(acc => acc.length > 0);
      } else {
        updateData.akun_tiktok = [];
      }
      
      const result = await updateAffiliator(editingAffiliator.id, updateData);
      if (result.success) {
        setSuccessMsg('Mitra berhasil diupdate');
        setShowEditAffiliatorModal(false);
        setEditingAffiliator(null);
        loadInitialData();
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAffiliator = async (affiliatorId, affiliatorName) => {
    const confirmed = window.confirm(
      `⚠️ Apakah Anda yakin ingin menghapus mitra ${affiliatorName}?\n\nTindakan ini tidak dapat dibatalkan!`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await deleteAffiliator(affiliatorId);
      if (result.success) {
        setSuccessMsg(`Mitra ${affiliatorName} berhasil dihapus`);
        loadInitialData();
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAffiliator = async (affiliatorId, affiliatorName) => {
    const confirmed = window.confirm(
      `✅ Setujui aktivasi mitra: ${affiliatorName}?\n\nMitra akan dapat memulai program komisi.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      
      // 1. Get full affiliator data before updating
      const { data: affiliatorData, error: fetchError } = await supabase
        .from('affiliators')
        .select('*')
        .eq('id', affiliatorId)
        .single();

      if (fetchError || !affiliatorData) {
        setErrorMsg('Error: Tidak bisa mengambil data mitra');
        setLoading(false);
        return;
      }

      // 2. Update status to active
      const result = await updateAffiliator(affiliatorId, { status: 'active' });
      if (result.success) {
        // 3. Send WhatsApp approval notification
        try {
          // Kirim password ke affiliator (gunakan password_hash jika plain password tidak tersedia)
          let password = affiliatorData.password_hash || 'Password Anda (hubungi admin jika lupa)';
          if (affiliatorData.plain_password) password = affiliatorData.plain_password;
          await sendAffiliatorApprovalNotification(
            affiliatorData.nomor_wa,
            affiliatorData.nama,
            affiliatorData.email,
            affiliatorData.bank_name || 'N/A',
            affiliatorData.account_number || 'N/A',
            password
          );
          setSuccessMsg(`✅ Mitra ${affiliatorName} diaktifkan & notifikasi WhatsApp terkirim!`);
        } catch (notificationError) {
          console.error('Notification send error:', notificationError);
          // Still show success even if notification fails
          setSuccessMsg(`✅ Mitra ${affiliatorName} berhasil diaktifkan! (Notifikasi gagal terkirim)`);
        }
        
        loadInitialData();
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit Product Link (for Affiliator)
  const handleEditProductLink = async (product) => {
    setEditingProductForLink(product);
    const result = await getAffiliatorProductLink(user.id, product.id);
    if (result.success && result.link) {
      setProductLinkForm({
        tiktok_shop: result.link.tiktok_link || ''
      });
    } else {
      setProductLinkForm({ tiktok_shop: '' });
    }
    setShowEditProductLinkModal(true);
  };

  const handleSaveProductLink = async () => {
    if (!productLinkForm.tiktok_shop.trim()) {
      setErrorMsg('Link TikTok tidak boleh kosong');
      return;
    }

    try {
      setLoading(true);
      const result = await setAffiliatorProductLink(
        user.id,
        editingProductForLink.id,
        productLinkForm.tiktok_shop
      );
      if (result.success) {
        setSuccessMsg(`✅ Link TikTok untuk ${editingProductForLink.name} berhasil disimpan!`);
        setShowEditProductLinkModal(false);
        setProductLinkForm({ tiktok_shop: '' });
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Share Product Link (for Affiliator)
  const handleShareProduct = (product) => {
    setSharingProduct(product);
    setShowShareProductModal(true);
  };

  const generateAffiliatorLink = (product) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?ref=${user.id}&product=${product.id}`;
  };

  const copyLinkToClipboard = (product) => {
    const link = generateAffiliatorLink(product);
    navigator.clipboard.writeText(link);
    setSuccessMsg('✅ Link tersalin ke clipboard!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const shareToWhatsApp = (product) => {
    const link = generateAffiliatorLink(product);
    const message = `🛍️ Halo! Saya punya produk bagus untuk Anda: ${product.name}\n💰 Harga: Rp${product.price.toLocaleString('id-ID')}\n🔗 Klik di sini: ${link}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  // Bulk Edit TikTok Links for Affiliator
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkEditOpen = () => {
    const initialForm = {};
    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      initialForm[productId] = '';
    });
    setBulkEditForm(initialForm);
    setBulkLinkInput(''); // Reset bulk input
    setShowBulkEditModal(true);
  };

  // Apply same link to all selected products
  const applyLinkToAll = () => {
    if (!bulkLinkInput.trim()) {
      setErrorMsg('Masukkan link terlebih dahulu');
      return;
    }
    
    const updatedForm = { ...bulkEditForm };
    selectedProducts.forEach(productId => {
      updatedForm[productId] = bulkLinkInput.trim();
    });
    setBulkEditForm(updatedForm);
    setSuccessMsg('✅ Link diterapkan ke semua produk!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const handleBulkEditSave = async () => {
    try {
      setErrorMsg('');
      let saveCount = 0;

      for (const productId of selectedProducts) {
        const tiktokLink = bulkEditForm[productId]?.trim();
        
        if (tiktokLink) {
          const result = await setAffiliatorProductLink(user.id, productId, tiktokLink);
          if (result.success) {
            saveCount++;
          } else {
            setErrorMsg(`Gagal menyimpan link untuk satu produk`);
            return;
          }
        }
      }

      if (saveCount > 0) {
        setSuccessMsg(`✅ ${saveCount} link TikTok berhasil disimpan!`);
        setShowBulkEditModal(false);
        setSelectedProducts([]);
        setBulkEditForm({});
        setBulkLinkInput('');
        
        // Reload products to refresh links
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true });
        setProducts(productsData || []);
      } else {
        setErrorMsg('Tidak ada link yang diisi');
      }

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving bulk links:', error);
      setErrorMsg('Terjadi kesalahan saat menyimpan');
    }
  };

  // Admin Bulk Edit TikTok Links (edit default_link in products table)
  const toggleAdminProductSelection = (productId) => {
    setSelectedAdminProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAdminBulkEditOpen = () => {
    const initialForm = {};
    selectedAdminProducts.forEach(productId => {
      initialForm[productId] = '';
    });
    setAdminBulkEditForm(initialForm);
    setAdminBulkLinkInput('');
    setShowAdminBulkEditModal(true);
  };

  const applyAdminLinkToAll = () => {
    if (!adminBulkLinkInput.trim()) {
      setErrorMsg('Masukkan link terlebih dahulu');
      return;
    }
    
    const updatedForm = { ...adminBulkEditForm };
    selectedAdminProducts.forEach(productId => {
      updatedForm[productId] = adminBulkLinkInput.trim();
    });
    setAdminBulkEditForm(updatedForm);
    setSuccessMsg('✅ Link diterapkan ke semua produk!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const handleAdminBulkEditSave = async () => {
    try {
      setErrorMsg('');
      let saveCount = 0;

      for (const productId of selectedAdminProducts) {
        const tiktokLink = adminBulkEditForm[productId]?.trim();
        
        if (tiktokLink) {
          const { error } = await supabase
            .from('products')
            .update({ default_link: tiktokLink })
            .eq('id', productId);

          if (error) {
            setErrorMsg(`Gagal menyimpan link untuk satu produk`);
            return;
          }
          saveCount++;
        }
      }

      if (saveCount > 0) {
        setSuccessMsg(`✅ ${saveCount} link default TikTok berhasil diperbarui!`);
        setShowAdminBulkEditModal(false);
        setSelectedAdminProducts([]);
        setAdminBulkEditForm({});
        setAdminBulkLinkInput('');
        
        // Reload products
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true });
        setProducts(productsData || []);
      } else {
        setErrorMsg('Tidak ada link yang diisi');
      }

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving admin bulk links:', error);
      setErrorMsg('Terjadi kesalahan saat menyimpan');
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️  Apakah Anda yakin ingin menghapus order ${orderNumber}?\n\nTindakan ini tidak dapat dibatalkan!`
    );

    if (!confirmed) return;

    try {
      setDeletingOrderId(orderId);
      const result = await deleteOrder(orderId);
      if (result.success) {
        setSuccessMsg(`Order ${orderNumber} berhasil dihapus`);
        loadInitialData();
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleInputResi = async (orderId) => {
    if (!resiNumber.trim()) {
      setErrorMsg('Nomor resi tidak boleh kosong');
      return;
    }

    try {
      // Update order with resi
      const { data, error } = await supabase
        .from('orders')
        .update({
          resi: resiNumber,
          status: 'shipped',
          shipping_courier: couriername,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Send resi notification to customer
      const order = orders.find(o => o.id === orderId);
      if (order?.users?.nomor_wa) {
        await sendResiNotification(
          order.users.nomor_wa,
          resiNumber,
          couriername,
          order.order_number
        );
      }

      setSuccessMsg(`Resi ${resiNumber} berhasil diinput. SMS dikirim ke customer.`);
      setEditingResi(null);
      setResiNumber('');
      setCourierName('JNE');
      loadInitialData();
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      const result = await updateOrderStatus(orderId, 'delivered');
      if (result.success) {
        setSuccessMsg('Order marked as delivered');
        loadInitialData();
      } else {
        setErrorMsg(result.error);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenShippingModal = (order) => {
    setSelectedOrder(order);
    // Pre-fill with existing data jika sudah ada (offline orders)
    setShippingCost(order.shipping_cost || '');
    setCourierName(order.courier_name || 'J&T');
    setBillOrder('');
    setShowShippingModal(true);
  };

  const handleConfirmShipping = async () => {
    // 🔒 STRICT VALIDATION
    const ongkirError = validateOngkir(shippingCost);
    if (ongkirError) {
      setErrorMsg(ongkirError);
      return;
    }

    if (!couriername.trim()) {
      setErrorMsg('Pilih ekspedisi');
      return;
    }

    // Check if bill order is required but empty
    if (couriersWithBill.includes(couriername) && !billOrder.trim()) {
      setErrorMsg(`Nomor tiket/bill order wajib untuk ${couriername}`);
      return;
    }

    try {
      setLoading(true);
      const shippingAmount = parseInt(shippingCost);
      const newTotal = (selectedOrder.total_produk || 0) + shippingAmount;

      // Format resi with courier bill if provided
      let resiData = couriername;
      if (billOrder.trim()) {
        resiData = `${couriername}-${billOrder}`;
      }

      // Update order dengan ongkir, kurirnya, dan status baru
      const { data, error } = await supabase
        .from('orders')
        .update({
          shipping_cost: shippingAmount,
          courier_name: couriername,
          total_bayar: newTotal,
          resi: resiData,
          status: 'WAITING_PAYMENT', // Status baru: menunggu pembayaran
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .select()
        .single();

      if (error) throw error;

      // Send invoice notification to customer dengan link
      if (selectedOrder.users?.nomor_wa) {
        const baseUrl = window.location.origin;
        await safeApiCall(
          () => sendInvoiceNotification(
            selectedOrder.users.nomor_wa,
            selectedOrder.order_number,
            selectedOrder.users.nama,
            selectedOrder.total_produk,
            shippingAmount,
            baseUrl,
            couriername
          ),
          { context: 'Mengirim notifikasi invoice ke customer' }
        );
      }

      setSuccessMsg('✅ Ongkir berhasil disimpan! Invoice sudah dikirim ke customer via WhatsApp.');
      setShowShippingModal(false);
      setShippingCost('');
      setBillOrder('');
      loadInitialData();
    } catch (err) {
      const errorMsg = handleError(err);
      setErrorMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResiNotification = async () => {
    // 🔒 STRICT VALIDATION
    const resiError = validateResi(resiNotifNumber);
    if (resiError) {
      setErrorMsg(resiError);
      return;
    }

    try {
      setLoading(true);
      const phoneNumber = selectedOrderForResiNotif.users?.nomor_wa || selectedOrderForResiNotif.nomor_wa;
      const courierName = selectedOrderForResiNotif.courier_name || 'Kurir';
      
      if (!phoneNumber) {
        setErrorMsg('❌ Nomor WhatsApp customer tidak ditemukan');
        return;
      }

      // Send resi notification via WhatsApp
      const result = await safeApiCall(
        () => sendResiNotification(
          phoneNumber,
          resiNotifNumber,
          courierName,
          selectedOrderForResiNotif.order_number
        ),
        { context: 'Mengirim notifikasi resi ke customer' }
      );

      if (!result.success) {
        const errorMsg = handleError(new Error(result.error || 'Gagal mengirim notifikasi resi'));
        setErrorMsg(errorMsg);
        return;
      }

      // Update order status to 'shipped'
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          resi: resiNotifNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrderForResiNotif.id);

      if (updateError) throw updateError;

      setSuccessMsg('✅ Notifikasi resi berhasil dikirim! Status pesanan diubah ke "Shipped".');
      setShowResiNotificationModal(false);
      setResiNotifNumber('');
      setSelectedOrderForResiNotif(null);
      loadInitialData();
    } catch (err) {
      const errorMsg = handleError(err);
      setErrorMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // ADMIN: OFFLINE ORDER INPUT
  // ======================
  const handleAddOfflineItem = () => {
    setOfflineOrder({
      ...offlineOrder,
      items: [...offlineOrder.items, { product_id: '', quantity: 1, price: 0, varian: '', satuan: '100gr' }]
    });
  };

  const handleRemoveOfflineItem = (index) => {
    const newItems = offlineOrder.items.filter((_, i) => i !== index);
    setOfflineOrder({ ...offlineOrder, items: newItems });
  };

  const handleSubmitOfflineOrder = async () => {
    // 🔒 STRICT VALIDATION
    if (!offlineOrder.customer_name.trim()) {
      setErrorMsg('Nama customer harus diisi');
      return;
    }

    const nameError = validateNama(offlineOrder.customer_name);
    if (nameError) {
      setErrorMsg(nameError);
      return;
    }

    if (!offlineOrder.customer_phone.trim()) {
      setErrorMsg('Nomor WA harus diisi');
      return;
    }

    const phoneError = validateNomorWA(offlineOrder.customer_phone);
    if (phoneError) {
      setErrorMsg(phoneError);
      return;
    }

    if (!offlineOrder.customer_address.trim()) {
      setErrorMsg('Alamat customer harus diisi');
      return;
    }

    const addressError = validateAlamat(offlineOrder.customer_address);
    if (addressError) {
      setErrorMsg(addressError);
      return;
    }

    if (offlineOrder.items.length === 0 || offlineOrder.items.some(i => !i.product_id)) {
      setErrorMsg('Minimal 1 item harus dipilih');
      return;
    }

    try {
      setLoading(true);

      // Auto-save customer jika belum ada di database
      const customerResult = await safeApiCall(
        () => upsertCustomer(
          offlineOrder.customer_name,
          offlineOrder.customer_phone,
          offlineOrder.customer_address
        ),
        { context: 'Menyimpan data customer' }
      );
      
      if (!customerResult.success) {
        console.warn('⚠️ Customer tidak berhasil di-save, lanjut dengan order');
      }

      // Generate order number (call directly, no wrapper)
      const orderNumResult = await generateOrderNumber();
      if (!orderNumResult.success) throw new Error('Gagal membuat nomor pesanan');
      const orderNumber = orderNumResult.orderNumber;

      console.log('✅ Generated order number:', orderNumber);

      // Calculate totals
      const subtotal = offlineOrder.items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
      const total = subtotal + offlineOrder.shipping_cost;

      console.log('📋 Creating order with:', {
        order_number: orderNumber,
        total_produk: subtotal,
        total_bayar: total,
        alamat: offlineOrder.customer_address,
        nomor_wa: offlineOrder.customer_phone
      });

      // Create order (use null for userId for offline orders) - Call directly without safeApiCall wrapper
      const createOrderResult = await createOrder(null, {
        order_number: orderNumber,
        metode_bayar: offlineOrder.payment_method,
        total_produk: subtotal,
        total_bayar: total,
        alamat: offlineOrder.customer_address,
        nomor_wa: offlineOrder.customer_phone,
        nama_pembeli: offlineOrder.customer_name,
        catatan: offlineOrder.notes,
        is_offline: true,
        payment_due_date: null,
        shipping_cost: offlineOrder.shipping_cost,
        courier_name: offlineOrder.courier_name
      });

      if (!createOrderResult.success) throw new Error(createOrderResult.error);

      console.log('✅ Order created with ID:', createOrderResult.order.id);

      // Add order items
      const itemsToAdd = offlineOrder.items.map(item => ({
        product_id: item.product_id,
        qty: item.quantity,
        harga_satuan: item.price,
        subtotal: item.quantity * item.price,
        varian: item.varian || null,
        satuan: item.satuan || '100gr'
      }));

      const addItemsResult = await safeApiCall(
        () => addOrderItems(createOrderResult.order.id, itemsToAdd),
        { context: 'Menambahkan item ke pesanan' }
      );
      if (!addItemsResult.success) throw new Error(addItemsResult.error);

      // Build items data with product names for WhatsApp message
      const itemsForMessage = offlineOrder.items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          product_name: product?.name || 'Produk',
          quantity: item.quantity,
          price: item.price,
          varian: item.varian || null
        };
      });

      // Send confirmation with total payment (subtotal + shipping)
      await safeApiCall(
        () => sendOrderConfirmation(
          offlineOrder.customer_phone,
          offlineOrder.customer_name,
          orderNumResult.orderNumber,
          itemsForMessage,
          subtotal,
          offlineOrder.shipping_cost,
          total,
          offlineOrder.courier_name,
          offlineOrder.payment_method
        ),
        { context: 'Mengirim notifikasi pesanan ke customer' }
      );

      setSuccessMsg('✅ Order offline berhasil dibuat dan notifikasi dikirim');
      setShowOfflineOrderForm(false);
      resetOfflineOrderForm();
      await loadInitialData();
    } catch (err) {
      const errorMsg = handleError(err);
      setErrorMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetOfflineOrderForm = () => {
    setOfflineOrder({
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      items: [{ product_id: '', quantity: 1, price: 0, varian: '', satuan: '100gr' }],
      shipping_cost: 0,
      courier_name: 'J&T',
      payment_method: 'transfer',
      notes: ''
    });
  };

  // ======================
  // AFFILIATOR: WITHDRAWAL
  // ======================
  const handleRequestWithdrawal = async () => {
    if (!withdrawalForm.nominal || !withdrawalForm.bank_name || !withdrawalForm.account_name || !withdrawalForm.account_number) {
      setErrorMsg('Semua field harus diisi');
      return;
    }

    const nominal = parseInt(withdrawalForm.nominal);
    const validationResult = await validateWithdrawalRequest(user.id, nominal);

    if (!validationResult.valid) {
      setErrorMsg(validationResult.message);
      return;
    }

    try {
      setLoading(true);
      const result = await safeApiCall(
        () => createWithdrawal(
          user.id,
          nominal,
          {
            bank_name: withdrawalForm.bank_name,
            bank_account: withdrawalForm.account_number,
            account_holder: withdrawalForm.account_name
          }
        ),
        { context: 'Membuat permintaan penarikan' }
      );

      if (result.success) {
        setSuccessMsg('✅ Permintaan penarikan berhasil. Tunggu persetujuan admin.');
        setShowWithdrawalForm(false);
        setWithdrawalForm({ nominal: '', bank_name: '', account_name: '', account_number: '' });
        loadInitialData();
      } else {
        const errorMsg = handleError(new Error(result.error));
        setErrorMsg(errorMsg);
      }
    } catch (err) {
      const errorMsg = handleError(err);
      setErrorMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // RENDER: ADMIN ORDERS TAB
  // ======================
  const renderAdminOrders = () => {
    // Pisahkan order berdasarkan status
    const pendingOrders = orders.filter(o => o.status === 'WAITING_CONFIRMATION');
    const processedOrders = orders.filter(o => o.status !== 'WAITING_CONFIRMATION' && o.status !== 'delivered');
    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    const OrderCard = ({ order }) => (
      <div
        key={order.id}
        className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-2"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-white">{order.order_number}</p>
            <p className="text-sm text-gray-400">
              {order.users?.nama || order.nama_pembeli} • {order.users?.nomor_wa || order.nomor_wa}
            </p>
            <p className="text-xs text-gray-500 mt-1">{order.alamat}</p>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
            order.status === 'WAITING_CONFIRMATION' ? 'bg-yellow-500/20 text-yellow-300' :
            order.status === 'WAITING_PAYMENT' ? 'bg-orange-500/20 text-orange-300' :
            order.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
            order.status === 'shipped' ? 'bg-purple-500/20 text-purple-300' :
            order.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
            'bg-gray-500/20 text-gray-300'
          }`}>
            {order.status.toUpperCase()}
          </span>
        </div>

        <div className="py-2 border-y border-white/10">
          {order.order_items?.map((item) => (
            <p key={item.id} className="text-sm text-gray-300">
              {item.products?.name || 'Produk'} × {item.qty} = {formatRupiah(item.qty * item.harga_satuan)}
              {item.varian && <span className="ml-2 text-xs bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded">{item.varian}</span>}
            </p>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm">
          <div>
            <p className="text-gray-400">Total:</p>
            <p className="font-bold text-[#D4AF37]">{formatRupiah(order.total_bayar)}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {order.status === 'WAITING_CONFIRMATION' && (
              <button
                onClick={() => handleOpenShippingModal(order)}
                className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-bold rounded hover:bg-orange-500/30 transition"
              >
                <DollarSign size={14} className="inline mr-1" /> Konfirmasi Ongkir
              </button>
            )}
            {order.status === 'WAITING_PAYMENT' && (
              <button
                onClick={() => {
                  setSelectedOrderForLabel(order);
                  setShowPrintLabel(true);
                }}
                className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded hover:bg-green-500/30 transition"
              >
                <Printer size={14} className="inline mr-1" /> Proses Packing & Kirim
              </button>
            )}
            {order.status === 'processing' && (
              <>
                <button
                  onClick={() => setEditingResi(order.id)}
                  className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded hover:bg-blue-500/30 transition"
                >
                  <Truck size={14} className="inline mr-1" /> Input Resi
                </button>
                <button
                  onClick={() => {
                    setSelectedOrderForResiNotif(order);
                    setResiNotifNumber('');
                    setErrorMsg('');
                    setShowResiNotificationModal(true);
                  }}
                  className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded hover:bg-cyan-500/30 transition"
                >
                  <Send size={14} className="inline mr-1" /> Kirim Notifikasi Resi
                </button>
              </>
            )}
            {order.status === 'shipped' && (
              <>
                <button
                  onClick={() => handleConfirmDelivery(order.id)}
                  className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded hover:bg-purple-500/30 transition"
                >
                  <Check size={14} className="inline mr-1" /> Delivered
                </button>
                <button
                  onClick={() => handleRePrintLabel(order)}
                  className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded hover:bg-cyan-500/30 transition"
                  title="Print ulang resi jika print pertama gagal"
                >
                  <Printer size={14} className="inline mr-1" /> Print Ulang Resi
                </button>
              </>
            )}
            <button
              onClick={() => handleDeleteOrder(order.id, order.order_number)}
              disabled={deletingOrderId === order.id}
              className="px-3 py-1 bg-red-500/20 text-red-300 text-xs font-bold rounded hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Hapus order (untuk mengantisipasi double order)"
            >
              {deletingOrderId === order.id ? 'Menghapus...' : <><Trash size={14} className="inline mr-1" /> Hapus</>}
            </button>
          </div>
        </div>

        {editingResi === order.id && (
          <div className="bg-black/40 border border-[#D4AF37]/30 rounded-lg p-3 space-y-2">
            <input
              type="text"
              placeholder="Nomor Resi"
              value={resiNumber}
              onChange={(e) => setResiNumber(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
            />
            <select
              value={couriername}
              onChange={(e) => setCourierName(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
            >
              <option value="JNE">JNE</option>
              <option value="TIKI">TIKI</option>
              <option value="POS">POS Indonesia</option>
              <option value="Gojek">Gojek</option>
              <option value="Grab">Grab</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => handleInputResi(order.id)}
                className="flex-1 px-3 py-2 bg-green-500 text-black font-bold rounded text-sm hover:bg-green-600 transition"
              >
                <Check size={14} className="inline mr-1" /> Kirim
              </button>
              <button
                onClick={() => setEditingResi(null)}
                className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 font-bold rounded text-sm hover:bg-red-500/30 transition"
              >
                <X size={14} className="inline mr-1" /> Batal
              </button>
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {/* Tombol Tambah Order Manual */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Manajemen Order</h3>
          <button
            onClick={() => setShowOfflineOrderForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
          >
            <Plus size={18} /> Tambah Order Manual
          </button>
        </div>

        {/* GRID 2 KOLOM: PENDING & PROCESSED */}
        <div className="grid grid-cols-2 gap-6">
          {/* KOLOM 1: SECTION PENDING ORDERS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-yellow-500/50">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <h4 className="text-base font-bold text-yellow-300">
                Order Menunggu Konfirmasi Ongkir ({pendingOrders.length})
              </h4>
            </div>
            {pendingOrders.length === 0 ? (
              <div className="text-center py-6 bg-black/20 rounded-lg border border-yellow-500/20">
                <p className="text-gray-400 text-sm">Tidak ada order yang menunggu konfirmasi ongkir</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {pendingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>

          {/* KOLOM 2: SECTION PROCESSED ORDERS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-blue-500/50">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h4 className="text-base font-bold text-blue-300">
                Order Dalam Proses ({processedOrders.length})
              </h4>
            </div>
            {processedOrders.length === 0 ? (
              <div className="text-center py-6 bg-black/20 rounded-lg border border-blue-500/20">
                <p className="text-gray-400 text-sm">Tidak ada order dalam proses</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {processedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>

          {/* KOLOM 3: SECTION DELIVERED ORDERS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-green-500/50">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h4 className="text-base font-bold text-green-300">
                Order Terkirim ({deliveredOrders.length})
              </h4>
            </div>
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-6 bg-black/20 rounded-lg border border-green-500/20">
                <p className="text-gray-400 text-sm">Tidak ada order yang terkirim</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {deliveredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ======================
  // RENDER: MODAL TAMBAH CUSTOMER BARU
  // ======================
  if (showAddCustomerModal && isAdmin) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Tambah Customer Baru</h2>
            <button
              onClick={() => {
                setShowAddCustomerModal(false);
                setNewCustomerForm({ nama: '', nomor_wa: '', alamat: '' });
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Nama</label>
            <input
              type="text"
              value={newCustomerForm.nama}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, nama: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="Nama customer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Nomor WhatsApp</label>
            <input
              type="tel"
              value={newCustomerForm.nomor_wa}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, nomor_wa: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="628xxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Alamat</label>
            <textarea
              value={newCustomerForm.alamat}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, alamat: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-16"
              placeholder="Alamat (opsional)"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleAddNewCustomer}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Customer'}
            </button>
            <button
              onClick={() => {
                setShowAddCustomerModal(false);
                setNewCustomerForm({ nama: '', nomor_wa: '', alamat: '' });
              }}
              className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================
  // RENDER: OFFLINE ORDER MODAL
  // ======================
  if (showOfflineOrderForm && isAdmin) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Tambah Order Manual</h2>
            <button
              onClick={() => setShowOfflineOrderForm(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[#D4AF37] font-bold text-sm">Nama Customer</label>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="text-[#D4AF37] hover:text-[#F4D03F] text-xs flex items-center gap-1"
              >
                <Plus size={14} /> Tambah Customer Baru
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={offlineOrder.customer_name}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                onFocus={() => offlineOrder.customer_name && setShowCustomerSearchDropdown(true)}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="Ketik nama atau nomor WA untuk mencari..."
              />
              {showCustomerSearchDropdown && customerSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-black/90 border border-[#D4AF37]/50 rounded-lg z-50 max-h-40 overflow-y-auto">
                  {customerSearchResults.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full px-3 py-2 text-left hover:bg-[#D4AF37]/20 text-white text-sm border-b border-white/10 last:border-0"
                    >
                      <p className="font-bold">{customer.nama}</p>
                      <p className="text-xs text-gray-400">{customer.nomor_wa}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Nomor WhatsApp</label>
            <div className="relative">
              <input
                type="tel"
                value={offlineOrder.customer_phone}
                onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                onFocus={() => offlineOrder.customer_phone && setShowCustomerSearchDropdown(true)}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="628xxxxxxxxx"
              />
              {showCustomerSearchDropdown && customerSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-black/90 border border-[#D4AF37]/50 rounded-lg z-50 max-h-40 overflow-y-auto">
                  {customerSearchResults.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full px-3 py-2 text-left hover:bg-[#D4AF37]/20 text-white text-sm border-b border-white/10 last:border-0"
                    >
                      <p className="font-bold">{customer.nama}</p>
                      <p className="text-xs text-gray-400">{customer.nomor_wa}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Alamat Lengkap</label>
            <textarea
              value={offlineOrder.customer_address}
              onChange={(e) => setOfflineOrder({ ...offlineOrder, customer_address: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-20"
              placeholder="Alamat detail"
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[#D4AF37] font-bold text-sm">Produk</label>
              <button
                onClick={handleAddOfflineItem}
                className="text-[#D4AF37] hover:text-[#F4D03F] flex items-center gap-1"
              >
                <Plus size={16} /> Tambah Item
              </button>
            </div>
            {offlineOrder.items.map((item, idx) => {
              const selectedProduct = products.find(p => p.id === item.product_id);
              const isPacketComplete = selectedProduct?.name?.toLowerCase().includes('paket komplit');
              
              const VARIANTS = ['GGSA', 'INL', 'RHS', 'JRM', 'BB', 'MLB', 'DJS', 'SMP', 'PLN', 'APLN', 'KPLN'];
              
              return (
              <div key={idx} className="space-y-2 p-3 bg-black/20 rounded-lg border border-white/10">
                {/* Row 1: Product Name Selector + Satuan + Qty + Delete */}
                <div className="flex gap-2 items-start">
                  <select
                    value={item.product_id}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      const newItems = [...offlineOrder.items];
                      newItems[idx] = { 
                        ...item, 
                        product_id: e.target.value, 
                        price: prod?.price || 0, 
                        varian: '',
                        satuan: '100gr'
                      };
                      setOfflineOrder({ ...offlineOrder, items: newItems });
                    }}
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm"
                  >
                    <option value="">--Pilih Produk--</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>

                  {/* Satuan Selector - untuk semua produk */}
                  {item.product_id && (
                    <select
                      value={item.satuan}
                      onChange={(e) => {
                        const newItems = [...offlineOrder.items];
                        newItems[idx].satuan = e.target.value;
                        // Jika pilih 100gr, auto-fill dari database
                        if (e.target.value === '100gr') {
                          newItems[idx].price = selectedProduct?.price || 0;
                        }
                        setOfflineOrder({ ...offlineOrder, items: newItems });
                      }}
                      className="px-3 py-2 bg-black/40 border border-[#D4AF37]/50 rounded-lg text-white text-sm"
                    >
                      <option value="100gr">100gr</option>
                      <option value="Kg">Kg</option>
                    </select>
                  )}

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...offlineOrder.items];
                      newItems[idx].quantity = parseInt(e.target.value) || 1;
                      setOfflineOrder({ ...offlineOrder, items: newItems });
                    }}
                    className="w-16 px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm text-center"
                    placeholder="Qty"
                  />

                  <button
                    onClick={() => handleRemoveOfflineItem(idx)}
                    className="p-2 text-red-400 hover:text-red-500"
                  >
                    <Trash size={16} />
                  </button>
                </div>

                {/* Row 2: Harga + Subtotal - Always editable */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[#D4AF37] font-bold text-xs">Harga {item.satuan === 'Kg' ? '(Kg)' : ''}</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-gray-400 text-xs">Rp</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...offlineOrder.items];
                          newItems[idx].price = parseInt(e.target.value) || 0;
                          setOfflineOrder({ ...offlineOrder, items: newItems });
                        }}
                        className="w-full pl-6 pr-3 py-2 bg-black/40 border border-[#D4AF37]/50 rounded-lg text-white text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#D4AF37] font-bold text-xs">Subtotal</label>
                    <div className="px-3 py-2 bg-black/60 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] text-sm font-bold">
                      {formatRupiah(item.quantity * item.price)}
                    </div>
                  </div>
                </div>

                {/* Row 3: Varian (hanya untuk PAKET KOMPLIT) */}
                {isPacketComplete && (
                  <div className="space-y-1">
                    <label className="text-[#D4AF37] font-bold text-xs">Varian Paket Komplit</label>
                    <select
                      value={item.varian}
                      onChange={(e) => {
                        const newItems = [...offlineOrder.items];
                        newItems[idx].varian = e.target.value;
                        setOfflineOrder({ ...offlineOrder, items: newItems });
                      }}
                      className="w-full px-3 py-2 bg-black/40 border border-[#D4AF37]/50 rounded-lg text-white text-sm"
                    >
                      <option value="">--Pilih Varian--</option>
                      {VARIANTS.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
            })}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Metode Bayar</label>
            <select
              value={offlineOrder.payment_method}
              onChange={(e) => setOfflineOrder({ ...offlineOrder, payment_method: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
            >
              <option value="transfer">Transfer Bank</option>
              <option value="cod">COD</option>
            </select>
          </div>

          {/* Expedisi & Ongkir */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">Expedisi</label>
              <select
                value={offlineOrder.courier_name}
                onChange={(e) => setOfflineOrder({ ...offlineOrder, courier_name: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm"
              >
                <option value="J&T">J&T</option>
                <option value="WAHANA">WAHANA</option>
                <option value="ID Express">ID Express</option>
                <option value="Indah Cargo">Indah Cargo</option>
                <option value="JNE">JNE</option>
                <option value="Tiki">Tiki</option>
                <option value="Pos Indonesia">Pos Indonesia</option>
                <option value="Grab Express">Grab Express</option>
                <option value="GoSend">GoSend</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">Ongkir</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                <input
                  type="number"
                  value={offlineOrder.shipping_cost}
                  onChange={(e) => setOfflineOrder({ ...offlineOrder, shipping_cost: parseInt(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Catatan Admin</label>
            <textarea
              value={offlineOrder.notes}
              onChange={(e) => setOfflineOrder({ ...offlineOrder, notes: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-16"
              placeholder="Catatan khusus untuk order ini"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmitOfflineOrder}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
            >
              {loading ? 'Membuat...' : 'Buat Order'}
            </button>
            <button
              onClick={() => setShowOfflineOrderForm(false)}
              className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================
  // RENDER: PRINT LABEL MODAL (A5 Format - Split Label & Packing List)
  // ======================
  if (showPrintLabel && selectedOrderForLabel) {
    const order = selectedOrderForLabel;
    const courierName = order.resi?.split('-')[0] || 'PENDING';
    const resiNumber = order.resi || 'N/A';
    const itemCount = order.order_items?.length || 0;
    const isMultiColumn = itemCount > 4;
    
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
        <div className="bg-white w-full max-w-3xl max-h-[95vh] overflow-y-auto print-container">
          {/* ===== BAGIAN ATAS: LABEL TEMPEL ===== */}
          <div className="relative border-b-4 border-black p-2 text-black label-section">
            {/* Header Ekspedisi - Full Width */}
            <div className="mb-0 pb-0 border-b-2 border-black">
              <p className="text-xs text-gray-600 mb-0 font-bold">EKSPEDISI</p>
              <p className="text-4xl font-black leading-none">{courierName}</p>
            </div>

            {/* Nomor Resi - Full Width & Besar */}
            <div className="mb-2 pb-1 border-b-3 border-black">
              <p className="text-xs text-gray-600 mb-0 font-bold">NO. RESI / KODE BOOKING</p>
              <p className="font-mono font-black text-2xl break-words leading-tight">
                {resiNumber}
              </p>
            </div>

            {/* Data Penerima (70%) & Invoice (30%) */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '70% 30%' }}>
              {/* Sisi Kiri: Data Penerima */}
              <div className="border-2 border-black p-1.5">
                <h3 className="font-bold text-xs mb-1 pb-0.5 border-b-2 border-black">PENERIMA</h3>
                <div className="space-y-0.5 text-xs leading-tight">
                  <div>
                    <p className="font-bold text-sm">{order.users?.nama || order.nama_pembeli || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700">Telp:</p>
                    <p className="font-mono text-xs">{order.users?.nomor_wa || order.nomor_wa || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700">Alamat:</p>
                    <p className="text-xs font-semibold whitespace-pre-wrap leading-tight line-clamp-3">
                      {order.alamat || 'Alamat tidak tersedia'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sisi Kanan: Invoice & Tanggal */}
              <div className="flex flex-col justify-between gap-0.5">
                <div className="border-2 border-black p-0.5 bg-gray-100">
                  <p className="text-xs text-gray-700 font-bold mb-0">NO. INVOICE</p>
                  <p className="text-sm font-bold font-mono break-words leading-tight">{order.order_number}</p>
                </div>
                <div className="border-2 border-black p-0.5 bg-gray-100">
                  <p className="text-xs text-gray-700 font-bold mb-0">TGL. PESANAN</p>
                  <p className="text-xs font-bold leading-tight">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ===== GARIS PUTUS-PUTUS (Untuk Dipotong) ===== */}
          <div className="flex items-center px-2 py-0.5 bg-gray-100">
            <div className="flex-1 border-t-2 border-dashed border-black"></div>
            <p className="px-1 text-xs font-bold text-gray-600">POTONG</p>
            <div className="flex-1 border-t-2 border-dashed border-black"></div>
          </div>

          {/* ===== BAGIAN BAWAH: PACKING LIST ===== */}
          <div className="p-1 text-black packing-section">
            {/* Header */}
            <div className="mb-0 pb-0 border-b-2 border-black">
              <h2 className="text-base font-black leading-tight">DETAIL PACKING</h2>
              <p className="text-xs text-gray-700 mt-0">Invoice: <span className="font-bold font-mono text-xs">{order.order_number}</span></p>
            </div>

            {/* Items List - Flexible Sizing berdasarkan jumlah item */}
            <div className={`${isMultiColumn ? 'grid grid-cols-2 gap-1' : 'block space-y-1'}`}>
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item, idx) => {
                  // Flexible font sizing - ADAPTIVE berdasarkan jumlah item
                  let containerPadding = 'p-1';
                  let nameSize = 'text-sm';
                  let skuSize = 'text-xs';
                  let qtyLabelSize = 'text-xs';
                  let qtySize = 'text-lg';
                  
                  if (itemCount <= 3) {
                    // Sedikit item: besar
                    nameSize = 'text-lg';
                    qtySize = 'text-2xl';
                    containerPadding = 'p-1.5';
                  } else if (itemCount <= 5) {
                    // Sedang: normal
                    nameSize = 'text-base';
                    qtySize = 'text-lg';
                    containerPadding = 'p-1';
                  } else if (itemCount <= 8) {
                    // Banyak: yang lebih kecil
                    nameSize = 'text-sm';
                    qtySize = 'text-base';
                    containerPadding = 'p-1';
                  } else if (itemCount <= 12) {
                    // Sangat banyak: lebih kecil lagi
                    nameSize = 'text-xs';
                    skuSize = 'text-xs';
                    qtySize = 'text-sm';
                    containerPadding = 'p-0.5';
                  } else {
                    // Ekstrim banyak: minimal tapi tetap terbaca
                    nameSize = 'text-xs';
                    skuSize = 'text-xs';
                    qtyLabelSize = 'text-xs';
                    qtySize = 'text-xs';
                    containerPadding = 'p-0.5';
                  }
                  
                  return (
                    <div key={item.id || idx} className={`border border-gray-400 ${containerPadding}`}>
                      {/* Nama Produk */}
                      <p className={`font-bold text-black mb-0 ${nameSize}`}>
                        {item.products?.name || 'Produk Tidak Ditemukan'}
                      </p>

                      {/* Kode Produk */}
                      <p className={`${skuSize} text-gray-700 mb-0`}>
                        SKU: <span className="font-mono font-semibold">{item.products?.id?.substring(0, 8) || 'N/A'}</span>
                      </p>

                      {/* Quantity */}
                      <div className="border-t border-gray-300 pt-0.5 mt-0.5">
                        <p className={`${qtyLabelSize} text-gray-700 leading-none`}>Qty</p>
                        <p className={`font-bold ${qtySize} leading-tight`}>{item.qty}x</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-600">Tidak ada item untuk ditampilkan</p>
              )}
            </div>

            {/* Total & Catatan */}
            <div className="mt-0.5 pt-0.5 border-t-2 border-black space-y-0">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="bg-gray-100 p-0.5 border border-black">
                  <p className="text-xs text-gray-700">TOTAL ITEM</p>
                  <p className={`font-bold ${
                    itemCount <= 3 ? 'text-2xl' :
                    itemCount <= 5 ? 'text-lg' :
                    itemCount <= 8 ? 'text-base' :
                    itemCount <= 12 ? 'text-sm' :
                    'text-xs'
                  }`}>{itemCount}x</p>
                </div>
                <div className="bg-gray-100 p-0.5 border border-black">
                  <p className="text-xs text-gray-700">TOTAL QTY</p>
                  <p className={`font-bold ${
                    itemCount <= 3 ? 'text-2xl' :
                    itemCount <= 5 ? 'text-lg' :
                    itemCount <= 8 ? 'text-base' :
                    itemCount <= 12 ? 'text-sm' :
                    'text-xs'
                  }`}>{order.order_items?.reduce((sum, item) => sum + item.qty, 0) || 0}</p>
                </div>
              </div>

              {/* Catatan */}
              {order.catatan && (
                <div className="bg-yellow-100 border-2 border-orange-400 p-1">
                  <p className="text-xs font-bold mb-0">⚠️ CATATAN:</p>
                  <p className="text-xs leading-tight">{order.catatan}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-gray-600 pt-0.5">
                <p className="leading-none">Dicetak: {new Date().toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>

          {/* ===== PRINT CONTROLS ===== */}
          <div className="bg-gray-200 border-t-2 border-gray-400 p-4 flex gap-3 sticky bottom-0 no-print">
            <button
              onClick={() => handlePrintLabel(selectedOrderForLabel.id)}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Cetak Label & Update Status
            </button>
            <button
              onClick={() => {
                setShowPrintLabel(false);
                setSelectedOrderForLabel(null);
              }}
              className="flex-1 px-4 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================
  if (showShippingModal && selectedOrder) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-lg p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#D4AF37]">Konfirmasi Ongkir</h2>
            <button
              onClick={() => {
                setShowShippingModal(false);
                setBillOrder('');
              }}
              className="p-2 hover:bg-white/10 rounded text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* Order Details */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-2">
            <p className="font-bold text-white">{selectedOrder.order_number}</p>
            <p className="text-sm text-gray-400">{selectedOrder.users?.nama || selectedOrder.nama_pembeli} • {selectedOrder.users?.nomor_wa || selectedOrder.nomor_wa}</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              {selectedOrder.order_items?.map((item) => (
                <p key={item.id} className="text-sm text-gray-300">
                  {item.products?.name} × {item.qty} = {formatRupiah(item.qty * item.harga_satuan)}
                </p>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm text-gray-400">Subtotal:</p>
              <p className="text-lg font-bold text-[#D4AF37]">{formatRupiah(selectedOrder.total_produk)}</p>
            </div>
          </div>

          {/* Shipping Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-[#D4AF37] mb-2">Ekspedisi</label>
              <select
                value={couriername}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
              >
                <option value="J&T">J&T</option>
                <option value="WAHANA">WAHANA</option>
                <option value="ID Express">ID Express</option>
                <option value="Indah Cargo">Indah Cargo</option>
                <option value="JNE">JNE</option>
                <option value="Tiki">Tiki</option>
                <option value="Pos Indonesia">Pos Indonesia</option>
                <option value="Grab Express">Grab Express</option>
                <option value="GoSend">GoSend</option>
              </select>
            </div>

            {/* Bill Order Field - Only show for certain couriers */}
            {couriersWithBill.includes(couriername) && (
              <div>
                <label className="block text-sm font-bold text-[#D4AF37] mb-2">
                  Nomor Tiket/Bill Order <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={`Contoh: JNT-2026-001 atau nomor tiket ${couriername}`}
                  value={billOrder}
                  onChange={(e) => setBillOrder(e.target.value)}
                  className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Nomor tiket/bill order dari sistem {couriername}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#D4AF37] mb-2">Nominal Ongkir</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-black/40 border border-white/20 border-r-0 rounded-l text-gray-400">Rp</span>
                <input
                  type="number"
                  placeholder="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-4 py-2 bg-black/40 border border-white/20 border-l-0 rounded-r text-white text-sm"
                />
              </div>
            </div>

            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-3">
              <p className="text-xs text-gray-300 mb-2">Total Pembayaran:</p>
              <p className="text-2xl font-bold text-[#F4D03F]">
                {formatRupiah((selectedOrder.total_produk || 0) + (parseInt(shippingCost) || 0))}
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirmShipping}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : '✓ Simpan & Buat Invoice'}
            </button>
            <button
              onClick={() => {
                setShowShippingModal(false);
                setBillOrder('');
              }}
              className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================
  // RESI NOTIFICATION MODAL
  // ======================
  if (showResiNotificationModal && selectedOrderForResiNotif) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-lg p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#D4AF37]">Kirim Notifikasi Resi</h2>
            <button
              onClick={() => {
                setShowResiNotificationModal(false);
                setResiNotifNumber('');
                setErrorMsg('');
              }}
              className="p-2 hover:bg-white/10 rounded text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* Order Details */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-2">
            <p className="font-bold text-white">{selectedOrderForResiNotif.order_number}</p>
            <p className="text-sm text-gray-400">
              {selectedOrderForResiNotif.users?.nama || selectedOrderForResiNotif.nama_pembeli} • 
              {selectedOrderForResiNotif.users?.nomor_wa || selectedOrderForResiNotif.nomor_wa}
            </p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm font-bold text-[#D4AF37]">Kurir: {selectedOrderForResiNotif.courier_name}</p>
            </div>
          </div>

          {/* Resi Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-[#D4AF37] mb-2">Nomor Resi <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="Contoh: 1234567890AB"
                value={resiNotifNumber}
                onChange={(e) => setResiNotifNumber(e.target.value)}
                autoFocus
                className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Masukkan nomor resi dari sistem kurir
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSendResiNotification}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={18} /> {loading ? 'Mengirim...' : 'Kirim Notifikasi'}
            </button>
            <button
              onClick={() => {
                setShowResiNotificationModal(false);
                setResiNotifNumber('');
                setErrorMsg('');
              }}
              className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================
  // RENDER: AFFILIATOR DASHBOARD
  // ======================
  if (isAffiliator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#042f2e] to-[#022c22] text-white p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#D4AF37]">Dashboard Mitra</h1>
              <p className="text-gray-400">Halo {user.nama}!</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Saldo</p>
                <p className="text-2xl font-bold text-[#D4AF37]">{formatRupiah(summary.currentBalance)}</p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Penghasilan</p>
                <p className="text-2xl font-bold text-green-400">{formatRupiah(summary.totalEarnings)}</p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Pelanggan</p>
                <p className="text-2xl font-bold text-blue-400">{summary.customerCount}</p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Pesanan Terjual</p>
                <p className="text-2xl font-bold text-purple-400">{summary.orderCount}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
            {['overview', 'products', 'customers', 'withdrawals'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-bold transition whitespace-nowrap ${
                  activeTab === tab 
                    ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'products' ? 'Produk' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-black/30 border border-[#D4AF37]/30 rounded-lg p-4">
                <h3 className="font-bold text-[#D4AF37] mb-3">📌 Link Referral Anda</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}?ref=${user.id}`}
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?ref=${user.id}`);
                      setSuccessMsg('Link tersalin!');
                      setTimeout(() => setSuccessMsg(''), 2000);
                    }}
                    className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded hover:bg-[#F4D03F] transition"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#D4AF37] mb-4">🛍️ Produk untuk Affiliasi TikTokShop</h3>
                {selectedProducts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{selectedProducts.length} dipilih</span>
                    <button
                      onClick={handleBulkEditOpen}
                      className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition flex items-center gap-2"
                    >
                      <Edit size={16} /> Edit Batch ({selectedProducts.length})
                    </button>
                  </div>
                )}
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
                  <p className="text-gray-400">Belum ada produk tersedia</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {products
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map(p => (
                      <div 
                        key={p.id} 
                        className={`bg-black/30 border rounded-lg p-4 transition ${
                          selectedProducts.includes(p.id)
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-white/10 hover:border-[#D4AF37]/30'
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Checkbox */}
                          <div className="flex items-start pt-1">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(p.id)}
                              onChange={() => toggleProductSelection(p.id)}
                              className="w-5 h-5 cursor-pointer"
                            />
                          </div>

                          {/* Product Image */}
                          {p.image_url && (
                            <div className="w-24 h-24 flex-shrink-0">
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                            </div>
                          )}
                          
                          {/* Product Info */}
                          <div className="flex-1">
                            <p className="font-bold text-white text-lg mb-1">{p.name}</p>
                            <p className="text-[#D4AF37] font-bold text-lg mb-2">{formatRupiah(p.price)}</p>
                            <p className="text-xs text-gray-400">Kode: {p.product_code || 'N/A'}</p>
                            {p.afiliasi_tiktok && (
                              <p className="text-xs text-green-300 mt-1">
                                🔗 TikTokShop Link: 
                                <a href={p.afiliasi_tiktok} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline ml-1">
                                  Buka
                                </a>
                              </p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 h-fit">
                            <button
                              onClick={() => handleEditProductLink(p)}
                              className="px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/40 transition"
                            >
                              <Edit size={14} className="inline mr-1" /> Edit Link
                            </button>
                            <button
                              onClick={() => handleShareProduct(p)}
                              className="px-3 py-2 bg-green-500/20 text-green-300 text-xs font-bold rounded hover:bg-green-500/40 transition"
                            >
                              <Share2 size={14} className="inline mr-1" /> Share
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {/* Edit TikTok Account Info */}
              <div className="mt-6 bg-black/30 border border-[#D4AF37]/30 rounded-lg p-4">
                <h4 className="font-bold text-[#D4AF37] mb-3">📱 Manajemen Akun TikTok</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Perbarui akun TikTok Anda untuk hasil affiliate yang lebih baik.
                </p>
                <button
                  onClick={() => handleEditAffiliator(user)}
                  className="w-full px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
                >
                  Edit Profil Mitra
                </button>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#D4AF37]">Pelanggan Terikat (90 hari)</h3>
              {bindings.length === 0 ? (
                <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
                  <p className="text-gray-400">Tidak ada pelanggan terikat</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {bindings.map(b => (
                    <div key={b.id} className="bg-black/30 border border-white/10 rounded p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{b.users?.nama}</p>
                        <p className="text-sm text-gray-400">{b.users?.nomor_wa}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-[#D4AF37]">Berakhir: {new Date(b.end_date).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <button
                onClick={() => setShowWithdrawalForm(true)}
                className="w-full px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Buat Permintaan Penarikan
              </button>

              {withdrawals.length === 0 ? (
                <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
                  <p className="text-gray-400">Belum ada riwayat penarikan</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {withdrawals.map(w => (
                    <div key={w.id} className="bg-black/30 border border-white/10 rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-[#D4AF37]">{formatRupiah(w.nominal)}</p>
                          <p className="text-sm text-gray-400">{w.bank_name} - {w.account_name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          w.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {w.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(w.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Withdrawal Modal */}
          {showWithdrawalForm && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
              <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-2xl font-bold text-white">Buat Permintaan Penarikan</h2>

                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={withdrawalForm.nominal}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, nominal: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="Minimal Rp50.000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Nama Bank</label>
                  <input
                    type="text"
                    value={withdrawalForm.bank_name}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, bank_name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="Contoh: BRI"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Atas Nama Rekening</label>
                  <input
                    type="text"
                    value={withdrawalForm.account_name}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="Nama di rekening"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Nomor Rekening</label>
                  <input
                    type="text"
                    value={withdrawalForm.account_number}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_number: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="1234567890"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRequestWithdrawal}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] disabled:opacity-50"
                  >
                    {loading ? 'Mengirim...' : 'Kirim Permintaan'}
                  </button>
                  <button
                    onClick={() => setShowWithdrawalForm(false)}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Link Modal */}
          {showEditProductLinkModal && editingProductForLink && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
              <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-2xl font-bold text-white">Edit Link TikTok Affiliate</h2>
                <p className="text-sm text-gray-400">{editingProductForLink.name}</p>

                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Link TikTok Shop Affiliate <span className="text-red-400">*</span></label>
                  <input
                    type="url"
                    placeholder="https://vt.tiktok.com/..."
                    value={productLinkForm.tiktok_shop}
                    onChange={(e) => setProductLinkForm({ ...productLinkForm, tiktok_shop: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-[#D4AF37]"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Paste link TikTok Shop affiliate Anda di sini agar komisi tetap masuk ke akun Anda.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
                    {errorMsg}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProductLink}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : '💾 Simpan Link'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditProductLinkModal(false);
                      setProductLinkForm({ tiktok_shop: '' });
                      setErrorMsg('');
                    }}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Product Modal */}
          {showShareProductModal && sharingProduct && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
              <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-2xl font-bold text-white">🔗 Share Produk</h2>
                <p className="text-sm text-gray-400">{sharingProduct.name}</p>

                {/* Affiliate Link */}
                <div className="space-y-2 bg-black/30 border border-white/10 rounded-lg p-4">
                  <label className="text-[#D4AF37] font-bold text-sm">Link Affiliasi Anda:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generateAffiliatorLink(sharingProduct)}
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-xs"
                    />
                    <button
                      onClick={() => copyLinkToClipboard(sharingProduct)}
                      className="px-3 py-2 bg-[#D4AF37] text-black font-bold rounded hover:bg-[#F4D03F] transition"
                      title="Salin ke clipboard"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* Share Methods */}
                <div className="space-y-2 pt-2">
                  <p className="text-sm text-gray-400 font-bold">Bagikan ke:</p>
                  <button
                    onClick={() => shareToWhatsApp(sharingProduct)}
                    className="w-full px-4 py-3 bg-green-500/20 text-green-300 font-bold rounded-lg hover:bg-green-500/30 transition flex items-center justify-center gap-2"
                  >
                    💬 WhatsApp
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-xs">
                  <p>💡 <strong>Tips:</strong> Setiap orang yang klik link ini akan masuk sebagai customer Anda, dan Anda akan mendapat komisi dari pesanan mereka!</p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowShareProductModal(false);
                    setSharingProduct(null);
                  }}
                  className="w-full px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* Bulk Edit TikTok Links Modal */}
          {showBulkEditModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
              <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl p-6 space-y-4 my-8">
                <h2 className="text-2xl font-bold text-white">📝 Edit Batch - Link TikTok Affiliate</h2>
                <p className="text-sm text-gray-400">Masukkan link TikTok Shop Affiliate untuk {selectedProducts.length} produk yang dipilih</p>

                {/* Apply to All Section */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                  <label className="text-green-300 font-bold text-sm">🚀 Terapkan Link yang Sama ke Semua Produk</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://vt.tiktok.com/..."
                      value={bulkLinkInput}
                      onChange={(e) => setBulkLinkInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-green-500"
                    />
                    <button
                      onClick={applyLinkToAll}
                      disabled={!bulkLinkInput.trim()}
                      className="px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Product List with Link Inputs */}
                <div>
                  <label className="text-[#D4AF37] font-bold text-sm mb-3 block">⬇️ Edit Manual per Produk (opsional)</label>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedProducts.map((productId) => {
                      const product = products.find(p => p.id === productId);
                      if (!product) return null;

                      return (
                        <div key={productId} className="bg-black/30 border border-white/10 rounded-lg p-3">
                          <p className="text-white font-bold text-sm mb-2">{product.name}</p>
                          <input
                            type="url"
                            placeholder="https://vt.tiktok.com/..."
                            value={bulkEditForm[productId] || ''}
                            onChange={(e) => setBulkEditForm({
                              ...bulkEditForm,
                              [productId]: e.target.value
                            })}
                            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-[#D4AF37]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleBulkEditSave}
                    className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
                  >
                    ✅ Simpan {selectedProducts.length} Link
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkEditModal(false);
                      setBulkEditForm({});
                      setBulkLinkInput('');
                    }}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
                  >
                    Batal
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-xs">
                  <p>💡 <strong>Tips:</strong> Gunakan "Apply" untuk mengisi semua otomatis, atau edit manual untuk produk tertentu</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======================
  // RENDER: ADMIN DASHBOARD
  // ======================
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#042f2e] to-[#022c22] text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#D4AF37]">Admin Dashboard</h1>
            <p className="text-gray-400">Halo {user.nama}!</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-2 items-center">
            <CheckCircle2 size={20} className="text-green-400" />
            <p className="text-green-300">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-center">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-red-300">{errorMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['orders', 'products', 'affiliators'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold transition ${
                activeTab === tab 
                  ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && renderAdminOrders()}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Daftar Produk ({products.length})</h3>
              {selectedAdminProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{selectedAdminProducts.length} dipilih</span>
                  <button
                    onClick={handleAdminBulkEditOpen}
                    className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition flex items-center gap-2"
                  >
                    <Edit size={16} /> Edit Batch ({selectedAdminProducts.length})
                  </button>
                </div>
              )}
            </div>
            
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : products.length === 0 ? (
              <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
                <p className="text-gray-400">Belum ada produk</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {products
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map(p => {
                    const hasVariants = p.name && p.name.toLowerCase().includes('paket komplit');
                    return (
                      <div 
                        key={p.id} 
                        className={`bg-black/30 border rounded-lg p-4 transition flex gap-4 ${
                          selectedAdminProducts.includes(p.id)
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-white/10 hover:border-[#D4AF37]/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="flex items-start pt-1">
                          <input
                            type="checkbox"
                            checked={selectedAdminProducts.includes(p.id)}
                            onChange={() => toggleAdminProductSelection(p.id)}
                            className="w-5 h-5 cursor-pointer"
                          />
                        </div>

                        {/* Left: Product Image (1:1 Square) */}
                        {p.image_url && (
                          <div className="w-32 h-32 flex-shrink-0">
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                          </div>
                        )}
                        
                        {/* Right: Product Info */}
                        <div className="flex-1 space-y-2 flex flex-col justify-between">
                          <div className="space-y-2">
                            <p className="font-bold text-white line-clamp-2">{p.name}</p>
                            
                            {/* Harga & Kode (1 baris) */}
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <p className="text-[#D4AF37] font-bold">{formatRupiah(p.price)}</p>
                              <p className="text-gray-400">{p.product_code || 'N/A'}</p>
                            </div>
                            
                            {/* Komisi & Urutan (1 baris) */}
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-gray-400">{p.commission_rate}% komisi</p>
                              <div className="flex items-center gap-1">
                                <label className="text-xs text-[#D4AF37] font-bold">Pos:</label>
                                <span className="w-12 px-2 py-1 bg-black/40 border border-white/20 rounded text-white text-xs text-center font-bold">
                                  {p.sort_order || 0}
                                </span>
                                <button
                                  onClick={() => {
                                    setReorderingProduct(p);
                                    setReorderDestination(String(p.sort_order || 0));
                                    setShowReorderModal(true);
                                  }}
                                  className="px-2 py-1 bg-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/50 transition"
                                  title="Pindahkan ke posisi lain"
                                >
                                  ↕
                                </button>
                              </div>
                            </div>
                            
                            {/* Variants Badge */}
                            {hasVariants && (
                              <div className="pt-1">
                                <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded">
                                  + Varian Opsional
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditProduct(p)}
                            className="px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/40 transition w-full"
                          >
                            <Edit size={14} className="inline mr-1" /> Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Affiliators Tab */}
        {activeTab === 'affiliators' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Daftar Mitra ({affiliators.length})</h3>
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : (
              <div className="grid gap-4">
                {affiliators.map(a => (
                  <div key={a.id} className="bg-black/30 border border-white/10 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg">{a.nama}</p>
                        <p className="text-sm text-gray-400">{a.email}</p>
                        <p className="text-sm text-gray-400">{a.nomor_wa}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#D4AF37] font-bold text-lg">{formatRupiah(a.current_balance || 0)}</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          a.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {a.status === 'active' ? '✅ AKTIF' : '⏳ PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {a.status === 'pending' && (
                        <button
                          onClick={() => handleApproveAffiliator(a.id, a.nama)}
                          className="flex-1 px-3 py-2 bg-green-500/20 text-green-300 text-xs font-bold rounded hover:bg-green-500/40 transition"
                        >
                          <Check size={14} className="inline mr-1" /> Setujui
                        </button>
                      )}
                      <button
                        onClick={() => handleEditAffiliator(a)}
                        className="flex-1 px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/40 transition"
                      >
                        <Edit size={14} className="inline mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAffiliator(a.id, a.nama)}
                        className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 text-xs font-bold rounded hover:bg-red-500/40 transition"
                      >
                        <Trash size={14} className="inline mr-1" /> Hapus
                      </button>
                      <button
                        onClick={() => handleResendAffiliatorNotification(a)}
                        className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded hover:bg-blue-500/40 transition"
                        disabled={loading}
                      >
                        <Send size={14} className="inline mr-1" /> Kirim Ulang Notifikasi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: EDIT PRODUCT */}
        {showEditProductModal && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Edit Produk</h2>
                <button
                  onClick={() => setShowEditProductModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Nama Produk */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Nama Produk *</label>
                  <input
                    type="text"
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="Nama produk"
                  />
                </div>

                {/* Kode Produk */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Kode Produk</label>
                  <input
                    type="text"
                    value={editProductForm.product_code}
                    onChange={(e) => setEditProductForm({ ...editProductForm, product_code: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="Kode unik produk"
                  />
                </div>

                {/* Harga & Komisi (2 kolom) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">Harga (Rp)</label>
                    <input
                      type="number"
                      value={editProductForm.price}
                      onChange={(e) => setEditProductForm({ ...editProductForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">Komisi (%)</label>
                    <input
                      type="number"
                      value={editProductForm.commission_rate}
                      onChange={(e) => setEditProductForm({ ...editProductForm, commission_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="10"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* URL Foto */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">URL Foto Produk</label>
                  <input
                    type="url"
                    value={editProductForm.image_url}
                    onChange={(e) => setEditProductForm({ ...editProductForm, image_url: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="https://..."
                  />
                  {editProductForm.image_url && (
                    <img src={editProductForm.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg mt-2" />
                  )}
                </div>

                {/* Link TikTok Shop */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Link TikTok Shop</label>
                  <input
                    type="url"
                    value={editProductForm.default_link}
                    onChange={(e) => setEditProductForm({ ...editProductForm, default_link: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="https://vt.tokopedia.com/..."
                  />
                </div>

                {/* Deskripsi */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Deskripsi Produk</label>
                  <textarea
                    value={editProductForm.description}
                    onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-24"
                    placeholder="Deskripsi detail produk"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveProduct}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                  <button
                    onClick={() => setShowEditProductModal(false)}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: REORDER PRODUCT */}
        {showReorderModal && reorderingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#042f2e] to-[#022c22] border border-white/20 rounded-lg p-6 max-w-md w-full space-y-4">
              <h2 className="text-xl font-bold text-[#D4AF37]">Pindahkan Produk ke Posisi Baru</h2>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  <span className="font-bold text-white">{reorderingProduct.name}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Posisi saat ini: <span className="text-[#D4AF37] font-bold">{reorderingProduct.sort_order || 0}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-[#D4AF37] font-bold">Posisi Baru (1 - {products.length}):</label>
                <input
                  type="number"
                  min="1"
                  max={products.length}
                  value={reorderDestination}
                  onChange={(e) => setReorderDestination(e.target.value)}
                  className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-lg text-white font-bold text-lg"
                  placeholder="Masukkan posisi baru"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                <p className="font-bold mb-1">Apa yang akan terjadi:</p>
                <p>Produk ini akan dipindahkan ke posisi {reorderDestination || '?'}</p>
                <p>Produk lain akan otomatis bergeser agar tidak ada duplikat posisi.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const dest = parseInt(reorderDestination) || 0;
                    if (dest < 1 || dest > products.length) {
                      setErrorMsg(`Posisi harus antara 1 dan ${products.length}`);
                      return;
                    }
                    await handleReorderProduct(reorderingProduct.id, dest);
                    setShowReorderModal(false);
                    setReorderingProduct(null);
                    setReorderDestination('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Pindahkan'}
                </button>
                <button
                  onClick={() => {
                    setShowReorderModal(false);
                    setReorderingProduct(null);
                    setReorderDestination('');
                  }}
                  className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT AFFILIATOR */}
        {showEditAffiliatorModal && editingAffiliator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Edit Mitra</h2>
                <button
                  onClick={() => setShowEditAffiliatorModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Nama */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Nama *</label>
                  <input
                    type="text"
                    value={editAffiliatorForm.nama}
                    onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, nama: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="Nama lengkap"
                  />
                </div>

                {/* No HP & Email (2 cols) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">No HP</label>
                    <input
                      type="text"
                      value={editAffiliatorForm.nomor_wa}
                      onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, nomor_wa: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="628xxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">Email</label>
                    <input
                      type="email"
                      value={editAffiliatorForm.email}
                      onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Status</label>
                  <select
                    value={editAffiliatorForm.status}
                    onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Password Hash */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Password (biarkan kosong jika tidak diubah)</label>
                  <input
                    type="password"
                    value={editAffiliatorForm.password_hash}
                    onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, password_hash: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="Masukkan password baru"
                  />
                </div>

                {/* TikTok Accounts */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Akun TikTok (pisahkan dengan koma)</label>
                  <textarea
                    value={editAffiliatorForm.akun_tiktok}
                    onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, akun_tiktok: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-16"
                    placeholder="@akun1, @akun2, @akun3"
                  />
                </div>

                {/* Bank Details (2 cols) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">Nama Bank</label>
                    <input
                      type="text"
                      value={editAffiliatorForm.bank_name}
                      onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="BRI, BNI, Mandiri, etc"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">No Rekening</label>
                    <input
                      type="text"
                      value={editAffiliatorForm.account_number}
                      onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, account_number: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                {/* Saldo (Balance) */}
                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Saldo Saat Ini (Rp)</label>
                  <input
                    type="number"
                    value={editAffiliatorForm.current_balance}
                    onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, current_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                    placeholder="0"
                  />
                </div>

                {/* Total Commission & Total Withdrawn (2 cols) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">Total Komisi (Rp)</label>
                    <input
                      type="number"
                      value={editAffiliatorForm.total_commission}
                      onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, total_commission: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#D4AF37] font-bold text-sm">Total Ditarik (Rp)</label>
                    <input
                      type="number"
                      value={editAffiliatorForm.total_withdrawn}
                      onChange={(e) => setEditAffiliatorForm({ ...editAffiliatorForm, total_withdrawn: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveAffiliator}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                  <button
                    onClick={() => setShowEditAffiliatorModal(false)}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADMIN BULK EDIT TikTok LINKS */}
        {showAdminBulkEditModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl p-6 space-y-4 my-8">
              <h2 className="text-2xl font-bold text-white">📝 Edit Batch - Link TikTok Default</h2>
              <p className="text-sm text-gray-400">Edit link TikTok Shop default untuk {selectedAdminProducts.length} produk yang dipilih</p>

              {/* Apply to All Section */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                <label className="text-green-300 font-bold text-sm">🚀 Terapkan Link yang Sama ke Semua Produk</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://vt.tiktok.com/..."
                    value={adminBulkLinkInput}
                    onChange={(e) => setAdminBulkLinkInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-green-500"
                  />
                  <button
                    onClick={applyAdminLinkToAll}
                    disabled={!adminBulkLinkInput.trim()}
                    className="px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Product List with Link Inputs */}
              <div>
                <label className="text-[#D4AF37] font-bold text-sm mb-3 block">⬇️ Edit Manual per Produk (opsional)</label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedAdminProducts.map((productId) => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return null;

                    return (
                      <div key={productId} className="bg-black/30 border border-white/10 rounded-lg p-3">
                        <p className="text-white font-bold text-sm mb-2">{product.name}</p>
                        <input
                          type="url"
                          placeholder="https://vt.tiktok.com/..."
                          value={adminBulkEditForm[productId] || ''}
                          onChange={(e) => setAdminBulkEditForm({
                            ...adminBulkEditForm,
                            [productId]: e.target.value
                          })}
                          className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-[#D4AF37]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAdminBulkEditSave}
                  className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
                >
                  ✅ Simpan {selectedAdminProducts.length} Link
                </button>
                <button
                  onClick={() => {
                    setShowAdminBulkEditModal(false);
                    setAdminBulkEditForm({});
                    setAdminBulkLinkInput('');
                  }}
                  className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
                >
                  Batal
                </button>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-xs">
                <p>💡 <strong>Tips:</strong> Gunakan "Apply" untuk mengisi semua otomatis, atau edit manual untuk produk tertentu</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








