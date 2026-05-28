// ================================================================
// AFFILIATE LOGIC - Commission calculation, balance tracking, withdrawals
// NEW SCHEMA: affiliator_profiles, affiliate_commissions
// ================================================================

import { supabase } from './supabaseClient';

/**
 * Calculate commission dari nilai barang (10%, maksimal Rp 30.000 per transaksi)
 */
export const calculateCommission = (totalItemValue) => {
  if (!totalItemValue || totalItemValue <= 0) return 0;
  const rawCommission = totalItemValue * 0.10; // 10%
  return Math.min(rawCommission, 30000); // Maksimal 30.000
};

/**
 * Mendapatkan Summary Dashboard Affiliator
 */
export const getAffiliatorDashboardSummary = async (affiliatorId) => {
  try {
    // Get basic profile
    const { data: affiliator, error: affiliatorError } = await supabase
      .from('affiliator_profiles')
      .select('*')
      .eq('id', affiliatorId)
      .single();

    if (affiliatorError) {
      return { success: false, error: affiliatorError.message };
    }

    // Get all commissions for this affiliator
    const { data: commissions, error: commError } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount, status')
      .eq('affiliator_id', affiliatorId);

    if (commError) {
      return { success: false, error: commError.message };
    }

    let totalPending = 0;
    let totalCleared = 0;
    let totalPaid = 0;
    let orderCount = 0;

    if (commissions) {
      orderCount = commissions.length;
      commissions.forEach(c => {
        const amt = Number(c.commission_amount) || 0;
        if (c.status === 'pending') totalPending += amt;
        if (c.status === 'cleared') totalCleared += amt;
        if (c.status === 'paid') totalPaid += amt;
      });
    }

    return {
      success: true,
      summary: {
        affiliatorName: affiliator.name,
        refCode: affiliator.ref_code,
        whatsapp: affiliator.whatsapp_number,
        totalPending,
        totalCleared,
        totalPaid,
        orderCount,
        memberSince: new Date(affiliator.created_at).toLocaleDateString('id-ID')
      }
    };
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get riwayat pesanan (commissions) untuk affiliator
 */
export const getAffiliatorCommissions = async (affiliatorId) => {
  try {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select('*, orders(order_number, total_bayar, status, resi, biteship_tracking_id, created_at)')
      .eq('affiliator_id', affiliatorId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, commissions: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Admin: Bayar Komisi (Ubah status dari cleared ke paid)
 */
export const markCommissionsAsPaid = async (affiliatorId) => {
  try {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'paid' })
      .eq('affiliator_id', affiliatorId)
      .eq('status', 'cleared');

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
