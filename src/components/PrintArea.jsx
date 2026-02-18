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
          @page {
            size: ${printType === 'resi' ? '100mm 150mm' : 'A4 portrait'};
            margin: ${printType === 'resi' ? '2mm' : '10mm'};
          }
          html, body {
            width: ${printType === 'resi' ? '100mm' : '210mm'};
            height: auto;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
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
            width: ${printType === 'resi' ? '100mm' : '100%'};
            height: auto;
            background: white;
            z-index: 9999;
            padding: 0;
            margin: 0;
          }
          #printable-area > div {
            width: 100%;
            max-height: ${printType === 'resi' ? '146mm' : 'none'};
            margin: 0;
            box-sizing: border-box;
            background: white;
            padding: ${printType === 'resi' ? '2mm' : '5mm'};
            page-break-after: avoid;
            page-break-inside: avoid;
            overflow: hidden;
          }
        }
      `}</style>
      <div style={{ width: printType === 'resi' ? '100mm' : '100%', margin: '0 auto', background: 'white', boxSizing: 'border-box', padding: printType === 'resi' ? '2mm' : '5mm' }}>
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
          <div className="text-black uppercase font-black" style={{ fontSize: '9px', height: '146mm', display: 'flex', flexDirection: 'column' }}>
            {/* === BAGIAN ATAS 50%: DATA RESI === */}
            <div style={{ height: '50%', borderBottom: '2px solid black', paddingBottom: '1mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="flex justify-between items-center border-b border-black pb-0.5">
                <span style={{ fontSize: '7px' }} className="font-bold uppercase">Resi Penghantaran</span>
                <span style={{ fontSize: '6px' }} className="italic uppercase">{new Date().toLocaleDateString('id-ID')}</span>
              </div>
              <div className="text-center">
                <p style={{ fontSize: '7px' }} className="border border-black px-1 inline-block py-0.5 font-bold">NO. RESI / REQUEST:</p>
                <h1 style={{ fontSize: '16px' }} className="font-black tracking-tight break-all leading-none mt-0.5">{printData.receipt_number}</h1>
              </div>
              <div className="flex justify-between items-start gap-1" style={{ flex: 1, marginTop: '1mm' }}>
                <div className="flex-1 border-r border-black pr-1" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: '7px' }} className="border border-black px-0.5 inline-block mb-0.5 font-bold uppercase w-fit">KEPADA:</p>
                  <p style={{ fontSize: '13px', lineHeight: '1.1' }} className="font-black uppercase">{printData.customer_name}</p>
                  <p style={{ fontSize: '10px' }} className="font-bold font-mono">{printData.customer_phone}</p>
                  <div style={{ fontSize: '7px', lineHeight: '1.2' }} className="italic font-normal uppercase">{printData.customer_address}</div>
                </div>
                <div className="text-center self-center" style={{ width: '22mm' }}>
                  <p style={{ fontSize: '7px' }} className="font-bold border-b border-black mb-0.5">KURIR:</p>
                  <p style={{ fontSize: '13px' }} className="font-black italic">{printData.expedition || 'KURIR'}</p>
                </div>
              </div>
            </div>

            {/* === BAGIAN BAWAH 50%: ISI PAKET === */}
            <div style={{ height: '50%', paddingTop: '1mm', display: 'flex', flexDirection: 'column' }}>
              <div className="border-b border-black text-center py-0.5 font-black uppercase" style={{ fontSize: '8px' }}>ISI PAKET (CATATAN PACKING)</div>
              <div style={{ flex: 1, overflow: 'hidden', marginTop: '1mm' }} className={`grid ${printData.items_detail.length > 4 ? 'grid-cols-2 gap-x-2' : 'grid-cols-1'} content-start`}>
                {printData.items_detail.map((i, idx) => (
                  <div key={idx} className="border-b border-black py-0.5 flex flex-col last:border-0">
                    <div className="flex gap-1 items-center">
                      <span style={{ fontSize: '16px' }} className="font-black shrink-0">[{i.qty}]</span>
                      <span style={{ fontSize: '12px', lineHeight: '1.1' }} className="font-black uppercase">{i.name}</span>
                    </div>
                    {i.note && <div className="ml-6 border-l-2 border-black pl-1 italic font-bold uppercase" style={{ fontSize: '8px' }}>* {i.note}</div>}
                  </div>
                ))}
              </div>
              <div className="pt-0.5 border-t border-black text-center opacity-30 uppercase tracking-widest font-bold" style={{ fontSize: '6px' }}>TOKONEMBAHMO SURABAYA</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintArea;
