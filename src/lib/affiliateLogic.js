// ================================================================
// AFFILIATE LOGIC - Commission calculation, balance tracking, withdrawals
// ================================================================

import { supabase } from './supabaseClient';

/**
 * Calculate commission dari order total
 * Commission = order total * (commission rate / 100)
 */
export const calculateCommission = (orderTotal, commissionRate) => {
  if (!orderTotal || !commissionRate) return 0;
  return (orderTotal * commissionRate) / 100;
};

/**
 * Add commission ke affiliator balance (ketika order delivered)
 * Track di dalam order atau dalam tabel balance history
 */
export const addCommissionToBalance = async (affiliatorId, commissionAmount, orderId) => {
  try {
    // Get current balance
    const { data: affiliator, error: affiliatorError } = await supabase
      .from('affiliators')
      .select('current_balance')
      .eq('id', affiliatorId)
      .single();

    if (affiliatorError) {
      return { success: false, error: affiliatorError.message };
    }

    const newBalance = (affiliator.current_balance || 0) + commissionAmount;

    // Update balance
    const { data, error } = await supabase
      .from('affiliators')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliatorId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log transaction
    if (orderId) {
      await logBalanceTransaction(
        affiliatorId,
        'commission_earned',
        commissionAmount,
        orderId
      );
    }

    return {
      success: true,
      newBalance,
      commissionAdded: commissionAmount,
      affiliator: data
    };
  } catch (error) {
    console.error('Error adding commission to balance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Deduct dari balance ketika withdrawal disetujui
 */
export const deductBalanceForWithdrawal = async (affiliatorId, withdrawalAmount, withdrawalId) => {
  try {
    // Get current balance
    const { data: affiliator, error: affiliatorError } = await supabase
      .from('affiliators')
      .select('current_balance')
      .eq('id', affiliatorId)
      .single();

    if (affiliatorError) {
      return { success: false, error: affiliatorError.message };
    }

    const currentBalance = affiliator.current_balance || 0;

    if (currentBalance < withdrawalAmount) {
      return {
        success: false,
        error: 'Insufficient balance',
        currentBalance
      };
    }

    const newBalance = currentBalance - withdrawalAmount;

    // Update balance
    const { data, error } = await supabase
      .from('affiliators')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliatorId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log transaction
    if (withdrawalId) {
      await logBalanceTransaction(
        affiliatorId,
        'withdrawal_approved',
        -withdrawalAmount,
        withdrawalId
      );
    }

    return {
      success: true,
      newBalance,
      withdrawalAmount,
      affiliator: data
    };
  } catch (error) {
    console.error('Error deducting balance for withdrawal:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current balance affiliator
 */
export const getAffiliatorBalance = async (affiliatorId) => {
  try {
    const { data, error } = await supabase
      .from('affiliators')
      .select('id, nama, balance, updated_at')
      .eq('id', affiliatorId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, balance: data.balance || 0, affiliator: data };
  } catch (error) {
    console.error('Error getting affiliator balance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Log balance transaction ke audit trail
 * Untuk tracking commission earned dan withdrawal
 */
const logBalanceTransaction = async (
  affiliatorId,
  transactionType,
  amount,
  referenceId
) => {
  try {
    await supabase.from('balance_transactions').insert([
      {
        affiliator_id: affiliatorId,
        type: transactionType, // 'commission_earned', 'withdrawal_approved', 'withdrawal_rejected'
        amount,
        reference_id: referenceId,
        created_at: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Error logging balance transaction:', error);
  }
};

/**
 * Get balance transaction history untuk affiliator
 */
export const getAffiliatorBalanceHistory = async (affiliatorId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('balance_transactions')
      .select('*')
      .eq('affiliator_id', affiliatorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, transactions: data || [] };
  } catch (error) {
    console.error('Error getting balance history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate total earning affiliator dalam periode tertentu
 */
export const calculateAffiliatorEarnings = async (affiliatorId, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('total_bayar')
      .eq('affiliator_id', affiliatorId)
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      return { success: false, error: error.message };
    }

    let totalEarnings = 0;
    data?.forEach((order) => {
      const commissionRate = 5; // default 5%
      const commission = calculateCommission(order.total_bayar, commissionRate);
      totalEarnings += commission;
    });

    return { success: true, totalEarnings, orderCount: data?.length || 0 };
  } catch (error) {
    console.error('Error calculating earnings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get summary dashboard affiliator
 * Include: balance, pending earnings, lifetime earnings, customer count
 */
export const getAffiliatorDashboardSummary = async (affiliatorId) => {
  try {
    // Get basic info
    const { data: affiliator, error: affiliatorError } = await supabase
      .from('affiliators')
      .select('id, nama, nomor_wa, current_balance, created_at')
      .eq('id', affiliatorId)
      .single();

    if (affiliatorError) {
      return { success: false, error: affiliatorError.message };
    }

    // Get customer binding count
    const { data: bindings, error: bindingsError } = await supabase
      .from('customer_binding')
      .select('id')
      .eq('affiliator_id', affiliatorId)
      .eq('status', 'active');

    // Get order count (delivered)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_bayar')
      .eq('affiliator_id', affiliatorId)
      .eq('status', 'COMPLETED');

    // Calculate total earnings with default commission rate (5%)
    let totalEarnings = 0;
    orders?.forEach((order) => {
      const commissionRate = 5; // Default 5% commission
      totalEarnings += calculateCommission(order.total_bayar, commissionRate);
    });

    // Get pending withdrawals
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('id, nominal')
      .eq('affiliator_id', affiliatorId)
      .eq('status', 'pending');

    const pendingWithdrawal = withdrawals?.reduce((sum, w) => sum + w.nominal, 0) || 0;

    return {
      success: true,
      summary: {
        affiliatorName: affiliator.nama,
        affiliatorPhone: affiliator.nomor_wa,
        currentBalance: affiliator.current_balance || 0,
        totalEarnings,
        customerCount: bindings?.length || 0,
        orderCount: orders?.length || 0,
        pendingWithdrawal,
        memberSince: new Date(affiliator.created_at).toLocaleDateString('id-ID')
      }
    };
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate withdrawal request
 * Cek: balance cukup, nominal minimal, data bank lengkap
 */
export const validateWithdrawalRequest = async (
  affiliatorId,
  withdrawalNominal,
  minimalNominal = 50000
) => {
  try {
    const { balance, error } = await getAffiliatorBalance(affiliatorId);

    if (error) {
      return { valid: false, message: 'Error retrieving balance' };
    }

    if (!balance || balance === 0) {
      return { valid: false, message: 'Balance not available' };
    }

    if (withdrawalNominal < minimalNominal) {
      return {
        valid: false,
        message: `Minimal penarikan adalah Rp${minimalNominal.toLocaleString('id-ID')}`
      };
    }

    if (withdrawalNominal > balance) {
      return {
        valid: false,
        message: `Balance Anda tidak cukup. Balance tersedia: Rp${balance.toLocaleString(
          'id-ID'
        )}`
      };
    }

    return { valid: true, message: 'Withdrawal request is valid' };
  } catch (error) {
    console.error('Error validating withdrawal:', error);
    return { valid: false, message: error.message };
  }
};

/**
 * Get top earning affiliators
 */
export const getTopAffiliators = async (limit = 10, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('orders')
      .select('affiliator_id, affiliators(id, nama), total_bayar')
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate.toISOString());

    if (error) {
      return { success: false, error: error.message };
    }

    // Group by affiliator and calculate earnings
    const earnings = {};
    data?.forEach((order) => {
      const affiliatorId = order.affiliator_id;
      if (!affiliatorId) return;

      const commissionRate = 5; // default 5%
      const commission = calculateCommission(order.total_bayar, commissionRate);

      if (!earnings[affiliatorId]) {
        earnings[affiliatorId] = {
          affiliatorId,
          affiliatorName: order.affiliators?.nama,
          totalEarnings: 0,
          orderCount: 0
        };
      }

      earnings[affiliatorId].totalEarnings += commission;
      earnings[affiliatorId].orderCount += 1;
    });

    const topAffiliators = Object.values(earnings)
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);

    return { success: true, topAffiliators };
  } catch (error) {
    console.error('Error getting top affiliators:', error);
    return { success: false, error: error.message };
  }
};
