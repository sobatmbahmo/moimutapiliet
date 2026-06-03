import { supabase } from './supabaseClient';

export const searchBiteshipAreas = async (input) => {
  try {
    const { data, error } = await supabase.functions.invoke('biteship-proxy', {
      body: {
        endpoint: '/v1/maps/areas',
        payload: { input }
      }
    });

    if (error) throw error;
    return { success: true, areas: data.areas || [] };
  } catch (err) {
    console.error('Error searching areas:', err);
    return { success: false, error: err.message };
  }
};

export const getBiteshipRates = async (destinationPostalCode, items, courier = 'jnt') => {
  try {
    const weight = items.reduce((total, item) => {
      // Asumsi default berat 200 gram jika tidak ada
      const itemWeight = item.berat_produk || 200;
      return total + (itemWeight * item.qty);
    }, 0);

    const payload = {
      origin_postal_code: '60242', // RUSUNAWA GUNUNGSARI, Wonokromo, Surabaya
      destination_postal_code: destinationPostalCode,
      couriers: courier,
      items: [
        {
          name: 'Pesanan Moimut',
          description: 'Pesanan dari website',
          value: items.reduce((sum, i) => sum + (i.harga_produk * i.qty), 0),
          length: 10,
          width: 10,
          height: 10,
          weight: weight
        }
      ]
    };

    const { data, error } = await supabase.functions.invoke('biteship-proxy', {
      body: {
        endpoint: '/v1/rates/couriers',
        payload
      }
    });

    if (error) throw error;
    return { success: true, pricing: data.pricing || [] };
  } catch (err) {
    console.error('Error getting rates:', err);
    return { success: false, error: err.message };
  }
};

export const createBiteshipTracking = async (waybill_id, courier = 'jnt') => {
  try {
    const { data, error } = await supabase.functions.invoke('biteship-proxy', {
      body: {
        endpoint: '/v1/trackings',
        payload: { waybill_id, courier }
      }
    });

    if (error) throw error;
    return { success: true, tracking: data };
  } catch (err) {
    console.error('Error creating tracking:', err);
    return { success: false, error: err.message };
  }
};
