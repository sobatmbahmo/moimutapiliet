import React from 'react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

const PrintArea = ({ printData, printType }) => {
  if (!printData) return null;

  return (
    <div id="printable-area" className="hidden">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-area,
          #printable-area * {
            visibility: visible !important;
          }
          #printable-area {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            background: white;
            z-index: 9999;
            padding: 0;
            margin: 0;
          }
          #printable-area > div {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            box-sizing: border-box;
            background: white;
            padding: 16mm;
          }
        }
      `}</style>
      <div style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', boxSizing: 'border-box', padding: '16mm' }}>
        {printType === 'invoice' ? (
          <div className="text-black uppercase font-black">
            <div className="text-center border-b-2 border-black pb-2 mb-4">
              <h1 className="text-2xl font-black uppercase tracking-widest">Tokonembahmo</h1>
              <p className="text-[10px] font-bold">Surabaya • 0857-0080-0278</p>
            </div>
            <div className="text-left text-[10px] uppercase font-bold">
              <p className="mb-2">INV: {printData.invoice_id || printData.receipt_number} / {new Date(printData.created_at || new Date()).toLocaleDateString('id-ID')}</p>
              <div className="border border-black p-2 mb-4 font-normal uppercase leading-tight">Penerima: <b>{printData.customer_name}</b><br/>{printData.customer_address}</div>
              <div className="mb-2"><span className="font-bold">Ekspedisi:</span> {printData.expedition || 'J&T'}</div>
              <table className="w-full mb-4">
                <tbody>
                  {printData.items_detail.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-1"><div>{i.qty}x {i.name}</div>{i.note && <div className="text-[8px] italic font-normal">[{i.note}]</div>}</td>
                      <td className="text-right">{formatRupiah(i.price * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between border-t border-black pt-1"><span>JUMLAH:</span><span>{formatRupiah(printData.total_price)}</span></div>
              <div className="flex justify-between"><span>KOS PENGHANTARAN:</span><span>{formatRupiah(printData.shipping_cost || 0)}</span></div>
              <div className="border-t-2 border-black mt-1 pt-1 flex justify-between font-black text-xs"><span>TOTAL BAYARAN:</span><span>{formatRupiah((printData.total_price || 0) + parseInt(printData.shipping_cost || 0))}</span></div>
              <div className="mt-6 text-[10px] text-gray-600 font-normal">
                <b>SYARAT & KETENTUAN</b>
                <ul className="list-disc ml-4 mt-1">
                  <li>Pesanan akan diproses dan masuk antrean pengiriman setelah pembayaran diverifikasi.</li>
                  <li>Invoice ini sah sebagai bukti transaksi yang mengikat antara penjual dan pembeli.</li>
                  <li>Pembayaran berarti menyetujui seluruh S&K.</li>
                  <li>Komplain WAJIB video unboxing lengkap (tanpa terputus/edit) dari awal paket tersegel.</li>
                  <li>Batas maksimal komplain adalah 1x24 jam setelah diterima.</li>
                  <li>Layanan Pelanggan: 0857-0080-0278</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-black uppercase font-black" style={{ fontSize: '12px' }}>
            <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-2">
              <span className="text-[10px] font-bold py-1 uppercase">Resi Penghantaran</span>
              <span className="text-[9px] italic uppercase">Dicetak: {new Date().toLocaleString('id-ID')}</span>
            </div>
            <div className="text-center mb-3">
              <p className="text-[10px] border border-black px-2 inline-block py-1 font-bold">NO. RESI / REQUEST:</p>
              <h1 className="text-4xl font-black tracking-tight break-all leading-none mt-1">{printData.receipt_number}</h1>
            </div>
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="flex-1 border-r-2 border-black pr-2">
                <p className="text-[10px] border border-black px-1 inline-block mb-1 font-bold uppercase">KEPADA:</p>
                <p className="text-3xl font-black leading-none uppercase">{printData.customer_name}</p>
                <p className="text-xl font-bold mb-1 font-mono">{printData.customer_phone}</p>
                <div className="text-[10px] leading-tight italic font-normal uppercase">{printData.customer_address}</div>
              </div>
              <div className="w-1/3 text-center self-center">
                <p className="text-[10px] font-bold border-b border-black mb-1">KURIR:</p>
                <p className="text-3xl font-black italic">{printData.expedition || 'KURIR'}</p>
              </div>
            </div>
            <div className="border-y-2 border-black text-center py-1 text-sm mb-2 font-black uppercase">ISI PAKET (CATATAN PACKING)</div>
            <div className={`grid ${printData.items_detail.length > 5 ? 'grid-cols-2 gap-x-4' : 'grid-cols-1'}`}>
              {printData.items_detail.map((i, idx) => (
                <div key={idx} className="border-b border-black py-1 flex flex-col mb-1 last:border-0">
                  <div className="flex gap-2 items-center">
                    <span className="text-3xl font-black shrink-0">[{i.qty}]</span>
                    <span className="text-xl leading-none font-black uppercase">{i.name}</span>
                  </div>
                  {i.note && <div className="ml-12 text-[12px] border-l-4 border-black pl-2 italic font-bold mt-1 uppercase">* {i.note}</div>}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-2 border-t border-black text-center opacity-30 uppercase tracking-widest text-[10px] font-bold">TOKONEMBAHMO SURABAYA</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintArea;
