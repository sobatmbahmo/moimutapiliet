import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let payload = {};
    try {
      const text = await req.text();
      if (text) payload = JSON.parse(text);
    } catch (e) {
      // Ignore parse error, treat as empty body for Biteship validation
    }

    // If there is no event, it's likely a test ping from Biteship during installation
    if (!payload.event) {
      return new Response(JSON.stringify({ message: "Webhook installation successful" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // We care about tracking updates and order status changes
    if (payload.event !== 'tracking.status.updated' && payload.event !== 'order.status') {
      return new Response(JSON.stringify({ message: "Ignored event" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { waybill_id, status } = payload;
    if (!waybill_id || !status) {
      return new Response(JSON.stringify({ error: "Missing waybill_id or status" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the order with this waybill_id (resi / biteship_tracking_id)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .or(`resi.eq.${waybill_id},biteship_tracking_id.eq.${waybill_id}`)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // If status is delivered, update order and commission
    if (status === 'delivered') {
      // 1. Update Order Status
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', order.id);

      if (updateOrderError) {
        throw new Error('Failed to update order: ' + updateOrderError.message);
      }

      // 2. Update Affiliate Commission Status
      const { error: updateCommissionError } = await supabase
        .from('affiliate_commissions')
        .update({ status: 'cleared' })
        .eq('order_id', order.id)
        .eq('status', 'pending'); // Only update if it's currently pending

      if (updateCommissionError) {
        throw new Error('Failed to update commission: ' + updateCommissionError.message);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
