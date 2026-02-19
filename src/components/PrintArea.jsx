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

  const isResi = printType === 'resi';

  return (
    <div id="printable-area" className="hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        @media print {
          @page {
            size: ${isResi ? '100mm 150mm' : 'A4 portrait'};
            margin: 0 !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html {
            width: ${isResi ? '100mm' : '210mm'};
            height: ${isResi ? '150mm' : 'auto'};
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          body {
            width: ${isResi ? '100mm' : '210mm'};
            height: ${isResi ? '150mm' : 'auto'};
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          /* Sembunyikan SEMUA elemen lain */
          body > *:not(#printable-area) {
            display: none !important;
          }
          #printable-area {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: ${isResi ? '100mm' : '100%'} !important;
            height: ${isResi ? '150mm' : 'auto'} !important;
            max-height: ${isResi ? '150mm' : 'none'} !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          #printable-area,
          #printable-area * {
            visibility: visible !important;
            font-family: 'Poppins', sans-serif !important;
          }
          #printable-area svg,
          #printable-area svg * {
            visibility: visible !important;
            display: inline !important;
          }
          #printable-area > div {
            width: ${isResi ? '100mm' : '100%'} !important;
            height: ${isResi ? '150mm' : 'auto'} !important;
            max-height: ${isResi ? '150mm' : 'none'} !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }
          /* Resi inner container */
          #printable-area > div > div {
            height: ${isResi ? '150mm' : 'auto'} !important;
            max-height: ${isResi ? '150mm' : 'none'} !important;
            overflow: hidden !important;
          }
        }
      `}</style>
      <div style={{ width: isResi ? '100mm' : '100%', margin: '0 auto', background: 'white', boxSizing: 'border-box', padding: 0 }}>
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
          <div style={{
            fontSize: '2.5mm',
            height: '150mm',
            maxHeight: '150mm',
            width: '100mm',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            padding: '3mm',
            color: 'black',
            textTransform: 'uppercase',
            background: 'white',
            overflow: 'hidden',
            fontFamily: "'Poppins', sans-serif",
          }}>

            {/* === BARIS 1: INVOICE | HARI, TANGGAL | TOKO === */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1mm 0', fontSize: '2.2mm', fontWeight: '600' }}>
              <span style={{ fontWeight: '900' }}>{printData.invoice_id || printData.receipt_number}</span>
              <span style={{ margin: '0 1.5mm', opacity: 0.4 }}>|</span>
              <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span style={{ margin: '0 1.5mm', opacity: 0.4 }}>|</span>
              <span>TOKONEMBAHMO I 085700800278</span>
            </div>

            {/* === SEPARATOR === */}
            <div style={{ borderBottom: '0.4mm solid black' }} />

            {/* === BARIS 2: EXPEDISI + KODE REQUEST + BARCODE === */}
            <div style={{ textAlign: 'center', padding: '2mm 0' }}>
              <span style={{ fontSize: '2.5mm', fontWeight: '700' }}>{printData.expedition || 'KURIR'}</span>
              <div style={{ fontSize: '5.5mm', lineHeight: '1.1', wordBreak: 'break-all', fontWeight: '900', letterSpacing: '0.3mm', marginTop: '1mm' }}>
                {printData.request_code || printData.receipt_number}
              </div>
              <div style={{ marginTop: '1.5mm' }}>
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
            <div style={{ borderBottom: '0.4mm solid black' }} />

            {/* === BARIS 3: NAMA + NO HP + ALAMAT === */}
            <div style={{ padding: '1.5mm 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '3.2mm', lineHeight: '1.1', fontWeight: '900' }}>{printData.customer_name}</span>
                <span style={{ fontSize: '3.2mm', fontWeight: '900', flexShrink: 0, marginLeft: '2mm' }}>{printData.customer_phone}</span>
              </div>
              <div style={{ fontSize: '3mm', lineHeight: '1.3', marginTop: '1mm', fontWeight: '400' }}>
                {wrapText(printData.customer_address, 40).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>

            {/* === SEPARATOR === */}
            <div style={{ borderBottom: '0.4mm solid black' }} />

            {/* === BARIS 4: TABEL BARANG (flex-grow agar border samping terus ke bawah) === */}
            <div style={{ flexGrow: 1, paddingTop: '1mm' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.3mm solid black' }}>
                    <th style={{ textAlign: 'left', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '2.5mm' }}>NAMA BARANG</th>
                    <th style={{ textAlign: 'left', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '2.5mm' }}>KODE</th>
                    <th style={{ textAlign: 'center', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '2.5mm' }}>SATUAN</th>
                    <th style={{ textAlign: 'center', padding: '0.5mm 1mm', fontWeight: '900', fontSize: '2.5mm' }}>QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items_detail.map((i, idx) => (
                    <tr key={idx} style={{ borderBottom: '0.15mm solid #ccc' }}>
                      <td style={{ padding: '0.8mm 1mm', fontWeight: '700', fontSize: '3mm', lineHeight: '1.2' }}>
                        {i.name}
                        {i.note && <div style={{ fontSize: '2.2mm', fontWeight: '400', fontStyle: 'italic' }}>({i.note})</div>}
                      </td>
                      <td style={{ padding: '0.8mm 1mm', fontSize: '3mm' }}>{i.product_code}</td>
                      <td style={{ padding: '0.8mm 1mm', fontSize: '3mm', textAlign: 'center' }}>{i.satuan}</td>
                      <td style={{ padding: '0.8mm 1mm', fontSize: '3mm', textAlign: 'center', fontWeight: '900' }}>{i.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* === FOOTER === */}
            <div style={{ borderTop: '0.3mm solid black', paddingTop: '1mm', fontSize: '1.8mm', textAlign: 'center', opacity: 0.3, letterSpacing: '0.5mm', fontWeight: '700' }}>
              TOKONEMBAHMO SURABAYA
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintArea;
