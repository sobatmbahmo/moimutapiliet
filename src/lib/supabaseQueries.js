// ================================================================
// SUPABASE QUERIES - Database CRUD Operations
// ================================================================

import { supabase } from './supabaseClient';

// ================================================================
// USER QUERIES
// ================================================================

/**
 * Create or get user by phone number
 */
export const createOrGetUser = async (nama, nomorWA, email = null, alamat = null) => {
  try {
    // Check if user exists (use maybeSingle to allow 0 or 1 result)
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('nomor_wa', nomorWA)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
    }

    if (existing) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          nama,
          alamat: alamat || existing.alamat,
          email: email || existing.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, user: data, isNew: false };
    }

    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert([{
        nama,
        nomor_wa: nomorWA,
        email,
        alamat
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, user: data, isNew: true };
  } catch (error) {
    console.error('Error in createOrGetUser:', error);
    return { success: false, error: error.message };
  }
};

// ================================================================
// ORDER QUERIES
// ================================================================

/**
 * Get orders for a user
 */
export const getUserOrders = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, orders: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create a new order
 */
export const createOrder = async (userId, orderData) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        user_id: userId,
        order_number: orderData.order_number,
        metode_bayar: orderData.metode_bayar,
        total_produk: orderData.total_produk,
        shipping_cost: orderData.shipping_cost || 0,
        total_bayar: orderData.total_bayar,
        alamat: orderData.alamat,
        nomor_wa: orderData.nomor_wa,
        catatan: orderData.catatan || '',
        is_offline: orderData.is_offline || false,
        affiliator_id: orderData.affiliator_id || null,
        status: orderData.status || 'WAITING_CONFIRMATION',
        payment_due_date: orderData.payment_due_date || null
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, order: data };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add items to an order
 */
export const addOrderItems = async (orderId, items) => {
  try {
    const itemsToInsert = items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      qty: item.qty,
      harga_satuan: item.harga_satuan,
      subtotal: item.subtotal,
      varian: item.varian || null,
      satuan: item.satuan || '100gr'
    }));

    const { data, error } = await supabase
      .from('order_items')
      .insert(itemsToInsert)
      .select();

    if (error) return { success: false, error: error.message };
    return { success: true, items: data };
  } catch (error) {
    console.error('Error adding order items:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    };

    if (status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, order: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete an order
 */
export const deleteOrder = async (orderId) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ================================================================
// AFFILIATOR QUERIES
// ================================================================

/**
 * Get affiliator by email
 */
export const getAffiliatorByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('affiliators')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    return { success: true, affiliator: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create new affiliator
 */
export const createAffiliator = async (affiliatorData) => {
  try {
    const { data, error } = await supabase
      .from('affiliators')
      .insert([{
        nama: affiliatorData.nama,
        email: affiliatorData.email.toLowerCase(),
        nomor_wa: affiliatorData.nomor_wa,
        password_hash: affiliatorData.password,
        bank_name: affiliatorData.bank_name || null,
        account_number: affiliatorData.account_number || null,
        status: 'pending',
        current_balance: 0,
        total_commission: 0,
        total_withdrawn: 0
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, affiliator: data };
  } catch (error) {
    console.error('Error creating affiliator:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update affiliator data
 */
export const updateAffiliator = async (affiliatorId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('affiliators')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliatorId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, affiliator: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete affiliator
 */
export const deleteAffiliator = async (affiliatorId) => {
  try {
    const { error } = await supabase
      .from('affiliators')
      .delete()
      .eq('id', affiliatorId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ================================================================
// WITHDRAWAL QUERIES
// ================================================================

/**
 * Create withdrawal request
 */
export const createWithdrawal = async (affiliatorId, nominal, bankName, accountNumber, accountHolder) => {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .insert([{
        affiliator_id: affiliatorId,
        nominal,
        bank_name: bankName,
        bank_account: accountNumber,
        account_holder: accountHolder,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, withdrawal: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get withdrawals for affiliator
 */
export const getAffiliatorWithdrawals = async (affiliatorId) => {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('affiliator_id', affiliatorId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, withdrawals: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ================================================================
// PRODUCT QUERIES
// ================================================================

/**
 * Update product
 */
export const updateProduct = async (productId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, product: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Reorder product (change sort_order)
 */
export const reorderProduct = async (productId, newSortOrder) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        sort_order: newSortOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, product: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create new product
 */
export const createProduct = async (productData) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: productData.name,
        price: productData.price,
        description: productData.description || '',
        product_code: productData.product_code || '',
        image_url: productData.image_url || '',
        default_link: productData.default_link || '',
        commission_rate: productData.commission_rate || 10,
        sort_order: productData.sort_order || 0,
        berat_produk: productData.berat_produk || 200,
        variants: productData.variants || []
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, product: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete product by ID
 */
export const deleteProduct = async (productId) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Upload product image to Supabase Storage and get public URL
 */
export const uploadProductImage = async (file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to public "product-images" bucket
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) return { success: false, error: error.message };

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return { success: true, publicUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ================================================================
// CUSTOMER QUERIES
// ================================================================

/**
 * Get all customers (for offline order form)
 * No limit - load all customers for local search
 */
export const getAllCustomers = async () => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, customers: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Search customers by name or phone
 */
export const searchCustomers = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`nama.ilike.%${searchTerm}%,nomor_wa.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) return { success: false, error: error.message };
    return { success: true, customers: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create or update customer
 * @param {string} nama - Customer name
 * @param {string} nomor_wa - WhatsApp number
 * @param {string} alamat - Address (optional)
 */
export const upsertCustomer = async (nama, nomor_wa, alamat = null) => {
  try {
    // First, check if customer exists by nomor_wa
    const { data: existing, error: checkError } = await supabase
      .from('customers')
      .select('*')
      .eq('nomor_wa', nomor_wa)
      .maybeSingle();

    if (checkError) {
      console.error('Check customer error:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existing) {
      // Update existing customer
      const { data, error } = await supabase
        .from('customers')
        .update({
          nama: nama,
          alamat: alamat || existing.alamat,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Update customer error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, customer: data, isNew: false };
    } else {
      // Insert new customer
      const insertData = {
        nama: nama,
        nomor_wa: nomor_wa
      };
      
      // Only add alamat if provided
      if (alamat && alamat.trim() !== '') {
        insertData.alamat = alamat;
      }

      console.log('Inserting customer:', insertData);

      const { data, error } = await supabase
        .from('customers')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Insert customer error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, customer: data, isNew: true };
    }
  } catch (error) {
    console.error('Error in upsertCustomer:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete customer by ID
 * @param {string} customerId - Customer UUID
 */
export const deleteCustomer = async (customerId) => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      console.error('Delete customer error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error in deleteCustomer:', error);
    return { success: false, error: error.message };
  }
};

// ================================================================
// AFFILIATOR PRODUCT LINKS
// ================================================================

/**
 * Set affiliator's custom product link (TikTok)
 */
export const setAffiliatorProductLink = async (affiliatorId, productId, tiktokLink) => {
  try {
    // Check if link exists
    const { data: existing, error: checkError } = await supabase
      .from('affiliator_product_links')
      .select('*')
      .eq('affiliator_id', affiliatorId)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      return { success: false, error: checkError.message };
    }

    if (existing) {
      // Update existing link
      const { data, error } = await supabase
        .from('affiliator_product_links')
        .update({
          tiktok_link: tiktokLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      return { success: true, link: data };
    } else {
      // Insert new link
      const { data, error } = await supabase
        .from('affiliator_product_links')
        .insert([{
          affiliator_id: affiliatorId,
          product_id: productId,
          tiktok_link: tiktokLink
        }])
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, link: data };
    }
  } catch (error) {
    console.error('Error in setAffiliatorProductLink:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get affiliator's product link
 */
export const getAffiliatorProductLink = async (affiliatorId, productId) => {
  try {
    const { data, error } = await supabase
      .from('affiliator_product_links')
      .select('*')
      .eq('affiliator_id', affiliatorId)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    return { success: true, link: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ================================================================
// BINDING QUERIES
// ================================================================

/**
 * Create customer binding to affiliator
 */
export const createBinding = async (userId, affiliatorId) => {
  try {
    // Calculate end date (30 days from now)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { data, error } = await supabase
      .from('customer_binding')
      .insert([{
        user_id: userId,
        affiliator_id: affiliatorId,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        status: 'active'
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, binding: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get active binding for user
 */
export const getActiveBinding = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('customer_binding')
      .select('*, affiliators(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    return { success: true, binding: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
