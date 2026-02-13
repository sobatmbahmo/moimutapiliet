// ================================================================
// BINDING LOGIC - Manage customer-affiliator binding (90 days)
// ================================================================

import { supabase } from './supabaseClient';
import { createBinding, getActiveBinding } from './supabaseQueries';

/**
 * Check apakah customer sudah binding ke affiliator
 * Jika sudah dan masih berlaku (< 90 hari), kembalikan affiliator
 * Jika sudah tapi sudah expired (> 90 hari), return null
 * Jika belum, return null
 */
export const checkActiveBinding = async (userId) => {
  try {
    const { success, binding } = await getActiveBinding(userId);

    if (!success || !binding) {
      return { hasActiveBinding: false, affiliator: null };
    }

    const endDate = new Date(binding.end_date);
    const now = new Date();

    if (now > endDate) {
      // Binding sudah expired, update status ke expired
      await supabase
        .from('customer_binding')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', binding.id);

      return { hasActiveBinding: false, affiliator: null };
    }

    // Binding masih aktif
    return { hasActiveBinding: true, affiliator: binding.affiliators };
  } catch (error) {
    console.error('Error checking active binding:', error);
    return { hasActiveBinding: false, affiliator: null, error: error.message };
  }
};

/**
 * Create atau update binding untuk customer ke affiliator
 * Binding berlaku 90 hari dari tanggal dibuat
 */
export const createOrUpdateBinding = async (userId, affiliatorId) => {
  try {
    const result = await createBinding(userId, affiliatorId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, binding: result.binding, isUpdated: result.isUpdate };
  } catch (error) {
    console.error('Error creating/updating binding:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cek apakah customer bisa di-binding ke affiliator baru
 * Kondisi:
 * - Jika belum ada binding sebelumnya, bisa langsung
 * - Jika sudah ada binding tapi sudah expired (> 90 hari), bisa di-bind ulang
 * - Jika masih dalam masa binding aktif, tidak bisa ke affiliator lain (tunggu expired)
 */
export const canBindToNewAffiliator = async (userId) => {
  try {
    const { success, binding } = await getActiveBinding(userId);

    if (!success || !binding) {
      // Belum ada binding, bisa
      return { canBind: true, reason: 'no_binding' };
    }

    const endDate = new Date(binding.end_date);
    const now = new Date();

    if (now > endDate) {
      // Binding sudah expired, bisa di-bind ke yang baru
      return { canBind: true, reason: 'binding_expired' };
    }

    // Masih dalam masa binding aktif, tidak bisa
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return {
      canBind: false,
      reason: 'binding_active',
      daysLeft,
      currentAffiliator: binding.affiliators?.nama
    };
  } catch (error) {
    console.error('Error checking binding eligibility:', error);
    return { canBind: false, error: error.message };
  }
};

/**
 * Cancel/end binding customer ke affiliator
 * (Hanya bisa dilakukan oleh admin)
 */
export const cancelBindingByAdmin = async (bindingId) => {
  try {
    const { data, error } = await supabase
      .from('customer_binding')
      .update({
        status: 'manual_cancel',
        updated_at: new Date().toISOString()
      })
      .eq('id', bindingId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, binding: data };
  } catch (error) {
    console.error('Error canceling binding:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get semua customer yang binding ke specific affiliator
 */
export const getAffiliatorBindings = async (affiliatorId) => {
  try {
    const { data, error } = await supabase
      .from('customer_binding')
      .select('*, users(*)')
      .eq('affiliator_id', affiliatorId)
      .eq('status', 'active');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, bindings: data || [] };
  } catch (error) {
    console.error('Error getting affiliator bindings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get binding history untuk customer
 */
export const getCustomerBindingHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('customer_binding')
      .select('*, affiliators(id, nama, nomor_wa, email)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, history: data || [] };
  } catch (error) {
    console.error('Error getting binding history:', error);
    return { success: false, error: error.message };
  }
};
