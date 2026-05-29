import React, { useState, useEffect } from 'react';
import {
  LogOut, BarChart3, Users, Package, Settings, Eye, EyeOff,
  Plus, Edit, Trash, Check, X, DollarSign, TrendingUp, Copy, RefreshCw,
  Share2, Download, Truck, Calendar, PhoneCall, MapPin, AlertCircle, CheckCircle2, Printer, Send
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { 
  createOrder, addOrderItems, updateOrderStatus, deleteOrder,
  updateProduct, deleteAffiliatorProfile, reorderProduct,
  createProduct, deleteProduct, uploadProductImage,
  upsertCustomer, setAffiliatorProductLink, getAffiliatorProductLink,
  createOrGetUser, getAllCustomers, deleteCustomer
} from '../lib/supabaseQueries';
import { getAffiliatorDashboardSummary } from '../lib/affiliateLogic';
import { getAffiliatorBindings } from '../lib/bindingLogic';
import { generateOrderNumber } from '../lib/orderUtils';
import { sendOrderConfirmation, sendResiNotification, sendInvoiceNotification, sendAffiliatorApprovalNotification } from '../lib/fonntePush';
import { validateOngkir, validateResi, validateNomorWA, validateAlamat, validateNama } from '../lib/validation';
import { handleError, safeApiCall } from '../lib/errorHandler';

// Import Dashboard Modular Components
import PrintArea from './PrintArea';
import AddCustomerModal from './dashboard/AddCustomerModal';
import OfflineOrderForm from './dashboard/OfflineOrderForm';
import ShippingModal from './dashboard/ShippingModal';
import ResiNotificationModal from './dashboard/ResiNotificationModal';
import EditAffiliatorModal from './dashboard/EditAffiliatorModal';
import AdminOrdersPanel from './dashboard/AdminOrdersPanel';
import AdminProductsPanel from './dashboard/AdminProductsPanel';
import AdminAffiliatorsPanel from './dashboard/AdminAffiliatorsPanel';
import AdminCustomersPanel from './dashboard/AdminCustomersPanel';
import AdminSlidersPanel from './dashboard/AdminSlidersPanel';
import AffiliatorDashboard from './dashboard/AffiliatorDashboard';

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
  const [deletingOrderId, setDeletingOrderId] = useState(null); 
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ======================
  // STATE: DATA
  // ======================
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [affiliators, setAffiliators] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sliders, setSliders] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
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
  const [skipShippingNotif, setSkipShippingNotif] = useState(false);
  const [billOrder, setBillOrder] = useState('');
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);
  const [showResiNotificationModal, setShowResiNotificationModal] = useState(false);
  const [selectedOrderForResiNotif, setSelectedOrderForResiNotif] = useState(null);
  const [resiNotifNumber, setResiNotifNumber] = useState('');

  const [showPrintResiModal, setShowPrintResiModal] = useState(false);
  const [selectedOrderForPrintResi, setSelectedOrderForPrintResi] = useState(null);
  const [expeditionRequestCode, setExpeditionRequestCode] = useState('');
  const [printData, setPrintData] = useState(null);
  const [printType, setPrintType] = useState('resi');

  const handleResendAffiliatorNotification = async (affiliator) => {
    setLoading(true);
    try {
      let password = affiliator.password_hash || 'Password Anda (hubungi admin jika lupa)';
      if (affiliator.plain_password) password = affiliator.plain_password;
      await sendAffiliatorApprovalNotification(
        affiliator.nomor_wa,
        affiliator.nama,
        affiliator.email,
        affiliator.bank_name || 'N/A',
        affiliator.account_number || 'N/A',
        password
      );
      setSuccessMsg(`Notifikasi berhasil dikirim ulang ke ${affiliator.nama}`);
    } catch (err) {
      setErrorMsg('Gagal mengirim ulang notifikasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const couriersWithBill = ['J&T', 'WAHANA', 'ID Express', 'Indah Cargo'];

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

  const [withdrawalForm, setWithdrawalForm] = useState({
    nominal: '',
    bank_name: '',
    account_name: '',
    account_number: ''
  });

  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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

  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderingProduct, setReorderingProduct] = useState(null);
  const [reorderDestination, setReorderDestination] = useState('');

  const [, setShowCustomerSearchDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); 
  const [newCustomerForm, setNewCustomerForm] = useState({
    nama: '',
    nomor_wa: '',
    alamat: ''
  });

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

  const [showEditProductLinkModal, setShowEditProductLinkModal] = useState(false);
  const [editingProductForLink, setEditingProductForLink] = useState(null);
  const [productLinkForm, setProductLinkForm] = useState({
    tiktok_shop: ''
  });

  const [showShareProductModal, setShowShareProductModal] = useState(false);
  const [sharingProduct, setSharingProduct] = useState(null);

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({});
  const [bulkLinkInput, setBulkLinkInput] = useState(''); 

  const [selectedAdminProducts, setSelectedAdminProducts] = useState([]);
  const [showAdminBulkEditModal, setShowAdminBulkEditModal] = useState(false);
  const [adminBulkEditForm, setAdminBulkEditForm] = useState({});
  const [adminBulkLinkInput, setAdminBulkLinkInput] = useState('');

  // ======================
  // LOAD DATA
  // ======================
  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          .from('affiliator_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        setAffiliators(affiliatorsData || []);

        // Load customers for offline order form
        const customersResult = await getAllCustomers();
        if (customersResult.success) {
          setCustomers(customersResult.customers || []);
        }
        
        // Load sliders
        const { data: slidersData } = await supabase
          .from('app_sliders')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        setSliders(slidersData || []);
      } else if (isAffiliator) {
        // --- PERBAIKAN 1: LOAD LINK TIKTOK & GABUNGKAN KE PRODUCT ---
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true });
        
        const { data: linksData } = await supabase
          .from('affiliator_product_links')
          .select('product_id, tiktok_link')
          .eq('affiliator_id', user.id);

        const productsWithLinks = (productsData || []).map(p => {
          const customLink = (linksData || []).find(l => l.product_id === p.id);
          return {
            ...p,
            afiliasi_tiktok: customLink ? customLink.tiktok_link : null
          };
        });
        
        setProducts(productsWithLinks);
        // -------------------------------------------------------------

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

        // Load their commissions
        const { getAffiliatorCommissions } = await import('../lib/affiliateLogic');
        const commissionsResult = await getAffiliatorCommissions(user.id);
        if (commissionsResult.success) {
          setWithdrawals(commissionsResult.commissions || []); // Keeping withdrawals state name for simplicity, but it stores commissions now
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
  const handlePrintLabel = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      window.print();
      
      setSuccessMsg('Status order berubah ke Processing. Silakan print label dan input resi.');
      loadInitialData();
    } catch (err) {
      setErrorMsg('Error updating status: ' + err.message);
      console.error(err);
    }
  };

  const handleCreateProductClick = () => {
    setEditingProduct({ id: 'new' });
    setEditProductForm({
      name: '',
      description: '',
      price: 0,
      image_url: '',
      product_code: '',
      commission_rate: 10,
      default_link: '',
      sort_order: products.length + 1
    });
    setErrorMsg('');
    setShowEditProductModal(true);
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
      setErrorMsg('');
      
      let result;
      if (editingProduct.id === 'new') {
        result = await createProduct(editProductForm);
      } else {
        result = await updateProduct(editingProduct.id, editProductForm);
      }

      if (result.success) {
        setSuccessMsg(editingProduct.id === 'new' ? 'Produk baru berhasil ditambahkan' : 'Produk berhasil diupdate');
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

  const handleDeleteProduct = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!window.confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      
      const result = await deleteProduct(productId);
      if (result.success) {
        setSuccessMsg(`Produk "${product.name}" berhasil dihapus.`);
        loadInitialData();
      } else {
        if (result.error?.includes('foreign key constraint') || result.error?.includes('violates foreign key')) {
          setErrorMsg(`Gagal menghapus: Produk "${product.name}" tidak dapat dihapus karena sudah pernah dipesan oleh pelanggan. Silakan ubah nama atau deskripsinya saja.`);
        } else {
          setErrorMsg('Gagal menghapus produk: ' + result.error);
        }
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (JPEG/PNG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran gambar maksimal adalah 5MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      setErrorMsg('');
      const result = await uploadProductImage(file);
      if (result.success) {
        setEditProductForm(prev => ({
          ...prev,
          image_url: result.publicUrl
        }));
        setSuccessMsg('Gambar berhasil diunggah!');
      } else {
        setErrorMsg('Gagal mengunggah gambar: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error upload gambar: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setNewCustomerForm({
      nama: customer.nama,
      nomor_wa: customer.nomor_wa,
      alamat: customer.alamat || ''
    });
    setShowAddCustomerModal(true);
    setShowCustomerSearchDropdown(false);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerForm.nama?.trim()) {
      setErrorMsg('Nama customer harus diisi');
      return;
    }
    if (!newCustomerForm.nomor_wa?.trim()) {
      setErrorMsg('Nomor WhatsApp harus diisi');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      
      const result = await upsertCustomer(
        newCustomerForm.nama,
        newCustomerForm.nomor_wa,
        newCustomerForm.alamat || null
      );

      if (result.success) {
        setSuccessMsg(editingCustomer ? 'Customer berhasil diupdate' : 'Customer berhasil ditambahkan');
        if (activeTab === 'orders') {
          setOfflineOrder({
            ...offlineOrder,
            customer_name: result.customer.nama,
            customer_phone: result.customer.nomor_wa,
            customer_address: result.customer.alamat || offlineOrder.customer_address
          });
        }
        setShowAddCustomerModal(false);
        setNewCustomerForm({ nama: '', nomor_wa: '', alamat: '' });
        setEditingCustomer(null);
        setErrorMsg('');
        
        const customersResult = await getAllCustomers();
        if (customersResult.success) {
          setCustomers(customersResult.customers || []);
        }
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      setLoading(true);
      const result = await deleteCustomer(customerId);
      
      if (result.success) {
        setSuccessMsg('Customer berhasil dihapus');
        setShowAddCustomerModal(false);
        setEditingCustomer(null);
        setNewCustomerForm({ nama: '', nomor_wa: '', alamat: '' });
        
        const customersResult = await getAllCustomers();
        if (customersResult.success) {
          setCustomers(customersResult.customers || []);
        }
      } else {
        setErrorMsg('Error: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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


  const handleDeleteAffiliator = async (affiliatorId, affiliatorName) => {
    const confirmed = window.confirm(
      `⚠️ Apakah Anda yakin ingin menghapus mitra ${affiliatorName}?\n\nTindakan ini tidak dapat dibatalkan!`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await deleteAffiliatorProfile(affiliatorId);
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

  const handleEditAffiliator = (affiliator) => {
    setEditingAffiliator(affiliator);
    setEditAffiliatorForm({
      nama: affiliator.nama || '',
      nomor_wa: affiliator.nomor_wa || '',
      email: affiliator.email || '',
      status: affiliator.status || 'active',
      akun_tiktok: affiliator.akun_tiktok || '',
      bank_name: affiliator.bank_name || '',
      account_number: affiliator.account_number || ''
    });
    setShowEditAffiliatorModal(true);
  };

  const handleSaveAffiliator = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('affiliator_profiles')
        .update({
          nama: editAffiliatorForm.nama,
          nomor_wa: editAffiliatorForm.nomor_wa,
          email: editAffiliatorForm.email,
          status: editAffiliatorForm.status,
          akun_tiktok: editAffiliatorForm.akun_tiktok,
          bank_name: editAffiliatorForm.bank_name,
          account_number: editAffiliatorForm.account_number
        })
        .eq('id', editingAffiliator.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setSuccessMsg('Profil mitra berhasil diperbarui');
      setShowEditAffiliatorModal(false);
      loadInitialData();
    } catch (err) {
      setErrorMsg('Gagal memperbarui profil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

const handleEditProductLink = async (product) => {
  setEditingProductForLink(product);
  const result = await getAffiliatorProductLink(user.id, product.id);
  if (result.success && result.link) {
    setProductLinkForm({
      tiktok_shop: result.link.tiktok_link || ''
    });
  } else {
    setProductLinkForm({ tiktok_shop: '' });  // ✅ Set ke empty jika tidak ada
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
      
      // ✅ UPDATE: Reload data agar tampilan fresh
      await loadInitialData();
    } else {
      setErrorMsg('Error: ' + result.error);
    }
  } catch (err) {
    setErrorMsg('Error: ' + err.message);
  } finally {
    setLoading(false);
  }
};

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
      products.find(p => p.id === productId); 
      initialForm[productId] = '';
    });
    setBulkEditForm(initialForm);
    setBulkLinkInput(''); 
    setShowBulkEditModal(true);
  };

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
        
        // --- PERBAIKAN 3: RELOAD INITIAL DATA ---
        await loadInitialData();
        // ----------------------------------------
      } else {
        setErrorMsg('Tidak ada link yang diisi');
      }

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving bulk links:', error);
      setErrorMsg('Terjadi kesalahan saat menyimpan');
    }
  };

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

  const handleInputResi = async (orderId, skipNotif = false) => {
    if (!resiNumber.trim()) {
      setErrorMsg('Nomor resi tidak boleh kosong');
      return;
    }

    try {
      const { error: updateError } = await supabase
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

      if (updateError) throw updateError;

      const order = orders.find(o => o.id === orderId);
      if (order?.users?.nomor_wa && !skipNotif) {
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

  const handleConfirmDelivery = async (orderId, skipNotif = false) => {
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

  const handleConfirmPayment = async (orderId, skipNotif = false) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'PAID',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      setSuccessMsg('Pembayaran berhasil dikonfirmasi!');
      loadInitialData();
    } catch (err) {
      setErrorMsg('Gagal konfirmasi pembayaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPrintResiModal = (order) => {
    setSelectedOrderForPrintResi(order);
    const isReprint = order.status === 'SHIPPED' || order.status === 'shipped';
    if (isReprint && order.resi && order.resi.includes('-')) {
      const parts = order.resi.split('-');
      setExpeditionRequestCode(parts.slice(1).join('-') || '');
    } else {
      setExpeditionRequestCode('');
    }
    setShowPrintResiModal(true);
 };

  const handleSubmitPrintResi = async () => {
    if (!expeditionRequestCode.trim()) {
      setErrorMsg('Kode rikues expedisi wajib diisi');
      return;
    }

    try {
      setLoading(true);
      const isReprint = selectedOrderForPrintResi.status === 'SHIPPED' || selectedOrderForPrintResi.status === 'shipped';
      
      const updateData = { 
        resi: `${selectedOrderForPrintResi.courier_name || selectedOrderForPrintResi.resi?.split('-')[0] || 'EXPEDISI'}-${expeditionRequestCode}`,
        updated_at: new Date().toISOString()
      };
      
      if (!isReprint) {
        updateData.status = 'SHIPPED';
      }
      
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrderForPrintResi.id);

      if (error) throw error;

      const order = selectedOrderForPrintResi;
      const resiCode = `${order.courier_name || order.resi?.split('-')[0] || 'EXPEDISI'}-${expeditionRequestCode}`;
      const itemsDetail = (order.order_items || []).map(item => ({
        name: item.products?.name || item.nama_produk || 'Produk',
        product_code: item.products?.product_code || '',
        qty: item.qty || 1,
        satuan: item.satuan || 'pcs',
        price: item.harga_satuan || 0,
        note: item.varian || ''
      }));

      setPrintData({
        receipt_number: resiCode,
        invoice_id: order.invoice_id || order.id?.substring(0, 8)?.toUpperCase() || '',
        request_code: expeditionRequestCode,
        customer_name: order.users?.nama || order.nama_pembeli || '',
        customer_phone: order.users?.nomor_wa || order.nomor_wa || '',
        customer_address: order.alamat || '',
        expedition: order.courier_name || order.resi?.split('-')[0] || 'EXPEDISI',
        items_detail: itemsDetail,
        total_price: order.total_produk || 0,
        shipping_cost: order.shipping_cost || 0,
        created_at: order.created_at
      });
      setPrintType('resi');

      setSuccessMsg(isReprint ? 'Resi berhasil diupdate!' : 'Resi berhasil disimpan! Order dalam perjalanan.');
      setShowPrintResiModal(false);
      setSelectedOrderForPrintResi(null);
      setExpeditionRequestCode('');
      loadInitialData();

      setTimeout(() => {
        window.print();
      }, 500);
    } catch (err) {
      setErrorMsg('Gagal menyimpan resi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShippingModal = (order) => {
    setSelectedOrder(order);
    setShippingCost(order.shipping_cost || '');
    setCourierName(order.courier_name || 'J&T');
    setSkipShippingNotif(false);
    setBillOrder('');
    setShowShippingModal(true);
  };

  const handleConfirmShipping = async () => {
    const ongkirError = validateOngkir(shippingCost);
    if (ongkirError) {
      setErrorMsg(ongkirError);
      return;
    }

    if (!couriername.trim()) {
      setErrorMsg('Pilih ekspedisi');
      return;
    }

    try {
      setLoading(true);
      // Baris ini memastikan meskipun ada titik/koma, tetap terbaca sebagai angka bersih
      const shippingAmount = parseInt(String(shippingCost || '0').replace(/\D/g, ''), 10);
      const updatedTotalProduk = selectedOrder.order_items.reduce((sum, i) => sum + (i.qty * i.harga_satuan), 0);
      const newTotal = updatedTotalProduk + shippingAmount;

      for (const item of selectedOrder.order_items) {
        await supabase
          .from('order_items')
          .update({ harga_satuan: item.harga_satuan })
          .eq('id', item.id);
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          shipping_cost: shippingAmount,
          courier_name: couriername,
          total_produk: updatedTotalProduk,
          total_bayar: newTotal,
          resi: couriername,
          status: 'WAITING_PAYMENT',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .select()
        .single();

      if (orderUpdateError) throw orderUpdateError;

      if (selectedOrder.users?.nomor_wa && !skipShippingNotif) {
        await safeApiCall(
          () => sendInvoiceNotification(
            selectedOrder.users.nomor_wa,
            selectedOrder.order_number,
            selectedOrder.users.nama,
            updatedTotalProduk,
            shippingAmount,
            couriername
          ),
          { context: 'Mengirim notifikasi invoice ke customer' }
        );
      }

      setSuccessMsg(skipShippingNotif ? '✅ Ongkir & harga produk berhasil disimpan!' : '✅ Ongkir & harga produk berhasil disimpan! Invoice sudah dikirim ke customer via WhatsApp.');
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

  const handleSubmitOfflineOrder = async () => {
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

      const orderNumResult = await generateOrderNumber();
      if (!orderNumResult.success) throw new Error('Gagal membuat nomor pesanan');
      const orderNumber = orderNumResult.orderNumber;

      const userResult = await createOrGetUser(
        offlineOrder.customer_name,
        offlineOrder.customer_phone,
        null,
        offlineOrder.customer_address
      );
      if (!userResult.success) throw new Error('Gagal membuat/mendapatkan data user: ' + userResult.error);
      const userId = userResult.user.id;

      const subtotal = offlineOrder.items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
      
      let subsidiOngkir = 0;
      if (subtotal >= 100000) {
        subsidiOngkir = 10000;
      } else if (subtotal >= 60000) {
        subsidiOngkir = 5000;
      }

      const finalShippingCost = Math.max(0, offlineOrder.shipping_cost - subsidiOngkir);
      const total = subtotal + finalShippingCost;

      const createOrderResult = await createOrder(userId, {
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
        subsidi_ongkir: subsidiOngkir,
        courier_name: offlineOrder.courier_name
      });

      if (!createOrderResult.success) throw new Error(createOrderResult.error);

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

      const itemsForMessage = offlineOrder.items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          product_name: product?.name || 'Produk',
          quantity: item.quantity,
          price: item.price,
          varian: item.varian || null
        };
      });

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


  if (showPrintLabel && selectedOrderForLabel) {
    const order = selectedOrderForLabel;
    const courierName = order.resi?.split('-')[0] || 'PENDING';
    const resiNumber = order.resi || 'N/A';
    const itemCount = order.order_items?.length || 0;
    const isMultiColumn = itemCount > 4;
    
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
        <div className="bg-white w-full max-w-3xl max-h-[95vh] overflow-y-auto print-container">
          {/* LABEL CETAK (Tetap Sama) */}
          <div className="relative border-b-4 border-black p-2 text-black label-section">
            <div className="mb-0 pb-0 border-b-2 border-black">
              <p className="text-xs text-gray-600 mb-0 font-bold">EKSPEDISI</p>
              <p className="text-4xl font-black leading-none">{courierName}</p>
            </div>
            <div className="mb-2 pb-1 border-b-3 border-black">
              <p className="text-xs text-gray-600 mb-0 font-bold">NO. RESI / KODE BOOKING</p>
              <p className="font-mono font-black text-2xl break-words leading-tight">
                {resiNumber}
              </p>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: '70% 30%' }}>
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
          <div className="flex items-center px-2 py-0.5 bg-gray-100">
            <div className="flex-1 border-t-2 border-dashed border-black"></div>
            <p className="px-1 text-xs font-bold text-gray-600">POTONG</p>
            <div className="flex-1 border-t-2 border-dashed border-black"></div>
          </div>
          <div className="p-1 text-black packing-section">
            <div className="mb-0 pb-0 border-b-2 border-black">
              <h2 className="text-base font-black leading-tight">DETAIL PACKING</h2>
              <p className="text-xs text-gray-700 mt-0">Invoice: <span className="font-bold font-mono text-xs">{order.order_number}</span></p>
            </div>
            <div className={`${isMultiColumn ? 'grid grid-cols-2 gap-1' : 'block space-y-1'}`}>
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item, idx) => {
                  let containerPadding = 'p-1';
                  let nameSize = 'text-sm';
                  let skuSize = 'text-xs';
                  let qtyLabelSize = 'text-xs';
                  let qtySize = 'text-lg';
                  
                  if (itemCount <= 3) {
                    nameSize = 'text-lg'; qtySize = 'text-2xl'; containerPadding = 'p-1.5';
                  } else if (itemCount <= 5) {
                    nameSize = 'text-base'; qtySize = 'text-lg'; containerPadding = 'p-1';
                  } else if (itemCount <= 8) {
                    nameSize = 'text-sm'; qtySize = 'text-base'; containerPadding = 'p-1';
                  } else if (itemCount <= 12) {
                    nameSize = 'text-xs'; skuSize = 'text-xs'; qtySize = 'text-sm'; containerPadding = 'p-0.5';
                  } else {
                    nameSize = 'text-xs'; skuSize = 'text-xs'; qtyLabelSize = 'text-xs'; qtySize = 'text-xs'; containerPadding = 'p-0.5';
                  }
                  
                  return (
                    <div key={item.id || idx} className={`border border-gray-400 ${containerPadding}`}>
                      <p className={`font-bold text-black mb-0 ${nameSize}`}>
                        {item.products?.name || 'Produk Tidak Ditemukan'}
                      </p>
                      <p className={`${skuSize} text-gray-700 mb-0`}>
                        SKU: <span className="font-mono font-semibold">{item.products?.id?.substring(0, 8) || 'N/A'}</span>
                      </p>
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
              {order.catatan && (
                <div className="bg-yellow-100 border-2 border-orange-400 p-1">
                  <p className="text-xs font-bold mb-0">⚠️ CATATAN:</p>
                  <p className="text-xs leading-tight">{order.catatan}</p>
                </div>
              )}
              <div className="text-center text-xs text-gray-600 pt-0.5">
                <p className="leading-none">Dicetak: {new Date().toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
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

  if (isAffiliator) {
    return (
      <AffiliatorDashboard
        user={user}
        onLogout={onLogout}
        products={products}
        bindings={bindings}
        withdrawals={withdrawals}
        summary={summary}
        loading={loading}
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
        showWithdrawalForm={showWithdrawalForm}
        setShowWithdrawalForm={setShowWithdrawalForm}
        withdrawalForm={withdrawalForm}
        setWithdrawalForm={setWithdrawalForm}
        handleRequestWithdrawal={handleRequestWithdrawal}
        showEditProductLinkModal={showEditProductLinkModal}
        editingProductForLink={editingProductForLink}
        productLinkForm={productLinkForm}
        setProductLinkForm={setProductLinkForm}
        handleEditProductLink={handleEditProductLink}
        handleSaveProductLink={handleSaveProductLink}
        setShowEditProductLinkModal={setShowEditProductLinkModal}
        showShareProductModal={showShareProductModal}
        sharingProduct={sharingProduct}
        handleShareProduct={handleShareProduct}
        setShowShareProductModal={setShowShareProductModal}
        setSharingProduct={setSharingProduct}
        generateAffiliatorLink={generateAffiliatorLink}
        copyLinkToClipboard={copyLinkToClipboard}
        shareToWhatsApp={shareToWhatsApp}
        selectedProducts={selectedProducts}
        toggleProductSelection={toggleProductSelection}
        showBulkEditModal={showBulkEditModal}
        setShowBulkEditModal={setShowBulkEditModal}
        handleBulkEditOpen={handleBulkEditOpen}
        bulkEditForm={bulkEditForm}
        setBulkEditForm={setBulkEditForm}
        bulkLinkInput={bulkLinkInput}
        setBulkLinkInput={setBulkLinkInput}
        applyLinkToAll={applyLinkToAll}
        handleBulkEditSave={handleBulkEditSave}
        handleEditAffiliator={handleEditAffiliator}
      />
    );
  }

  const adminTabs = [
    { key: 'orders', label: 'Orders', icon: <Package size={18} />, count: orders.length },
    { key: 'products', label: 'Produk', icon: <BarChart3 size={18} />, count: products.length },
    { key: 'affiliators', label: 'Mitra', icon: <Users size={18} />, count: affiliators.length },
    { key: 'customers', label: 'Pelanggan', icon: <Share2 size={18} />, count: customers.length },
    { key: 'sliders', label: 'Tampilan', icon: <Eye size={18} />, count: sliders.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#042f2e] to-[#022c22] text-white">
      <div className="sticky top-0 z-40 bg-[#042f2e]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex justify-between items-center">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-[#D4AF37] truncate">Dashboard Admin</h1>
            <p className="text-xs sm:text-sm text-gray-400 truncate">Halo, {user.nama}!</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { loadInitialData(); }}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition"
              title="Refresh data"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-300 text-sm font-bold rounded-lg hover:bg-red-500/30 transition"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {adminTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/5'
                    : 'text-gray-400 border-transparent hover:text-white hover:border-white/20'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {successMsg && (
          <div className="p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-2 items-center animate-fade-in">
            <CheckCircle2 size={18} className="text-green-400 shrink-0" />
            <p className="text-green-300 text-sm">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-center animate-fade-in">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{errorMsg}</p>
          </div>
        )}

        {activeTab === 'orders' && (
          <AdminOrdersPanel
            orders={orders}
            loading={loading}
            deletingOrderId={deletingOrderId}
            editingResi={editingResi}
            resiNumber={resiNumber}
            couriername={couriername}
            setEditingResi={setEditingResi}
            setResiNumber={setResiNumber}
            setCourierName={setCourierName}
            setShowOfflineOrderForm={setShowOfflineOrderForm}
            handleOpenShippingModal={handleOpenShippingModal}
            handleConfirmPayment={handleConfirmPayment}
            handleOpenPrintResiModal={handleOpenPrintResiModal}
            handleInputResi={handleInputResi}
            handleConfirmDelivery={handleConfirmDelivery}
            handleDeleteOrder={handleDeleteOrder}
          />
        )}

        {activeTab === 'products' && (
          <AdminProductsPanel
            products={products}
            loading={loading}
            selectedAdminProducts={selectedAdminProducts}
            toggleAdminProductSelection={toggleAdminProductSelection}
            handleAdminBulkEditOpen={handleAdminBulkEditOpen}
            handleEditProduct={handleEditProduct}
            handleCreateProductClick={handleCreateProductClick}
            handleDeleteProduct={handleDeleteProduct}
            setReorderingProduct={setReorderingProduct}
            setReorderDestination={setReorderDestination}
            setShowReorderModal={setShowReorderModal}
          />
        )}

        {activeTab === 'affiliators' && (
          <AdminAffiliatorsPanel
            affiliators={affiliators}
            loading={loading}
            handleApproveAffiliator={handleApproveAffiliator}
            handleEditAffiliator={handleEditAffiliator}
            handleDeleteAffiliator={handleDeleteAffiliator}
            handleResendAffiliatorNotification={handleResendAffiliatorNotification}
          />
        )}

        {activeTab === 'customers' && (
          <AdminCustomersPanel
            customers={customers}
            loading={loading}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onAddCustomer={() => {
              setEditingCustomer(null);
              setNewCustomerForm({ nama: '', nomor_wa: '', alamat: '' });
              setShowAddCustomerModal(true);
            }}
          />
        )}

        {activeTab === 'sliders' && (
          <AdminSlidersPanel
            sliders={sliders}
            loading={loading}
            setSliders={setSliders}
            loadInitialData={loadInitialData}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
        )}

        {showEditProductModal && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {editingProduct.id === 'new' ? 'Tambah Produk Baru' : 'Edit Produk'}
                </h2>
                <button
                  onClick={() => setShowEditProductModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
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

                <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                  <label className="text-[#D4AF37] font-bold text-sm block">Foto Produk</label>
                  
                  {/* Pilihan 1: Upload File Manual */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-400 font-medium">Cara 1: Unggah Foto Manual (.jpg, .png, .jpeg)</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                        id="image-file-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="image-file-upload"
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed text-xs font-bold cursor-pointer transition ${
                          isUploadingImage
                            ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                            : 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/20 active:scale-95'
                        }`}
                      >
                        <Download size={14} className="rotate-180" />
                        {isUploadingImage ? 'Mengunggah gambar...' : 'Pilih & Unggah File Foto'}
                      </label>
                      {isUploadingImage && (
                        <span className="text-xs text-[#D4AF37] animate-pulse">Mengunggah file ke Supabase Storage...</span>
                      )}
                    </div>
                  </div>

                  {/* Pembatas */}
                  <div className="flex items-center my-2">
                    <hr className="flex-1 border-white/10" />
                    <span className="px-2 text-[10px] text-gray-500 uppercase tracking-widest">Atau</span>
                    <hr className="flex-1 border-white/10" />
                  </div>

                  {/* Pilihan 2: Input URL langsung */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-400 font-medium">Cara 2: Masukkan URL Tautan Gambar</span>
                    <input
                      type="url"
                      value={editProductForm.image_url}
                      onChange={(e) => setEditProductForm({ ...editProductForm, image_url: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-xs outline-none focus:border-[#D4AF37]"
                      placeholder="https://example.com/gambar-produk.jpg"
                    />
                  </div>

                  {/* Preview Gambar */}
                  {editProductForm.image_url && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">Pratinjau Gambar:</p>
                      <div className="relative w-36 h-36 border border-white/10 rounded-xl overflow-hidden group">
                        <img 
                          src={editProductForm.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => setEditProductForm(prev => ({ ...prev, image_url: '' }))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 opacity-80 hover:opacity-100 transition shadow-lg"
                          title="Hapus foto"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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

                <div className="space-y-2">
                  <label className="text-[#D4AF37] font-bold text-sm">Deskripsi Produk</label>
                  <textarea
                    value={editProductForm.description}
                    onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-24"
                    placeholder="Deskripsi detail produk"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveProduct}
                    disabled={loading || isUploadingImage}
                    className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : (editingProduct.id === 'new' ? 'Tambah Produk' : 'Simpan Perubahan')}
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

        <EditAffiliatorModal
          isOpen={showEditAffiliatorModal && !!editingAffiliator}
          onClose={() => setShowEditAffiliatorModal(false)}
          form={editAffiliatorForm}
          setForm={setEditAffiliatorForm}
          onSubmit={handleSaveAffiliator}
          loading={loading}
        />

        {showAdminBulkEditModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl p-6 space-y-4 my-8">
              <h2 className="text-2xl font-bold text-white">📝 Edit Batch - Link TikTok Default</h2>
              <p className="text-sm text-gray-400">Edit link TikTok Shop default untuk {selectedAdminProducts.length} produk yang dipilih</p>

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

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-xs">
                <p>💡 <strong>Tips:</strong> Gunakan "Apply" untuk mengisi semua otomatis, atau edit manual untuk produk tertentu</p>
              </div>
            </div>
          </div>
        )}

        <AddCustomerModal
          isOpen={showAddCustomerModal}
          onClose={() => {
            setShowAddCustomerModal(false);
            setEditingCustomer(null);
            setErrorMsg('');
          }}
          editingCustomer={editingCustomer}
          form={newCustomerForm}
          setForm={setNewCustomerForm}
          onSubmit={handleAddNewCustomer}
          onDelete={handleDeleteCustomer}
          loading={loading}
          errorMsg={errorMsg}
        />

        <ShippingModal
          isOpen={showShippingModal && !!selectedOrder}
          onClose={() => {
            setShowShippingModal(false);
            setBillOrder('');
          }}
          selectedOrder={selectedOrder}
          setSelectedOrder={setSelectedOrder}
          couriername={couriername}
          setCourierName={setCourierName}
          couriersWithBill={couriersWithBill}
          billOrder={billOrder}
          setBillOrder={setBillOrder}
          shippingCost={shippingCost}
          setShippingCost={setShippingCost} 
          errorMsg={errorMsg}
          loading={loading}
          onConfirm={handleConfirmShipping}
          formatRupiah={formatRupiah}
          skipNotif={skipShippingNotif}
          setSkipNotif={setSkipShippingNotif}
        />

        {showPrintResiModal && selectedOrderForPrintResi && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#D4AF37]">
                  {(selectedOrderForPrintResi.status === 'SHIPPED' || selectedOrderForPrintResi.status === 'shipped') 
                    ? 'Print Resi Ulang' 
                    : 'Print Resi'}
                </h2>
                <button
                  onClick={() => {
                    setShowPrintResiModal(false);
                    setSelectedOrderForPrintResi(null);
                    setExpeditionRequestCode('');
                  }}
                  className="p-2 hover:bg-white/10 rounded text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>

              {(selectedOrderForPrintResi.status === 'SHIPPED' || selectedOrderForPrintResi.status === 'shipped') && (
                <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm">
                  <Printer size={16} className="inline mr-2" />
                  Print ulang resi - masukkan kode rikues baru jika berbeda
                </div>
              )}

              <div className="bg-black/30 border border-white/10 rounded-lg p-3 space-y-1">
                <p className="font-bold text-white">{selectedOrderForPrintResi.order_number}</p>
                <p className="text-sm text-gray-400">
                  {selectedOrderForPrintResi.users?.nama || selectedOrderForPrintResi.nama_pembeli}
                </p>
                <p className="text-xs text-gray-500">{selectedOrderForPrintResi.alamat}</p>
                <p className="text-sm text-[#D4AF37] font-bold">
                  Expedisi: {selectedOrderForPrintResi.resi || selectedOrderForPrintResi.courier_name || 'Belum dipilih'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#D4AF37]">
                  Kode Request Expedisi <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan kode rikues dari expedisi..."
                  value={expeditionRequestCode}
                  onChange={(e) => setExpeditionRequestCode(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400">
                  Nomor tiket/kode rikues yang didapat dari sistem expedisi saat booking
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitPrintResi}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : '✓ Simpan & Kirim'}
                </button>
                <button
                  onClick={() => {
                    setShowPrintResiModal(false);
                    setSelectedOrderForPrintResi(null);
                    setExpeditionRequestCode('');
                  }}
                  className="px-4 py-3 bg-gray-500/20 text-gray-300 font-bold rounded-lg hover:bg-gray-500/30 transition"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        <ResiNotificationModal
          isOpen={showResiNotificationModal && !!selectedOrderForResiNotif}
          onClose={() => {
            setShowResiNotificationModal(false);
            setResiNotifNumber('');
            setErrorMsg('');
          }}
          selectedOrder={selectedOrderForResiNotif}
          resiNumber={resiNotifNumber}
          setResiNumber={setResiNotifNumber}
          errorMsg={errorMsg}
          loading={loading}
          onSend={handleSendResiNotification}
        />

        <OfflineOrderForm
          isOpen={showOfflineOrderForm && isAdmin}
          onClose={() => setShowOfflineOrderForm(false)}
          offlineOrder={offlineOrder}
          setOfflineOrder={setOfflineOrder}
          products={products}
          customers={customers}
          loading={loading}
          onSubmit={handleSubmitOfflineOrder}
          onAddCustomer={() => {
            setEditingCustomer(null);
            setNewCustomerForm({ nama: '', nomor_wa: '', alamat: '' });
            setShowAddCustomerModal(true);
          }}
          onEditCustomer={handleEditCustomer}
          formatRupiah={formatRupiah}
        />

        <PrintArea printData={printData} printType={printType} />
      </div>
    </div>
  );
}
