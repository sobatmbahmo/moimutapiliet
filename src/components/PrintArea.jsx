import React from 'react';
import Barcode from 'react-barcode';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

const wrapText = (text, maxLen = 30) => {
  if (!text) return '';
  const lines = [];
  for (let i = 0; i < text.length; i += maxLen) {
    lines.push(text.substring(i, i + maxLen));
  }
  return lines;
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
          <div className="text-black uppercase" style={{ fontSize: '9px', height: '146mm', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* === BARIS 1: NO INVOICE + TANGGAL === */}
            <div className="flex justify-between items-center" style={{ padding: '1mm 0' }}>
              <span style={{ fontSize: '9px' }} className="font-black">{printData.invoice_id || printData.receipt_number}</span>
              <span style={{ fontSize: '8px' }} className="font-normal">{new Date().toLocaleDateString('id-ID')}</span>
            </div>

            {/* === SEPARATOR === */}
            <div style={{ borderBottom: '1.5px solid black' }} />

            {/* === BARIS 2: EXPEDISI + KODE REQUEST + BARCODE === */}
            <div className="text-center" style={{ padding: '2mm 0' }}>
              <span style={{ fontSize: '9px' }} className="font-bold">{printData.expedition || 'KURIR'}</span>
              <div style={{ fontSize: '0', lineHeight: '0' }}>&nbsp;</div>
              <span style={{ fontSize: '20px', lineHeight: '1', wordBreak: 'break-all', display: 'block', fontWeight: '900', letterSpacing: '1px' }}>{printData.request_code || printData.receipt_number}</span>
              <div style={{ marginTop: '1mm' }}>
                <Barcode
                  value={printData.request_code || printData.receipt_number || '000'}
                  format="CODE128"
                  width={1.5}
                  height={28}
                  displayValue={false}
                  margin={0}
                  background="#ffffff"
                  lineColor="#000000"
                />
              </div>
            </div>

            {/* === SEPARATOR === */}
            <div style={{ borderBottom: '1.5px solid black' }} />

            {/* === BARIS 3: NAMA + NO HP + ALAMAT === */}
            <div style={{ padding: '1.5mm 0' }}>
              <div className="flex justify-between items-baseline">
                <span style={{ fontSize: '12px', lineHeight: '1.1' }} className="font-black">{printData.customer_name}</span>
                <span style={{ fontSize: '11px' }} className="font-bold font-mono shrink-0 ml-2">{printData.customer_phone}</span>
              </div>
              <div style={{ fontSize: '9px', lineHeight: '1.4', marginTop: '1mm' }} className="font-normal">
                {wrapText(printData.customer_address, 30).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>

            {/* === SEPARATOR === */}
            <div style={{ borderBottom: '1.5px solid black' }} />

            {/* === BARIS 4: TABEL BARANG === */}
            <div style={{ flex: 1, paddingTop: '1mm', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid black' }}>
                    <th style={{ textAlign: 'left', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '7px' }}>NAMA BARANG</th>
                    <th style={{ textAlign: 'left', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '7px' }}>KODE</th>
                    <th style={{ textAlign: 'center', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '7px' }}>SATUAN</th>
                    <th style={{ textAlign: 'center', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '7px' }}>QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items_detail.map((i, idx) => (
                    <tr key={idx} style={{ borderBottom: '0.5px solid #ccc' }}>
                      <td style={{ padding: '0.8mm 1mm', fontWeight: '700', fontSize: '9px', lineHeight: '1.2' }}>
                        {i.name}
                        {i.note && <div style={{ fontSize: '7px', fontWeight: '400', fontStyle: 'italic' }}>({i.note})</div>}
                      </td>
                      <td style={{ padding: '0.8mm 1mm', fontSize: '8px', fontFamily: 'monospace' }}>{i.product_code}</td>
                      <td style={{ padding: '0.8mm 1mm', fontSize: '8px', textAlign: 'center' }}>{i.satuan}</td>
                      <td style={{ padding: '0.8mm 1mm', fontSize: '12px', textAlign: 'center', fontWeight: '900' }}>{i.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* === FOOTER === */}
            <div className="text-center" style={{ borderTop: '1px solid black', paddingTop: '0.5mm', fontSize: '6px', opacity: 0.3, letterSpacing: '2px', fontWeight: '700' }}>TOKONEMBAHMO SURABAYA</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintArea;
