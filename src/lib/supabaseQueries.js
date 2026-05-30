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
 * Create a new order and calculate affiliate commission if applicable
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
        subsidi_ongkir: orderData.subsidi_ongkir || 0,
        total_bayar: orderData.total_bayar,
        courier_name: orderData.courier_name,
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

    // --- NEW LOGIC: Calculate and insert commission ---
    if (orderData.affiliator_id && orderData.total_produk > 0) {
      const commissionRaw = orderData.total_produk * 0.10;
      const commissionAmount = Math.min(commissionRaw, 30000);
      
      const { error: commError } = await supabase
        .from('affiliate_commissions')
        .insert([{
          affiliator_id: orderData.affiliator_id,
          order_id: data.id,
          total_item_value: orderData.total_produk,
          commission_amount: commissionAmount,
          status: 'pending'
        }]);
        
      if (commError) console.error('Failed to create commission:', commError);
    }

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
 * Get all affiliators (Admin)
 */
export const getAllAffiliators = async () => {
  try {
    const { data, error } = await supabase
      .from('affiliator_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, affiliators: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Register new affiliator
 */
export const registerAffiliator = async (affiliatorData) => {
  try {
    const { data, error } = await supabase
      .from('affiliator_profiles')
      .insert([{
        name: affiliatorData.name,
        ref_code: affiliatorData.ref_code.toUpperCase(),
        tiktok_account: affiliatorData.tiktok_account || null,
        whatsapp_number: affiliatorData.whatsapp_number,
        bank_info: affiliatorData.bank_info || null
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
 * Delete affiliator
 */
export const deleteAffiliatorProfile = async (affiliatorId) => {
  try {
    const { error } = await supabase
      .from('affiliator_profiles')
      .delete()
      .eq('id', affiliatorId);

    if (error) return { success: false, error: error.message };
    return { success: true };
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
        variants: productData.variants || [],
        is_active: productData.is_active !== false
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

// ================================================================
// SLIDER QUERIES
// ================================================================

export const getSliders = async () => {
  try {
    const { data, error } = await supabase
      .from('app_sliders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, sliders: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createSlider = async (sliderData) => {
  try {
    const { data, error } = await supabase
      .from('app_sliders')
      .insert([{
        title: sliderData.title,
        image_url: sliderData.image_url,
        link: sliderData.link || null,
        sort_order: sliderData.sort_order || 0,
        is_active: sliderData.is_active ?? true
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, slider: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateSlider = async (sliderId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('app_sliders')
      .update(updateData)
      .eq('id', sliderId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, slider: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteSlider = async (sliderId) => {
  try {
    const { error } = await supabase
      .from('app_sliders')
      .delete()
      .eq('id', sliderId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const uploadSliderImage = async (file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `slider_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to public "product-images" bucket since we might not have a sliders bucket created
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (error) return { success: false, error: error.message };

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return { success: true, publicUrl: publicUrlData.publicUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
// ================================================================
// SETTINGS QUERIES
// ================================================================

export const getSetting = async (key) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching setting:', key, error);
      return { success: false, error: error.message };
    }
    
    return { success: true, value: data?.value || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateSetting = async (key, value) => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      
    if (error) {
      console.error('Error updating setting:', key, error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
/**
 * Toggle product active status (soft delete)
 */
export const toggleProductActiveStatus = async (productId, currentStatus) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !currentStatus })
      .eq('id', productId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
/**
 * Bulk update products order
 */
export const bulkUpdateProductOrder = async (updates) => {
  try {
    // Supabase upsert requires all NOT NULL columns if not using RPC.
    // Since we only want to update sort_order, we use Promise.all with individual updates.
    const updatePromises = updates.map(u => 
      supabase
        .from('products')
        .update({
          sort_order: u.sort_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', u.id)
    );

    const results = await Promise.all(updatePromises);
    
    // Check if any of the updates failed
    const hasError = results.find(result => result.error);
    if (hasError) return { success: false, error: hasError.error.message };

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
