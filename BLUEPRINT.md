# TOKONEMBAHMO — BLUEPRINT LENGKAP

> Dokumen ini berisi detail teknis lengkap seluruh project **moimutapiliet** agar AI atau developer baru dapat langsung memahami arsitektur, alur bisnis, dan hubungan antar file tanpa perlu membaca seluruh codebase.

---

## 1. PROJECT OVERVIEW

| Aspek | Detail |
|-------|--------|
| **Nama Brand** | TOKONEMBAHMO — "Gudangnya Mbako Enaq!" |
| **Package Name** | `sobatmbahmo` |
| **Tipe** | E-commerce SPA + Admin/Affiliator Dashboard |
| **Domain** | `tokonembahmo.com` / `moimutapiliet.pages.dev` |
| **Industri** | Produk tembakau/papir (rolling tobacco) Indonesia |
| **Tech Stack** | React 19.2 + Vite 7 + Tailwind CSS 3.4 + Supabase + Fonnte |
| **Hosting** | Cloudflare Pages (auto-deploy dari GitHub `main` branch) |
| **Repository** | `github.com/sobatmbahmo/moimutapiliet` |
| **Warna** | Dark (#042f2e / #022c22), Gold accent (#D4AF37 / #F4D03F) |
| **Layout** | Mobile-first (max-w-md untuk toko, wider untuk dashboard) |

### Dependencies Utama
```
@supabase/supabase-js ^2.94.1  — Database & Auth
react-barcode ^1.6.1            — Barcode untuk label resi
react-number-format ^5.4.4      — Format harga Rupiah
react-router-dom ^7.13.0        — Routing (halaman invoice)
fuse.js ^7.1.0                  — Fuzzy search alamat
lucide-react ^0.563.0           — Icon set
clsx + tailwind-merge            — CSS class utilities
```

---

## 2. ENVIRONMENT VARIABLES

File `.env` di root project (WAJIB ada):

| Variable | Fungsi | Wajib |
|----------|--------|-------|
| `VITE_SUPABASE_URL` | URL project Supabase | ✅ |
| `VITE_SUPABASE_KEY` | Supabase anon/public key | ✅ |
| `VITE_FONNTE_TOKEN` | Token API Fonnte untuk kirim WhatsApp | ✅ |
| `VITE_ADMIN_PHONE` | No HP admin untuk notifikasi pendaftaran | Opsional |

---

## 3. ARSITEKTUR FILE

```
src/
├── main.jsx                    # Entry point React 19
├── App.jsx                     # Router + auth gate (login → Dashboard, guest → Toko)
├── index.css                   # Tailwind imports
├── App.css                     # Custom styles
│
├── components/
│   ├── Header.jsx              # Navbar (menu, cart badge, referral info)
│   ├── HeroSection.jsx         # Banner + search input
│   ├── ProductCard.jsx         # Kartu produk (ADD / TIKTOK button)
│   ├── ProductModal.jsx        # Detail produk + varian picker + add to cart
│   ├── CartDrawer.jsx          # Keranjang + checkout + alamat + pembayaran
│   ├── AuthModal.jsx           # Login admin/affiliator + register affiliator
│   ├── FloatingChat.jsx        # Chatbot "Asisten Mbahmo"
│   ├── MitraModals.jsx         # Modal approve/delete/edit mitra
│   ├── ProductEditModal.jsx    # Edit produk (nama, harga, komisi, dll)
│   ├── PrintArea.jsx           # Cetak resi (100×150mm) + invoice (A4)
│   ├── Dashboard.jsx           # MASTER DASHBOARD (2248 baris, orchestrator utama)
│   └── dashboard/
│       ├── index.js                  # Re-export semua dashboard components
│       ├── AdminOrdersPanel.jsx      # Kanban board pesanan (4 kolom status)
│       ├── AdminProductsPanel.jsx    # Grid produk + batch edit TikTok
│       ├── AdminAffiliatorsPanel.jsx # Daftar affiliator + approve/edit/hapus
│       ├── AdminCustomersPanel.jsx   # CRUD pelanggan + search
│       ├── AffiliatorDashboard.jsx   # Dashboard mitra (saldo, produk, binding)
│       ├── AddCustomerModal.jsx      # Modal tambah/edit pelanggan
│       ├── EditAffiliatorModal.jsx   # Modal edit affiliator lengkap
│       ├── OfflineOrderForm.jsx      # Form order manual + WA message parser
│       ├── ResiNotificationModal.jsx # Input resi + kirim notif WA
│       └── ShippingModal.jsx         # Konfirmasi ongkir + edit harga item
│
├── context/
│   └── ReferralContext.jsx     # Referral/affiliate link tracking (sessionStorage)
│
├── lib/
│   ├── supabaseClient.js       # Inisialisasi Supabase client
│   ├── supabaseQueries.js      # Semua CRUD function ke database (648 baris)
│   ├── affiliateLogic.js       # Komisi, saldo, withdrawal, dashboard summary
│   ├── bindingLogic.js         # Binding customer ↔ affiliator (30 hari)
│   ├── addressParser.js        # Parser pesan WhatsApp → data pesanan
│   ├── indonesiaAddress.js     # Validasi alamat via emsifa API + Fuse.js
│   ├── fonntePush.js           # 14 fungsi notifikasi WhatsApp via Fonnte
│   ├── orderUtils.js           # Generate order number, status labels, transisi
│   ├── errorHandler.js         # Error handling, retry, timeout
│   └── validation.js           # Validasi input (nama, WA, email, password, alamat)
│
└── pages/
    └── InvoicePage.jsx         # Halaman invoice publik (/invoice/:orderNumber)
```

---

## 4. DATABASE SCHEMA (Supabase PostgreSQL)

### Tabel `products`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Auto-generated |
| `name` | VARCHAR(255) | Nama produk |
| `price` | DECIMAL(15,2) | Harga satuan (IDR) |
| `description` | TEXT | Deskripsi produk |
| `product_code` | VARCHAR(100) UNIQUE | Kode SKU (misal: GGSA, INL) |
| `image_url` | VARCHAR(500) | URL gambar |
| `default_link` | VARCHAR(500) | Link TikTok Shop default |
| `variants` | JSONB | Default '[]' |
| `berat_produk` | INT | Berat gram (default 200) |
| `product_weight` | INT | Berat gram (default 0) |
| `commission_rate` | DECIMAL(5,2) | Komisi affiliator % (default 10) |
| `sort_order` | INT | Urutan tampil |
| `created_at`, `updated_at` | TIMESTAMP | Timestamps |

### Tabel `admins`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `nama` | VARCHAR | Nama admin |
| `email` | VARCHAR UNIQUE | Email login |
| `password_hash` | VARCHAR | ⚠️ Disimpan plaintext (bukan hash) |
| `role` | VARCHAR | Default 'admin' |

### Tabel `users`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `nama` | VARCHAR | Nama customer |
| `nomor_wa` | VARCHAR UNIQUE | No WhatsApp (key lookup) |
| `email` | VARCHAR | Opsional |
| `alamat` | TEXT | Alamat lengkap |
| `created_at`, `updated_at` | TIMESTAMP | |

> **Catatan:** `users` dibuat saat checkout online. Berbeda dengan tabel `customers`.

### Tabel `customers`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `nama` | VARCHAR | Nama pelanggan |
| `nomor_wa` | VARCHAR UNIQUE | No WhatsApp |
| `alamat` | TEXT | Alamat |
| `created_at`, `updated_at` | TIMESTAMP | |

> **Catatan:** `customers` dikelola admin untuk order offline/manual. Bisa di-autocomplete di OfflineOrderForm.

### Tabel `orders`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `order_number` | VARCHAR | Format: `#YYYYMMDD-XXXXX` |
| `metode_bayar` | VARCHAR | 'transfer' atau 'cod' |
| `total_produk` | DECIMAL | Subtotal produk |
| `shipping_cost` | DECIMAL | Ongkir (diset admin) |
| `total_bayar` | DECIMAL | Total akhir |
| `alamat` | TEXT | Alamat pengiriman |
| `nomor_wa` | VARCHAR | No WA pembeli |
| `nama_pembeli` | VARCHAR | Nama (untuk offline order) |
| `catatan` | TEXT | Catatan pesanan |
| `is_offline` | BOOLEAN | Order manual admin |
| `affiliator_id` | UUID FK → affiliators | Nullable |
| `status` | VARCHAR | Status pesanan (lihat alur di bawah) |
| `resi` | VARCHAR | Nomor resi pengiriman |
| `courier_name` | VARCHAR | Nama kurir |
| `shipping_courier` | VARCHAR | Alternatif nama kurir |
| `invoice_id` | VARCHAR | Referensi invoice |
| `payment_due_date` | TIMESTAMP | Batas bayar |
| `completed_at` | TIMESTAMP | Tanggal selesai |
| `created_at`, `updated_at` | TIMESTAMP | |

### Tabel `order_items`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders ON DELETE CASCADE | |
| `product_id` | UUID FK → products ON DELETE RESTRICT | |
| `qty` | INT | Jumlah |
| `harga_satuan` | DECIMAL(15,2) | Harga per satuan |
| `subtotal` | DECIMAL(15,2) | qty × harga_satuan |
| `varian` | VARCHAR(100) | Kode varian (untuk Paket Komplit) |
| `satuan` | VARCHAR(50) | Satuan (default '100gr') |
| `created_at` | TIMESTAMP | |

### Tabel `affiliators`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `nama` | VARCHAR | Nama lengkap |
| `email` | VARCHAR UNIQUE | Email login |
| `nomor_wa` | VARCHAR | No WhatsApp |
| `password_hash` | VARCHAR | ⚠️ Plaintext password |
| `plain_password` | VARCHAR | Password disimpan lagi (untuk kirim ulang) |
| `status` | VARCHAR | 'pending', 'active', 'suspended', 'rejected' |
| `current_balance` | DECIMAL | Saldo komisi saat ini |
| `total_commission` | DECIMAL | Total komisi sepanjang waktu |
| `total_withdrawn` | DECIMAL | Total yang sudah dicairkan |
| `akun_tiktok` | JSONB | Array akun TikTok |
| `bank_name` | VARCHAR | Nama bank |
| `account_number` | VARCHAR | No rekening |
| `created_at`, `updated_at` | TIMESTAMP | |

### Tabel `affiliator_product_links`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `affiliator_id` | UUID FK → affiliators | |
| `product_id` | UUID FK → products | |
| `tiktok_link` | VARCHAR | Link TikTok custom affiliator |
| `created_at`, `updated_at` | TIMESTAMP | |

### Tabel `customer_binding`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `affiliator_id` | UUID FK → affiliators | |
| `start_date` | TIMESTAMP | Mulai binding |
| `end_date` | TIMESTAMP | Berakhir (30 hari dari start) |
| `status` | VARCHAR | 'active', 'expired', 'manual_cancel' |
| `created_at`, `updated_at` | TIMESTAMP | |

### Tabel `withdrawals`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `affiliator_id` | UUID FK → affiliators | |
| `nominal` | DECIMAL | Jumlah penarikan |
| `bank_name` | VARCHAR | Bank tujuan |
| `bank_account` | VARCHAR | No rekening |
| `account_holder` | VARCHAR | Nama pemilik rekening |
| `status` | VARCHAR | 'pending', 'approved', 'rejected' |
| `created_at` | TIMESTAMP | |

### Tabel `balance_transactions`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `affiliator_id` | UUID FK → affiliators | |
| `type` | VARCHAR | 'commission_earned', 'withdrawal_approved', 'withdrawal_rejected' |
| `amount` | DECIMAL | Nominal transaksi (+ atau -) |
| `reference_id` | UUID | FK ke order atau withdrawal |
| `created_at` | TIMESTAMP | |

### Relasi Antar Tabel
```
products ──────────────── order_items ──── orders ──── users
    │                         │                │
    │                         │                ├── customer_binding ── affiliators
    │                         │                │                          │
    └── affiliator_product_links ──────────────┘                          │
                                                                          ├── withdrawals
                                                                          └── balance_transactions
              admins (terpisah, login sendiri)
              customers (terpisah, untuk order offline)
```

---

## 5. ALUR STATUS PESANAN

```
WAITING_CONFIRMATION     ← Order baru masuk (online/offline)
       │
       ▼  Admin: Konfirmasi Ongkir (set ongkir + kurir via ShippingModal)
WAITING_PAYMENT          ← Invoice dikirim ke customer via Fonnte
       │
       ▼  Admin: Konfirmasi Pembayaran
PAID                     ← Pembayaran diterima
       │
       ▼  Admin: Print Resi (input kode request expedisi)
processing → SHIPPED     ← Label resi dicetak
       │
       ▼  Admin: Input Resi & Kirim (input no resi, kirim via Fonnte)
shipped                  ← Paket dalam perjalanan
       │
       ▼  Admin: Verifikasi Order Terkirim
delivered / COMPLETED    ← Selesai
```

### Mapping Status di Kanban Board (AdminOrdersPanel)
| Kolom Kanban | Status yang termasuk |
|--------------|---------------------|
| Menunggu Konfirmasi | `WAITING_CONFIRMATION` |
| Dalam Proses | `WAITING_PAYMENT`, `PAID`, `processing` |
| Sedang Dikirim | `shipped`, `SHIPPED` |
| Terkirim | `delivered`, `COMPLETED` |

### Transisi Status yang Valid (orderUtils.js)
```
WAITING_CONFIRMATION → WAITING_PAYMENT, CANCELLED
WAITING_PAYMENT      → PAID, CANCELLED
PAID                 → processing, CANCELLED
processing           → SHIPPED
SHIPPED/shipped      → delivered/COMPLETED
```

---

## 6. ALUR BISNIS

### 6.1. Checkout Online (Customer)
1. Customer browse produk → tambah ke Cart
2. Isi form: nama, no HP, alamat (pilih provinsi/kota/kecamatan via emsifa API)
3. Pilih metode bayar: Transfer Bank / COD
4. Klik Checkout:
   - `generateOrderNumber()` → format `#YYYYMMDD-XXXXX`
   - `createOrGetUser()` → cari/buat di tabel `users` by `nomor_wa`
   - `createOrder()` → insert ke `orders` (status: `WAITING_CONFIRMATION`)
   - `addOrderItems()` → insert ke `order_items`
   - Buka WhatsApp ke admin (`6285700800278`) dengan ringkasan pesanan
5. Jika ada referral (`?ref=XXXX`) → `affiliator_id` disimpan di order

### 6.2. Order Offline/Manual (Admin)
1. Admin → tab Orders → "Tambah Order Manual"
2. Bisa paste pesan WhatsApp → auto-parse nama/telp/alamat (`parseWAMessage()`)
3. Atau pilih pelanggan existing dari tabel `customers`
4. Pilih produk, qty, varian, satuan → set kurir & ongkir
5. Submit → buat user, order, order_items → kirim konfirmasi WA via Fonnte

### 6.3. Alur Affiliator
1. Daftar via AuthModal (status: `pending`)
2. Admin approve → Fonnte kirim kredensial (email + password plaintext)
3. Affiliator login → dashboard:
   - Lihat saldo, penghasilan, jumlah pelanggan, pesanan
   - Set link TikTok per produk
   - Generate referral link: `{origin}?ref={affiliatorId}&product={productId}`
   - Share ke customer
4. Customer klik referral link → `ref` disimpan di `sessionStorage`
5. Customer order → `affiliator_id` tersimpan di order
6. Customer "bound" ke affiliator selama **30 hari** (tabel `customer_binding`)
7. Order COMPLETED → komisi dihitung (default 5%) → ditambah ke `current_balance`
8. Affiliator request withdrawal (min Rp50.000) → admin approve → saldo dikurangi

### 6.4. Pembayaran
- **Transfer Bank:**
  - BRI: `313501022627531`
  - BCA: `3240615851`
  - SeaBank: `901504027451`
  - a/n **AGUS MUNIB ABDULLAH**
- **COD:** Bayar saat barang diterima
- Halaman invoice (`/invoice/:orderNumber`) → customer klik "SETUJU & LANJUTKAN" → status berubah

### 6.5. Print Resi
- Ukuran kertas: **100mm × 150mm** (thermal label)
- Format barcode: **Code 128** (kompatibel scanner J&T/kurir)
- Layout:
  ```
  [NO INVOICE]                    [TANGGAL]
  ─────────────────────────────────
           [EXPEDISI/KURIR]
       KODE REQUEST EXPEDISI
         ║║║║ BARCODE ║║║║
  ─────────────────────────────────
  NAMA (bold 12px)         NO HP (13px)
  ALAMAT (12px, wrap 40 char)
  ─────────────────────────────────
  NAMA BARANG | KODE | SATUAN | QTY
  ─────────────────────────────────
  Produk A    | KD01 | 100gr  |  2
  ...
  ```

---

## 7. INTEGRASI EXTERNAL

| Service | Fungsi | Config |
|---------|--------|--------|
| **Supabase** | Database PostgreSQL + Auth listener | `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` |
| **Fonnte** | Kirim pesan WhatsApp (notifikasi, invoice, resi) | `VITE_FONNTE_TOKEN`, endpoint: `https://api.fonnte.com/send` |
| **emsifa API** | Data alamat Indonesia (provinsi/kota/kecamatan) | `https://www.emsifa.com/api-wilayah-indonesia/api/`, tanpa API key |
| **Cloudflare Pages** | Hosting & deploy otomatis dari GitHub | Auto-deploy branch `main` |

---

## 8. DETAIL PER FILE

### `src/App.jsx` (273 baris)
- **Routing:** `/invoice/:orderNumber` → InvoicePage, `/*` → toko/dashboard
- **Auth gate:** Jika `user` ada → render `<Dashboard>`, jika tidak → render toko
- **Fetch produk** dari Supabase, mapping kolom DB ke nama frontend
- Auto-buka product modal jika URL ada `?product=ID`

### `src/components/Dashboard.jsx` (2248 baris) — FILE TERBESAR
- **Orchestrator utama** untuk semua fitur admin/affiliator
- **Deteksi role:** `user.type === 'admin'` atau `user.type === 'affiliator'`
- **Tab admin:** Orders, Products, Affiliators, Pelanggan
- **State utama:** orders, products, affiliators, customers, selectedOrder, printData, printType
- **Handler penting:**
  - `handleConfirmOrder` — approve pesanan
  - `handleDeleteOrder` — hapus pesanan
  - `handleSubmitShipping` — simpan ongkir, kirim invoice WA
  - `handleConfirmPayment` — konfirmasi pembayaran
  - `handleSubmitPrintResi` — cetak label resi (barcode + data)
  - `handleSendResiNotification` — kirim resi via WA
  - `handleConfirmDelivery` — verifikasi terkirim
  - `handleApproveAffiliator` — approve mitra + kirim kredensial
  - `handleSaveProduct` — simpan edit produk
  - `handleSubmitOfflineOrder` — order manual

### `src/components/CartDrawer.jsx` (~270 baris)
- **Checkout flow** lengkap (lihat Alur 6.1)
- **emsifa API** untuk dropdown provinsi/kota/kecamatan
- Buka WhatsApp ke admin setelah checkout

### `src/components/AuthModal.jsx` (624 baris)
- **3 flow:** Login Admin, Login Affiliator, Register Affiliator
- Admin login: query `admins` table, password **plaintext** comparison
- Affiliator login: query `affiliators` table, cek `status === 'active'`
- Register: insert ke `affiliators` (status: `pending`), kirim notif admin

### `src/components/PrintArea.jsx` (~200 baris)
- **2 tipe cetak:** `resi` (100×150mm thermal) dan `invoice` (A4)
- CSS `@media print` dengan `visibility` trick untuk isolasi area cetak
- Barcode: `react-barcode` (Code 128)
- Force 1 halaman: height fixed `144mm`, overflow hidden

### `src/components/dashboard/OfflineOrderForm.jsx` (573 baris)
- **WA Message Parser:** paste pesan WA → extract nama, telp, alamat
- Autocomplete pelanggan dari tabel `customers`
- Multi-item form dengan picker varian

### `src/components/dashboard/ShippingModal.jsx` (136 baris)
- Set ongkir + pilih kurir
- Edit harga item (diskon per order)
- Kurir tersedia: J&T, WAHANA, ID Express, Indah Cargo, JNE, Tiki, Pos Indonesia, Grab Express, GoSend

### `src/lib/supabaseQueries.js` (648 baris)
- **Semua CRUD function:**
  - Users: `createOrGetUser`
  - Orders: `getUserOrders`, `createOrder`, `addOrderItems`, `updateOrderStatus`, `deleteOrder`
  - Affiliators: `getAffiliatorByEmail`, `createAffiliator`, `updateAffiliator`, `deleteAffiliator`
  - Withdrawals: `createWithdrawal`, `getAffiliatorWithdrawals`
  - Products: `updateProduct`, `reorderProduct`
  - Customers: `getAllCustomers`, `searchCustomers`, `upsertCustomer`, `deleteCustomer`
  - Links: `setAffiliatorProductLink`, `getAffiliatorProductLink`
  - Binding: `createBinding` (30 hari), `getActiveBinding`

### `src/lib/affiliateLogic.js` (397 baris)
- `calculateCommission(orderTotal, rate)` — hitung komisi (default 5%)
- `addCommissionToBalance` — update saldo + log ke `balance_transactions`
- `deductBalanceForWithdrawal` — cek kecukupan + kurangi saldo
- `validateWithdrawalRequest` — min Rp50.000
- `getAffiliatorDashboardSummary` — saldo, earnings, customer count, order count

### `src/lib/fonntePush.js` (443 baris)
14 fungsi notifikasi WhatsApp:
| # | Fungsi | Dipakai di |
|---|--------|-----------|
| 1 | `sendOrderConfirmation` | Dashboard.jsx |
| 2 | `sendInvoice` | Tersedia (belum dipanggil) |
| 3 | `sendResiNotification` | Dashboard.jsx |
| 4 | `sendPaymentConfirmation` | Tersedia |
| 5 | `sendWithdrawalApprovalNotification` | Tersedia |
| 6 | `sendWithdrawalRejectionNotification` | Tersedia |
| 7 | `sendAffiliatorAssignmentNotification` | Tersedia |
| 8 | `sendBindingExpiryReminder` | Tersedia |
| 9 | `sendOrderCancellationNotification` | Tersedia |
| 10 | `sendAdminNotification` | AuthModal.jsx |
| 11 | `sendNewOrderAlertToAdmin` | Tersedia |
| 12 | `sendAffiliatorApprovalNotification` | Dashboard.jsx |
| 13 | `testFontneConnection` | Tersedia (test) |
| 14 | `sendInvoiceNotification` | Dashboard.jsx |

### `src/lib/orderUtils.js` (202 baris)
- `generateOrderNumber()` → `#YYYYMMDD-XXXXX`
- `getOrderStatusLabel(status)` → label Indonesia
- `getValidNextStatuses(currentStatus)` → transisi yang valid
- `formatOrderForWA(orderId)` → pesan WA lengkap

### `src/lib/validation.js` (248 baris)
- `validateNama` — 2-100 karakter
- `validateNomorWA` — format Indonesia (08xxx atau +628xxx)
- `validatePassword` — min 6 karakter, huruf kecil + angka saja
- `validateAlamat` — 5-500 karakter, blacklist `<>` saja
- `validateForm(data, schema)` — batch validator

### `src/lib/addressParser.js` (373 baris)
- `parseWAMessage(text)` — parse pesan WhatsApp → {nama, phone, alamat, kecamatan, ...}
- `detectPaymentMethod(text)` → 'transfer' atau 'cod'
- `normalizeRTRW(text)` → normalisasi RT/RW

### `src/lib/errorHandler.js` (250 baris)
- `AppError` class dengan code + userMessage
- `handleError(error)` → pesan error Indonesia yang user-friendly
- `safeApiCall(fn, context)` → wrapper error handling
- `retryWithBackoff(fn, maxRetries, delay)` → retry eksponensial

### `src/context/ReferralContext.jsx` (107 baris)
- Extract `?ref=XXXX` dari URL → simpan di `sessionStorage`
- Provide: `referralData`, `hasReferral`, `getShareLink`

### `src/pages/InvoicePage.jsx` (~230 baris)
- Route: `/invoice/:orderNumber`
- Load order dari Supabase (join users, order_items, products)
- Tampilkan invoice lengkap
- Tombol "SETUJU & LANJUTKAN" → ubah status ke `WAITING_PACKING`

---

## 9. ROLE & AUTH SYSTEM

| Role | Login | Tabel | Akses |
|------|-------|-------|-------|
| **Admin** | Email + password → `admins` | `admins` | Full: kelola order, produk, affiliator, pelanggan, cetak resi/invoice |
| **Affiliator** | Email + password → `affiliators` | `affiliators` | Dashboard: saldo, link TikTok, share referral, withdrawal, lihat binding |
| **Customer** | Tanpa login | `users`/`customers` | Browse, cart, checkout via WA, approve invoice via URL |

> ⚠️ **Auth BUKAN menggunakan Supabase Auth/JWT.** Login admin/affiliator dilakukan dengan query tabel langsung + perbandingan password plaintext. Session disimpan di React state.

### Status Affiliator
```
pending → active (disetujui admin) → suspended / rejected
```

---

## 10. KONSTANTA & KONFIGURASI PENTING

| Konstanta | Nilai | Lokasi |
|-----------|-------|--------|
| Admin WhatsApp | `6285700800278` | CartDrawer.jsx, FloatingChat.jsx |
| Bank BRI | `313501022627531` | fonntePush.js, PrintArea.jsx |
| Bank BCA | `3240615851` | fonntePush.js, PrintArea.jsx |
| Bank SeaBank | `901504027451` | fonntePush.js, PrintArea.jsx |
| Nama Rekening | `AGUS MUNIB ABDULLAH` | fonntePush.js, PrintArea.jsx |
| Komisi default | 5% | affiliateLogic.js |
| Durasi binding | 30 hari (kode) | supabaseQueries.js |
| Min withdrawal | Rp50.000 | affiliateLogic.js |
| Varian produk | `GGSA, INL, RHS, JRM, BB, MLB, SMP, DJS, PLN, APLN, KPLN` | ProductModal.jsx, OfflineOrderForm.jsx |
| Berat default | 200g | App.jsx |
| Aturan password | Huruf kecil a-z + angka 0-9, min 6 karakter | validation.js |
| Ukuran label resi | 100mm × 150mm | PrintArea.jsx |
| Format no order | `#YYYYMMDD-XXXXX` | orderUtils.js |
| Kurir tersedia | J&T, WAHANA, ID Express, Indah Cargo, JNE, Tiki, Pos Indonesia, Grab Express, GoSend | ShippingModal.jsx |
| Format barcode | Code 128 | PrintArea.jsx |
| Margin cetak resi | 3mm atas/bawah, 4mm kiri/kanan | PrintArea.jsx |

---

## 11. CATATAN KEAMANAN

> ⚠️ Hal-hal berikut perlu diperhatikan:

1. **Password plaintext** — `admins.password_hash` dan `affiliators.password_hash` menyimpan password sebagai plaintext, bukan hash
2. **API key di frontend** — `VITE_FONNTE_TOKEN` ter-expose di browser bundle (karena Vite prefix `VITE_`)
3. **No rekening & no HP admin** hardcoded di source code frontend
4. **Supabase anon key** di frontend — bergantung sepenuhnya pada Row Level Security (RLS)
5. **Tidak ada rate limiting** pada login — bisa brute force

---

## 12. TROUBLESHOOTING GUIDE

### Build error / blank page
- Cek `.env` ada `VITE_SUPABASE_URL` dan `VITE_SUPABASE_KEY`
- Jalankan `npm install` lalu `npm run build`
- Cek console browser untuk error

### WhatsApp notifikasi tidak terkirim
- Cek `VITE_FONNTE_TOKEN` di `.env`
- Cek saldo Fonnte (berbayar)
- Cek format nomor: harus `628xxx` (bukan `08xxx`)
- Lihat console: "Fonnte API error"

### Print resi lebih dari 1 halaman
- PrintArea.jsx menggunakan `height: 144mm` + `overflow: hidden`
- Jika masih bocor, cek apakah ada elemen dengan `visibility` atau `display` yang override

### Barcode tidak muncul saat print
- SVG barcode butuh CSS khusus: `#printable-area svg * { visibility: visible !important }`
- Sudah ditangani di PrintArea.jsx

### Data pesanan kosong saat print
- PrintArea menggunakan `visibility: hidden/visible` (bukan `display: none`)
- Pastikan `printData` dan `printType` ter-set sebelum `window.print()`

### Alamat tidak tervalidasi
- `validateAlamat` hanya blacklist `<>` (sangat permisif)
- emsifa API gratis, bisa down — ada fallback manual input

### Login gagal
- Admin: cek tabel `admins` di Supabase, email & password case-sensitive
- Affiliator: cek status harus `active`, bukan `pending`

### Order tidak muncul di dashboard
- Admin query: `.select('*, users(*), order_items(*, products(*)'))`
- Cek RLS policy di Supabase: semua tabel harus `USING (true) WITH CHECK (true)`

### Cloudflare deploy gagal
- Pastikan `vite.config.js` base: `'/'`
- Cek GitHub push ke branch `main`
- Cloudflare Pages auto-detect Vite, build command: `npm run build`, output: `dist`

---

## 13. DEPLOY CHECKLIST

1. ✅ Pastikan `.env` lengkap (SUPABASE_URL, SUPABASE_KEY, FONNTE_TOKEN)
2. ✅ `npm run build` berhasil tanpa error
3. ✅ Push ke branch `main` di GitHub
4. ✅ Cloudflare Pages otomatis deploy
5. ✅ Cek `moimutapiliet.pages.dev` bisa diakses
6. ✅ Test checkout → cek WhatsApp terkirim
7. ✅ Test print resi → cek 1 halaman, barcode muncul
8. ✅ Test login admin & affiliator

---

*Dokumen ini di-generate pada 18 Februari 2026. Update berkala saat ada perubahan major.*

---

## 14. CHANGELOG

### 20 Februari 2026
- **Fix: Affiliator Register** — `createAffiliator()` dipanggil dengan 7 parameter terpisah, seharusnya 1 object `{ nama, nomor_wa, email, password, account_number, bank_name }`. Pendaftaran affiliator sebelumnya selalu gagal karena semua field menjadi `undefined`.
- **Fix: Affiliator Login** — Field `affiliator.balance` tidak ada di database (kolom sebenarnya `current_balance`). Setelah login, saldo mitra selalu tampil 0/undefined.
- **Redesign: Order Manual (OfflineOrderForm.jsx)** — Layout diubah ke 2 kolom profesional untuk desktop: kolom kiri (2/5) Data Customer + Pengiriman & Pembayaran, kolom kanan (3/5) Produk Dipesan + Ringkasan Total. Tetap responsif single-column di mobile. Ditambahkan section icons (User, Truck, Package, CreditCard), tabel produk dengan header kolom, dan summary card real-time.
- **UX: Auto-select ongkir** — Input ongkir di order manual otomatis ter-select saat diklik (onFocus select), admin tinggal ketik angka baru.

### 19 Februari 2026
- **Style: Font Bebas Neue** — Nama pelanggan dan no HP di label resi menggunakan font Bebas Neue Bold (Google Fonts), elemen lain tetap Poppins.
- **Fix: Print Resi multi-halaman** — Resi selalu mencetak 3-4 halaman. Root cause: `visibility: hidden` pada `body *` menyembunyikan elemen tapi tetap menempati ruang DOM. Fix: collapse `#root` dengan `height: 0; overflow: hidden; visibility: hidden`, lalu `#printable-area` menggunakan `position: fixed` di atas semua konten. CSS print juga menambahkan `page-break-inside: avoid` dan constraint `max-height: 150mm` di setiap level container.
- **Style: Print Resi Header** — Header resi diformat menjadi satu baris terpusat: `INVOICE | Hari, Tanggal | TOKONEMBAHMO I 085700800278`.
- **Style: Print Resi Font Poppins** — Seluruh label resi menggunakan font Poppins (Google Fonts @import).

### 18 Februari 2026
- **PWA Implementation** — Installed `vite-plugin-pwa`, configured manifest dengan nama "Jamaah Lintingiyah", service worker auto-update, created `InstallPrompt.jsx` custom install banner dengan branding, created SVG/PNG icons.
- **In-app Browser Overlay** — Deteksi WebView (TikTok, IG, FB, dll) di `index.html`. Menampilkan overlay dengan instruksi "Cara 1: Titik tiga → Buka di Browser" dan "Cara 2: Salin Link".
- **Dashboard Mobile Redesign** — Layout admin dashboard diubah ke responsive grid, professional styling.
