// ================================================================
// SUPABASE QUERIES - Helper functions untuk database operations
// ================================================================

import { supabase } from './supabaseClient';

// ===== CUSTOMERS (Admin Order Manual) =====
export const searchCustomers = async (query) => {
  try {
    if (!query || query.trim().length === 0) {
      return { success: true, customers: [] };
    }

    // Search by nama or nomor_wa (case insensitive)
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, nama, nomor_wa, alamat')
      .or(`nama.ilike.%${query}%,nomor_wa.ilike.%${query}%`)
      .limit(10);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, customers: customers || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const upsertCustomer = async (nama, nomor_wa, alamat = null) => {
  try {
    // Check if customer already exists
    const { data: existingCustomers, error: searchError } = await supabase
      .from('customers')
      .select('*')
      .eq('nomor_wa', nomor_wa);

    if (searchError) {
      return { success: false, error: searchError.message };
    }

    // If exists, update it
    if (existingCustomers && existingCustomers.length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('customers')
        .update({
          nama,
          alamat,
          updated_at: new Date().toISOString()
        })
        .eq('nomor_wa', nomor_wa)
        .select()
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, customer: updated, isNew: false };
    }

    // If not exists, create new
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        nama,
        nomor_wa,
        alamat,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, customer: newCustomer, isNew: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== USERS =====
export const createOrGetUser = async (nama, nomor_wa, email = null, alamat = null) => {
  try {
    // Cari user berdasarkan nomor WA
    const { data: existingUsers, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('nomor_wa', nomor_wa);

    // Jika ada user yang match, return yang pertama
    if (existingUsers && existingUsers.length > 0) {
      return { success: true, user: existingUsers[0], isNew: false };
    }

    // Jika tidak ada, buat user baru
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        nama,
        nomor_wa,
        email,
        alamat
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, user: newUser, isNew: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUser = async (userId, data) => {
  try {
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: updatedUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserByWA = async (nomor_wa) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('nomor_wa', nomor_wa)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    return { success: true, user: user || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== AFFILIATORS =====
export const getAffiliatorByEmail = async (email) => {
  try {
    const { data: affiliator, error } = await supabase
      .from('affiliators')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    return { success: true, affiliator: affiliator || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createAffiliator = async (nama, nomor_wa, email, password_hash, akun_tiktok = []) => {
  try {
    const { data: newAffiliator, error } = await supabase
      .from('affiliators')
      .insert({
        nama,
        nomor_wa,
        email,
        password_hash,
        akun_tiktok,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, affiliator: newAffiliator };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateAffiliator = async (affiliatorId, data) => {
  try {
    const { data: updatedAffiliator, error } = await supabase
      .from('affiliators')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliatorId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, affiliator: updatedAffiliator };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update product details (admin)
 */
export const updateProduct = async (productId, data) => {
  try {
    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, product: updatedProduct };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Reorder product: Move product to a specific position in the list
 * Automatically renumbers all products to have clean 1-N sequence
 * Example: Move product to position 12
 *   - All products are renumbered as 1, 2, 3, ..., N
 *   - Then moved product is placed at position 12
 *   - Others shift accordingly
 */
export const reorderProduct = async (productId, targetPosition) => {
  try {
    // Get all products sorted by sort_order
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, sort_order')
      .order('sort_order', { ascending: true });

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!allProducts || allProducts.length === 0) {
      return { success: false, error: 'No products found' };
    }

    // Find the product we're moving and its current index
    const productIndex = allProducts.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return { success: false, error: 'Product not found' };
    }

    // Validate target position
    const totalProducts = allProducts.length;
    if (targetPosition < 1 || targetPosition > totalProducts) {
      return { success: false, error: `Target position must be between 1 and ${totalProducts}` };
    }

    // Move product to target position in array
    const movedProduct = allProducts.splice(productIndex, 1)[0];
    allProducts.splice(targetPosition - 1, 0, movedProduct);

    // Now renumber all products with clean 1 to N sequence
    const updates = [];
    for (let i = 0; i < allProducts.length; i++) {
      const newSort = i + 1; // 1-based index
      if (allProducts[i].sort_order !== newSort) {
        updates.push({
          id: allProducts[i].id,
          newSort
        });
      }
    }

    // Apply all updates
    if (updates.length === 0) {
      return { success: true, updates: [] };
    }

    const updatePromises = updates.map(({ id, newSort }) =>
      supabase
        .from('products')
        .update({ sort_order: newSort, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const hasError = results.some(result => result.error);
    if (hasError) {
      return { success: false, error: 'Some updates failed' };
    }

    return { success: true, updates: updates.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteAffiliator = async (affiliatorId) => {
  try {
    // Delete withdrawals first (FK constraint)
    await supabase
      .from('withdrawals')
      .delete()
      .eq('affiliator_id', affiliatorId);

    // Delete bindings
    await supabase
      .from('customer_binding')
      .delete()
      .eq('affiliator_id', affiliatorId);

    // Delete affiliator
    const { error } = await supabase
      .from('affiliators')
      .delete()
      .eq('id', affiliatorId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== ORDERS =====
export const createOrder = async (userId, orderData) => {
  try {
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderData.order_number,
        affiliator_id: orderData.affiliator_id || null,
        status: 'WAITING_CONFIRMATION',
        metode_bayar: orderData.metode_bayar,
        total_produk: orderData.total_produk,
        total_bayar: orderData.total_bayar,
        alamat: orderData.alamat,
        nomor_wa: orderData.nomor_wa,
        nama_pembeli: orderData.nama_pembeli || null,
        catatan: orderData.catatan || null,
        is_offline: orderData.is_offline || false,
        payment_due_date: orderData.payment_due_date,
        shipping_cost: orderData.shipping_cost || 0,
        courier_name: orderData.courier_name || null
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: newOrder };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const addOrderItems = async (orderId, items) => {
  try {
    const itemsToInsert = items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      qty: item.qty,
      varian: item.varian || null,
      harga_satuan: item.harga_satuan,
      subtotal: item.subtotal
    }));

    const { data: insertedItems, error } = await supabase
      .from('order_items')
      .insert(itemsToInsert)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, items: insertedItems };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getOrderWithItems = async (orderId) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      return { success: false, error: orderError.message };
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*, products(*)')
      .eq('order_id', orderId);

    if (itemsError) {
      return { success: false, error: itemsError.message };
    }

    return { success: true, order: { ...order, items } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete order dan semua order_items terkait
 * Digunakan untuk mengantisipasi double order
 */
export const deleteOrder = async (orderId) => {
  try {
    // Delete order items first (FK constraint)
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      return { success: false, error: `Failed to delete order items: ${itemsError.message}` };
    }

    // Then delete the order
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      return { success: false, error: `Failed to delete order: ${orderError.message}` };
    }

    return { success: true, message: 'Order deleted successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

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

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: updatedOrder };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserOrders = async (userId) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== BINDING =====
export const createBinding = async (userId, affiliatorId) => {
  try {
    // Check jika sudah ada binding aktif
    const { data: existingBinding } = await supabase
      .from('customer_binding')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingBinding) {
      // Update existing binding
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const { data: updatedBinding, error } = await supabase
        .from('customer_binding')
        .update({
          affiliator_id: affiliatorId,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBinding.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, binding: updatedBinding, isUpdate: true };
    }

    // Create new binding
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    const { data: newBinding, error } = await supabase
      .from('customer_binding')
      .insert({
        user_id: userId,
        affiliator_id: affiliatorId,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, binding: newBinding, isUpdate: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getActiveBinding = async (userId) => {
  try {
    const { data: binding, error } = await supabase
      .from('customer_binding')
      .select('*, affiliators(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    return { success: true, binding: binding || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== WITHDRAWALS =====
export const createWithdrawal = async (affiliatorId, nominal, bankData) => {
  try {
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        affiliator_id: affiliatorId,
        nominal,
        bank_name: bankData.bank_name,
        bank_account: bankData.bank_account,
        account_holder: bankData.account_holder,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, withdrawal };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAffiliatorWithdrawals = async (affiliatorId) => {
  try {
    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('affiliator_id', affiliatorId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, withdrawals };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateWithdrawalStatus = async (withdrawalId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data: updatedWithdrawal, error } = await supabase
      .from('withdrawals')
      .update(updateData)
      .eq('id', withdrawalId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, withdrawal: updatedWithdrawal };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== AFFILIATOR PRODUCT LINKS =====
export const setAffiliatorProductLink = async (affiliatorId, productId, tiktokLink) => {
  try {
    const { data: existingLink, error: checkError } = await supabase
      .from('affiliator_product_links')
      .select('id')
      .eq('affiliator_id', affiliatorId)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing link:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingLink) {
      // Update existing link
      const { data: updated, error } = await supabase
        .from('affiliator_product_links')
        .update({
          tiktok_shop_link: tiktokLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLink.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, link: updated };
    }

    // Create new link
    const { data: newLink, error } = await supabase
      .from('affiliator_product_links')
      .insert({
        affiliator_id: affiliatorId,
        product_id: productId,
        tiktok_shop_link: tiktokLink
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, link: newLink };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAffiliatorProductLink = async (affiliatorId, productId) => {
  try {
    const { data: link, error } = await supabase
      .from('affiliator_product_links')
      .select('tiktok_shop_link')
      .eq('affiliator_id', affiliatorId)
      .eq('product_id', productId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching link:', error);
      return { success: false, error: error.message };
    }

    return { success: true, link: link || null };
  } catch (error) {
    console.error('Error in getAffiliatorProductLink:', error);
    return { success: false, error: error.message };
  }
};
