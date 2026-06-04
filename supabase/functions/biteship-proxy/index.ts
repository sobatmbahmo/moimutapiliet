import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { endpoint, payload } = await req.json();
    
    // Validate endpoint
    if (!['/v1/maps/areas', '/v1/rates/couriers', '/v1/trackings'].includes(endpoint)) {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const API_KEY = Deno.env.get('BITESHIP_API_KEY');
    if (!API_KEY) {
      throw new Error('BITESHIP_API_KEY environment variable is not set');
    }

    let url = `https://api.biteship.com${endpoint}`;
    let method = 'POST';
    let body = JSON.stringify(payload);

    // If it's a GET request for areas (e.g., search)
    if (endpoint === '/v1/maps/areas' && payload?.input) {
      method = 'GET';
      url = `${url}?countries=ID&input=${encodeURIComponent(payload.input)}&type=single`;
      body = undefined;
    }

    // If it's a GET request for tracking
    if (endpoint === '/v1/trackings' && payload?.waybill_id && payload?.courier) {
      method = 'GET';
      url = `https://api.biteship.com/v1/trackings/${payload.waybill_id}/couriers/${payload.courier}`;
      body = undefined;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? body : undefined,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
