# 🏗️ TOKONEMBAHMO BLUEPRINT
## Complete System Documentation & Data Wiring
**Version:** 2.0.0  
**Last Updated:** February 17, 2026  
**Tech Stack:** React 19 + Vite 7 + Supabase + Tailwind CSS

---

## 📋 TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [File Structure](#file-structure)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Component Architecture](#component-architecture)
8. [Data Flow & State Management](#data-flow--state-management)
9. [Core Business Logic](#core-business-logic)
10. [API & External Services](#api--external-services)
11. [Key Features](#key-features)
12. [Environment Variables](#environment-variables)
13. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🎯 SYSTEM OVERVIEW

**TOKONEMBAHMO** adalah platform e-commerce B2C untuk produk makanan ringan dengan sistem afiliasi 90 hari. Platform ini mendukung:
- **Toko Online** (Storefront untuk customer)
- **Admin Dashboard** (Manajemen order, produk, affiliator)
- **Affiliator Dashboard** (Tracking komisi, customer binding, withdrawal)

### Core Business Model
```
┌─────────────┐     Order via Link     ┌─────────────┐
│  Customer   │ ──────────────────────→│    Toko     │
└─────────────┘                        └─────────────┘
       ↓ (90-day binding)                     ↓
┌─────────────┐     Gets Commission    ┌─────────────┐
│  Affiliator │ ←──────────────────────│ Order Done  │
└─────────────┘                        └─────────────┘
```

### Order Workflow (4 Columns)
```
WAITING_CONFIRMATION → PROCESSING → SHIPPED → COMPLETED
                    ↓
                CANCELLED
```

---

## 🛠️ TECH STACK & DEPENDENCIES

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.0 | UI Framework |
| Vite | 7.3.1 | Build Tool |
| React Router DOM | 7.13.0 | Routing |
| Tailwind CSS | 3.4.17 | Styling |
| Lucide React | 0.563.0 | Icon Library |
| Fuse.js | 7.1.0 | Fuzzy Search (Address Parser) |
| react-number-format | 5.4.4 | Number Formatting |
| clsx + tailwind-merge | - | Class Utilities |

### Backend/Database
| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL Database + Auth + REST API |
| Fonnte API | WhatsApp Notification Gateway |
| Emsifa API | Indonesian Address Validation |

### Build Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 📁 FILE STRUCTURE

```
moimutapiliet/
├── .env                          # Environment variables (GITIGNORED)
├── .env.example                  # Environment template
├── package.json                  # Dependencies & scripts
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
├── index.html                    # Entry HTML
├── NEW_DATABASE_SCHEMA.sql       # Current database schema
│
├── public/                       # Static assets
│   └── logo192.png               # App logo
│
├── dist/                         # Production build output
│
└── src/
    ├── main.jsx                  # React entry point
    ├── App.jsx                   # Main App component + routing
    ├── App.css                   # Global styles (minimal)
    ├── index.css                 # Tailwind imports
    │
    ├── assets/                   # Images & media
    │   ├── new-icon.svg
    │   └── new-logo.svg
    │
    ├── context/
    │   └── ReferralContext.jsx   # Referral code context provider
    │
    ├── lib/                      # Utility modules
    │   ├── supabaseClient.js     # Supabase client initialization
    │   ├── supabaseQueries.js    # All database CRUD operations
    │   ├── affiliateLogic.js     # Commission calculation & balance
    │   ├── bindingLogic.js       # 90-day customer binding system
    │   ├── orderUtils.js         # Order number generation & formatting
    │   ├── fonntePush.js         # WhatsApp notifications via Fonnte
    │   ├── validation.js         # Input validation & sanitization
    │   ├── errorHandler.js       # Error handling utilities
    │   ├── addressParser.js      # WA message parser
    │   └── indonesiaAddress.js   # Emsifa API integration
    │
    ├── pages/
    │   └── InvoicePage.jsx       # Invoice page (printable)
    │
    └── components/
        ├── App.jsx               # NOT USED (duplicate)
        ├── Header.jsx            # Top navigation bar
        ├── HeroSection.jsx       # Landing page hero
        ├── ProductCard.jsx       # Product card component
        ├── ProductModal.jsx      # Product detail modal (add to cart)
        ├── ProductEditModal.jsx  # Admin product edit modal
        ├── CartDrawer.jsx        # Shopping cart drawer
        ├── AuthModal.jsx         # Login/Register modal
        ├── FloatingChat.jsx      # WhatsApp floating button
        ├── MitraModals.jsx       # Partner information modals
        ├── PrintArea.jsx         # Hidden print area for labels
        ├── Dashboard.jsx         # Main dashboard controller
        │
        └── dashboard/            # Dashboard sub-components
            ├── index.js          # Barrel exports
            ├── AddCustomerModal.jsx
            ├── AdminOrdersPanel.jsx
            ├── AdminProductsPanel.jsx
            ├── AdminAffiliatorsPanel.jsx
            ├── OfflineOrderForm.jsx
            ├── ShippingModal.jsx
            ├── ResiNotificationModal.jsx
            ├── EditAffiliatorModal.jsx
            └── AffiliatorDashboard.jsx
```

---

## 🗄️ DATABASE SCHEMA

### Tables Overview
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     products    │     │     admins      │     │   affiliators   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ name            │     │ nama            │     │ nama            │
│ price           │     │ email (UQ)      │     │ email (UQ)      │
│ description     │     │ password_hash   │     │ nomor_wa (UQ)   │
│ image_url       │     │ nomor_wa        │     │ password_hash   │
│ product_code    │     │ role            │     │ status          │
│ commission_rate │     │ is_active       │     │ current_balance │
│ sort_order      │     └─────────────────┘     │ total_commission│
│ berat_produk    │                             │ bank_name       │
└─────────────────┘                             │ account_number  │
                                                └─────────────────┘
        │                                               │
        │ product_id (FK)                               │ affiliator_id (FK)
        ▼                                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   order_items   │────▶│     orders      │────▶│      users      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ order_id (FK)   │     │ order_number    │     │ nama            │
│ product_id (FK) │     │ user_id (FK)    │     │ nomor_wa (UQ)   │
│ qty             │     │ affiliator_id   │     │ email           │
│ varian          │     │ status          │     │ alamat          │
│ satuan          │     │ metode_bayar    │     │ binding_aff_id  │
│ harga_satuan    │     │ total_produk    │     │ binding_start   │
│ subtotal        │     │ shipping_cost   │     │ binding_end     │
└─────────────────┘     │ total_bayar     │     └─────────────────┘
                        │ alamat          │
                        │ nomor_wa        │             │
                        │ resi            │             │ user_id (FK)
                        │ shipping_courier│             ▼
                        │ is_offline      │     ┌─────────────────┐
                        └─────────────────┘     │customer_binding │
                                                ├─────────────────┤
                                                │ id (PK)         │
┌─────────────────┐     ┌─────────────────┐     │ user_id (FK)    │
│    customers    │     │   withdrawals   │     │ affiliator_id   │
├─────────────────┤     ├─────────────────┤     │ start_date      │
│ id (PK)         │     │ id (PK)         │     │ end_date        │
│ nama            │     │ affiliator_id   │     │ status          │
│ nomor_wa (UQ)   │     │ nominal         │     └─────────────────┘
│ alamat          │     │ status          │
└─────────────────┘     │ bank_name       │
                        │ bank_account    │
                        │ bukti_transfer  │
                        └─────────────────┘

┌─────────────────────────┐     ┌─────────────────┐
│ affiliator_product_links│     │  activity_logs  │
├─────────────────────────┤     ├─────────────────┤
│ id (PK)                 │     │ id (PK)         │
│ affiliator_id (FK)      │     │ admin_id (FK)   │
│ product_id (FK)         │     │ action          │
│ tiktok_link             │     │ target_type     │
│ created_at              │     │ details (JSONB) │
└─────────────────────────┘     └─────────────────┘
```

### Order Status Values
| Status | Description | Next Status |
|--------|-------------|-------------|
| `WAITING_CONFIRMATION` | Order baru, menunggu admin | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | Order dikonfirmasi, sedang diproses | `SHIPPED` |
| `SHIPPED` | Sudah dikirim (ada resi) | `COMPLETED` |
| `COMPLETED` | Order selesai | - |
| `CANCELLED` | Dibatalkan | - |

### Affiliator Status Values
| Status | Description |
|--------|-------------|
| `pending` | Menunggu approval admin |
| `active` | Aktif, bisa dapat komisi |
| `inactive` | Non-aktif (banned/paused) |

---

## 🔐 AUTHENTICATION FLOW

### Admin Login
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AuthModal  │────▶│   admins    │────▶│  Dashboard  │
│ (email+pwd) │     │   table     │     │ (type=admin)│
└─────────────┘     └─────────────┘     └─────────────┘
```

### Affiliator Login
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AuthModal  │────▶│ affiliators │────▶│  Dashboard  │
│ (email+pwd) │     │   table     │     │(type=affil) │
└─────────────┘     └─────────────┘     └─────────────┘
         ↓
   (If status != 'active')
         ↓
   ❌ Login Rejected
```

### Affiliator Registration
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. User fills form (nama, email, wa, bank info)            │
│  2. Accept Terms & Conditions                               │
│  3. Insert to affiliators (status='pending')                │
│  4. Send notification to Admin via Fonnte                   │
│  5. Admin approves → status='active'                        │
│  6. Affiliator can now login                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### User State in App.jsx
```javascript
const [user, setUser] = useState(null);

// After login success:
setUser({
  id: 'uuid',
  nama: 'Name',
  email: 'email@example.com',
  type: 'admin' | 'affiliator',
  role: 'admin' | 'affiliator',
  // ... other fields
});
```

---

## 👥 USER ROLES & PERMISSIONS

### Admin
| Feature | Access |
|---------|--------|
| View all orders | ✅ |
| Create manual order | ✅ |
| Edit/Delete orders | ✅ |
| Update order status | ✅ |
| Input resi & shipping | ✅ |
| Manage products | ✅ |
| Manage affiliators | ✅ |
| Approve affiliators | ✅ |
| Approve withdrawals | ✅ |
| View all customers | ✅ |
| Send WA notifications | ✅ |

### Affiliator
| Feature | Access |
|---------|--------|
| View own dashboard | ✅ |
| View bound customers | ✅ |
| View own orders (from bound customers) | ✅ |
| Request withdrawal | ✅ |
| View withdrawal history | ✅ |
| Set TikTok product links | ✅ |
| Generate referral link | ✅ |

### Customer (Public)
| Feature | Access |
|---------|--------|
| Browse products | ✅ |
| Add to cart | ✅ |
| Checkout (creates user + order) | ✅ |
| View invoice page | ✅ |

---

## 🧩 COMPONENT ARCHITECTURE

### Component Hierarchy
```
App.jsx
├── Header.jsx
├── HeroSection.jsx
├── ProductCard.jsx (multiple)
│   └── ProductModal.jsx
├── CartDrawer.jsx
├── AuthModal.jsx
├── FloatingChat.jsx
│
├── Dashboard.jsx (when logged in)
│   │
│   ├── [Admin View]
│   │   ├── AdminOrdersPanel.jsx
│   │   │   ├── ShippingModal.jsx
│   │   │   ├── ResiNotificationModal.jsx
│   │   │   └── PrintArea.jsx
│   │   ├── AdminProductsPanel.jsx
│   │   │   └── ProductEditModal.jsx
│   │   ├── AdminAffiliatorsPanel.jsx
│   │   │   └── EditAffiliatorModal.jsx
│   │   └── OfflineOrderForm.jsx
│   │       └── AddCustomerModal.jsx
│   │
│   └── [Affiliator View]
│       └── AffiliatorDashboard.jsx
│
└── Routes
    └── /invoice/:orderNumber → InvoicePage.jsx
```

### Key Component Props

**Dashboard.jsx**
```jsx
<Dashboard 
  user={user}           // Current logged-in user object
  onLogout={handleLogout}
/>
```

**AdminOrdersPanel.jsx**
```jsx
<AdminOrdersPanel
  orders={orders}
  products={products}
  loading={loading}
  formatRupiah={formatRupiah}
  onRefresh={loadOrders}
  onUpdateStatus={handleUpdateStatus}
  onDelete={handleDeleteOrder}
  onOpenShipping={handleOpenShipping}
  onPrintLabel={handlePrintLabel}
  onPrintResi={handlePrintResi}
  onSendResiNotif={handleSendResiNotif}
/>
```

**OfflineOrderForm.jsx**
```jsx
<OfflineOrderForm
  isOpen={showOfflineOrderForm}
  onClose={() => setShowOfflineOrderForm(false)}
  offlineOrder={offlineOrder}
  setOfflineOrder={setOfflineOrder}
  products={products}
  customers={customers}
  loading={loading}
  onSubmit={handleSubmitOfflineOrder}
  onAddCustomer={() => setShowAddCustomerModal(true)}
  onEditCustomer={handleEditCustomer}
  formatRupiah={formatRupiah}
/>
```

---

## 🔄 DATA FLOW & STATE MANAGEMENT

### State Location (Dashboard.jsx)
```javascript
// Data States
const [orders, setOrders] = useState([]);
const [customers, setCustomers] = useState([]);
const [products, setProducts] = useState([]);
const [affiliators, setAffiliators] = useState([]);
const [withdrawals, setWithdrawals] = useState([]);
const [bindings, setBindings] = useState([]);
const [summary, setSummary] = useState(null);

// UI States
const [loading, setLoading] = useState(false);
const [activeTab, setActiveTab] = useState('orders');
const [successMsg, setSuccessMsg] = useState('');
const [errorMsg, setErrorMsg] = useState('');

// Modal States
const [showOfflineOrderForm, setShowOfflineOrderForm] = useState(false);
const [showShippingModal, setShowShippingModal] = useState(false);
const [selectedOrder, setSelectedOrder] = useState(null);
// ... etc
```

### Data Loading Flow
```
Dashboard mounted
       │
       ├── isAdmin? ─────────────────────────────────┐
       │      ↓                                       │
       │   loadAdminData()                            │
       │      ├── supabase.from('orders')...          │
       │      ├── supabase.from('products')...        │
       │      ├── supabase.from('affiliators')...     │
       │      └── getAllCustomers()                   │
       │                                              │
       └── isAffiliator? ────────────────────────────┤
              ↓                                       │
           loadAffiliatorData()                       │
              ├── getUserOrders(affiliatorId)         │
              ├── getAffiliatorBindings(affiliatorId) │
              ├── getAffiliatorWithdrawals(id)        │
              └── getAffiliatorDashboardSummary()     │
                                                      │
       ←──────────────────────────────────────────────┘
```

### Order Creation Flow (Offline Manual)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Admin opens OfflineOrderForm                                │
│  2. (Optional) Parse WA message → auto-fill fields              │
│  3. Fill customer info (name, phone, address)                   │
│  4. Select products + quantities + prices                       │
│  5. Set shipping cost & courier                                 │
│  6. Submit:                                                     │
│     a. createOrGetUser() → users table                          │
│     b. upsertCustomer() → customers table                       │
│     c. generateOrderNumber() → #YYYYMMDD-XXXXX                  │
│     d. createOrder() → orders table                             │
│     e. addOrderItems() → order_items table                      │
│     f. sendOrderConfirmation() → Fonnte API                     │
│  7. Refresh orders list                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Order Status Update Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  WAITING_CONFIRMATION → PROCESSING                              │
│     - updateOrderStatus(orderId, 'PROCESSING')                  │
│                                                                 │
│  PROCESSING → SHIPPED                                           │
│     - Open ShippingModal                                        │
│     - Input: resi, shipping_cost, courier                       │
│     - updateOrderStatus(orderId, 'SHIPPED', {                   │
│         resi, shipping_cost, shipping_courier                   │
│       })                                                        │
│     - sendResiNotification() → Fonnte API                       │
│                                                                 │
│  SHIPPED → COMPLETED                                            │
│     - updateOrderStatus(orderId, 'COMPLETED')                   │
│     - If has affiliator:                                        │
│       - Calculate commission (total * rate%)                    │
│       - addCommissionToBalance(affiliatorId, commission)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ CORE BUSINESS LOGIC

### 1. Customer-Affiliator Binding (90 Days)

**Location:** `lib/bindingLogic.js`

```javascript
// When customer orders via affiliator link:
1. Check if customer has active binding
   - If no → create new binding (90 days)
   - If yes but expired → create new binding
   - If yes and active → keep existing binding

// Binding stored in:
customer_binding table:
  - user_id (customer)
  - affiliator_id
  - start_date
  - end_date (start + 90 days)
  - status ('active', 'expired', 'manual_cancel')
```

### 2. Commission Calculation

**Location:** `lib/affiliateLogic.js`

```javascript
// When order COMPLETED:
commission = order.total_produk * (product.commission_rate / 100)

// Add to affiliator balance:
affiliator.current_balance += commission
affiliator.total_commission += commission

// Default commission_rate: 10%
```

### 3. Withdrawal Process

```javascript
// 1. Affiliator requests withdrawal
createWithdrawal(affiliatorId, nominal, bankInfo)
  → withdrawals table (status='pending')

// 2. Admin approves
updateWithdrawalStatus(withdrawalId, 'approved')
  → deductBalanceForWithdrawal(affiliatorId, nominal)
  → affiliator.current_balance -= nominal
  → affiliator.total_withdrawn += nominal

// 3. Admin uploads transfer proof
updateWithdrawalStatus(withdrawalId, 'paid', { bukti_transfer_url })
```

### 4. WA Message Parser

**Location:** `lib/addressParser.js`, `lib/indonesiaAddress.js`

```javascript
// Parse various WA message formats:
INPUT:
"📍 ALAMAT LENGKAP
rumahku, SERAM UTARA, KABUPATEN MALUKU TENGAH, MALUKU

📊 DATA PENERIMA
Nama: John
HP: 0812345678"

OUTPUT:
{
  nama: 'John',
  nomor_wa: '62812345678',
  alamat_jalan: 'rumahku',
  kecamatan: 'SERAM UTARA',
  kabupaten: 'KABUPATEN MALUKU TENGAH',
  provinsi: 'MALUKU',
  metode_bayar: 'transfer'
}

// Validate with Emsifa API (fuzzy matching for typo correction)
```

---

## 🔌 API & EXTERNAL SERVICES

### 1. Supabase

**Configuration:** `lib/supabaseClient.js`
```javascript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Key Queries:** `lib/supabaseQueries.js`
| Function | Table | Operation |
|----------|-------|-----------|
| `createOrGetUser()` | users | Upsert |
| `createOrder()` | orders | Insert |
| `addOrderItems()` | order_items | Insert |
| `updateOrderStatus()` | orders | Update |
| `getAllCustomers()` | customers | Select |
| `upsertCustomer()` | customers | Upsert |
| `getAffiliatorByEmail()` | affiliators | Select |
| `createWithdrawal()` | withdrawals | Insert |
| `updateProduct()` | products | Update |

### 2. Fonnte (WhatsApp Gateway)

**Configuration:** `lib/fonntePush.js`
```javascript
const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN;
const FONNTE_API_URL = 'https://api.fonnte.com/send';
```

**Notification Functions:**
| Function | Trigger |
|----------|---------|
| `sendOrderConfirmation()` | After order created |
| `sendInvoice()` | When invoice requested |
| `sendResiNotification()` | After resi input |
| `sendInvoiceNotification()` | Additional invoice push |
| `sendAffiliatorApprovalNotification()` | After affiliator approved |
| `sendAdminNotification()` | New affiliator registration |

### 3. Emsifa (Indonesian Address API)

**Configuration:** `lib/indonesiaAddress.js`
```javascript
const EMSIFA_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

// Endpoints:
GET /provinces.json
GET /regencies/{province_id}.json
GET /districts/{regency_id}.json
GET /villages/{district_id}.json
```

**Usage:** Fuzzy matching for typo correction using Fuse.js

---

## ✨ KEY FEATURES

### 1. Order Management (4-Column Kanban)
- **Column 1:** WAITING_CONFIRMATION (New orders)
- **Column 2:** PROCESSING (Confirmed, preparing)
- **Column 3:** SHIPPED (Has resi, in transit)
- **Column 4:** COMPLETED (Delivered, commission calculated)

### 2. Offline Order (Manual Order)
- Admin creates order manually
- WA message parser auto-fills customer data
- Address validation with Indonesian API
- Auto-save to customers table
- Auto-notify customer via WhatsApp

### 3. Print Resi
- Print shipping label with order details
- Print expedition request code
- Reprint functionality

### 4. WhatsApp Integration
- Order confirmation
- Invoice sending
- Resi notification
- Affiliator approval notification
- Admin alerts

### 5. Affiliator System
- 90-day customer binding
- Commission tracking
- Balance management
- Withdrawal requests
- TikTok link per product

### 6. Product Management
- Batch price editing
- Sort order management
- Commission rate per product
- Default TikTok link

---

## 🔧 ENVIRONMENT VARIABLES

**File:** `.env`

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://enwngiuiqcnbonhinctl.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Fonnte WhatsApp API
VITE_FONNTE_TOKEN=your_fonnte_token_here

# Optional: Analytics, etc.
VITE_GA_ID=
```

**Template:** `.env.example` (safe to commit)

---

## 🔍 TROUBLESHOOTING GUIDE

### Common Issues

#### 1. "Supabase credentials not found"
```
❌ ERROR: Supabase credentials not found in environment variables!
```
**Solution:** 
- Check `.env` file exists
- Ensure variables start with `VITE_`
- Restart dev server after changing `.env`

#### 2. "Failed to create order - User not found"
**Solution:**
- Check if `createOrGetUser()` was called first
- Verify `nomor_wa` is unique
- Check RLS policies on users table

#### 3. "WhatsApp notification failed"
```
⚠️ Warning: VITE_FONNTE_TOKEN not found
```
**Solution:**
- Add valid Fonnte token to `.env`
- Check Fonnte dashboard for API limits

#### 4. "Address parsing returns empty"
**Solution:**
- Check message format (must have recognizable field labels)
- Try with colon separators: `Nama: xxx`
- Check for emoji section headers

#### 5. "Commission not added after order completed"
**Solution:**
- Verify `affiliator_id` exists on order
- Check `commission_rate` on product (default: 10%)
- Verify affiliator status is 'active'

#### 6. "Duplicate order number"
**Solution:**
- Already fixed with random+timestamp component
- If persists, check database triggers

### Debug Logging

Key console logs to check:
```javascript
// Authentication
🔐 [LOGIN] Attempting admin login with email: xxx
🔐 [FOUND] Admin data: {...}
🔐 [SUCCESS] Password match!

// Orders
📦 [ORDER] Creating order: {...}
📦 [ORDER] Order created: #YYYYMMDD-XXXXX

// Fonnte
📱 [FONNTE] Sending message to: 628xxx
📱 [FONNTE] Response: {...}
```

---

## 📊 QUICK REFERENCE

### Status Badge Colors
```javascript
WAITING_CONFIRMATION: 'bg-yellow-500'
PROCESSING: 'bg-blue-500'
SHIPPED: 'bg-purple-500'
COMPLETED: 'bg-green-500'
CANCELLED: 'bg-red-500'
```

### Format Rupiah
```javascript
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0
  }).format(number);
};
// Output: Rp50.000
```

### Phone Number Normalization
```javascript
// Input → Output
'08123456789'   → '628123456789'
'+628123456789' → '628123456789'
'628123456789'  → '628123456789'
```

---

## 📝 REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Feb 12, 2026 | Initial release |
| 1.5.0 | Feb 14, 2026 | Dashboard modularization |
| 2.0.0 | Feb 17, 2026 | WA parser + Address API |

---

**END OF BLUEPRINT**
