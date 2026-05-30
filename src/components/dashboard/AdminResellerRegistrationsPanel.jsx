import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, MessageCircle, Clock, Trash } from 'lucide-react';
import { fetchResellerRegistrations, updateResellerRegistrationStatus } from '../../lib/supabaseQueries';
import { supabase } from '../../lib/supabaseClient';

export default function AdminResellerRegistrationsPanel({ setSuccessMsg, setErrorMsg }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    setLoading(true);
    const result = await fetchResellerRegistrations();
    if (result.success) {
      setRegistrations(result.data);
    } else {
      setErrorMsg('Gagal memuat pendaftaran reseller: ' + result.error);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id, status, oldCatatan) => {
    const catatan = window.prompt(`Masukkan catatan admin (opsional) untuk status ${status.toUpperCase()}:`, oldCatatan || '');
    if (catatan === null) return; // User cancelled

    setLoading(true);
    const result = await updateResellerRegistrationStatus(id, status, catatan);
    if (result.success) {
      setSuccessMsg(`Status pendaftaran berhasil diubah menjadi ${status}!`);
      loadRegistrations();
    } else {
      setErrorMsg('Gagal mengubah status: ' + result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data pendaftaran ini permanen?')) return;
    setLoading(true);
    
    try {
      const { error } = await supabase.from('reseller_registrations').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg('Data pendaftaran berhasil dihapus!');
      loadRegistrations();
    } catch (err) {
      setErrorMsg('Gagal menghapus data: ' + err.message);
      setLoading(false);
    }
  };

  const openWhatsApp = (phone, nama) => {
    // Format phone to 62...
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    
    const text = encodeURIComponent(`Halo Kak ${nama}, saya admin dari Toko Mbah Mo terkait pendaftaran Agen/Reseller...`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Calon Reseller / Agen</h3>
          <p className="text-xs text-gray-500">
            {registrations.length} data pendaftar
          </p>
        </div>
        <button 
          onClick={loadRegistrations}
          className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition"
        >
          Refresh Data
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs text-[#D4AF37] uppercase bg-black/40 border-b border-white/10">
            <tr>
              <th className="px-4 py-3">Nama Lengkap</th>
              <th className="px-4 py-3">Kontak WA</th>
              <th className="px-4 py-3">Alamat</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && registrations.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
            ) : registrations.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Belum ada yang mendaftar.</td></tr>
            ) : (
              registrations.map(reg => (
                <tr key={reg.id} className="border-b border-white/5 bg-black/20 hover:bg-black/40 transition">
                  <td className="px-4 py-3 font-medium text-white">{reg.nama_lengkap}</td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => openWhatsApp(reg.nomor_wa, reg.nama_lengkap)}
                      className="flex items-center gap-2 px-2 py-1 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded transition text-xs"
                    >
                      <MessageCircle size={14} /> {reg.nomor_wa}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[150px] truncate" title={reg.alamat}>
                    {reg.alamat}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {reg.target_penjualan || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${
                      reg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      reg.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {reg.status === 'pending' && <Clock size={12} />}
                      {reg.status === 'approved' && <UserCheck size={12} />}
                      {reg.status === 'rejected' && <UserX size={12} />}
                      {reg.status.toUpperCase()}
                    </span>
                    {reg.catatan_admin && (
                      <div className="text-[10px] text-gray-500 mt-1" title={reg.catatan_admin}>
                        Note: {reg.catatan_admin}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {reg.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(reg.id, 'approved', reg.catatan_admin)}
                          className="p-1.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded transition"
                          title="Setujui"
                        ><UserCheck size={16} /></button>
                      )}
                      {reg.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(reg.id, 'rejected', reg.catatan_admin)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded transition"
                          title="Tolak"
                        ><UserX size={16} /></button>
                      )}
                      <button
                        onClick={() => handleDelete(reg.id)}
                        className="p-1.5 bg-gray-500/10 hover:bg-gray-500 text-gray-400 hover:text-white rounded transition ml-2"
                        title="Hapus Data"
                      ><Trash size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
