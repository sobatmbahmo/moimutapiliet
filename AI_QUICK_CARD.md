# ⚡ TOKONEMBAHMO QUICK CARD
## AI-Readable Quick Reference (Auto-Generated)
**Last Updated:** February 17, 2026

---

## 🎯 WHAT IS THIS?
E-commerce platform for snack products with 90-day affiliate binding system.

| Role | Description |
|------|-------------|
| **Admin** | Full control: orders, products, affiliators, customers |
| **Affiliator** | Gets commission from bound customers, can withdraw balance |
| **Customer** | Public user who browses and orders products |

---

## 🔧 TECH STACK
```
Frontend: React 19 + Vite 7 + Tailwind CSS + Lucide Icons
Backend:  Supabase (PostgreSQL + REST API)
WhatsApp: Fonnte API
Address:  Emsifa API + Fuse.js
```

---

## 📁 KEY FILES QUICK MAP

| Purpose | File Path |
|---------|-----------|
| Entry Point | `src/main.jsx` |
| Main App + Routing | `src/App.jsx` |
| Supabase Client | `src/lib/supabaseClient.js` |
| All DB Queries | `src/lib/supabaseQueries.js` |
| Admin/Affiliator Dashboard | `src/components/Dashboard.jsx` |
| Order Management | `src/components/dashboard/AdminOrdersPanel.jsx` |
| Manual Order Form | `src/components/dashboard/OfflineOrderForm.jsx` |
| WA Message Parser | `src/lib/addressParser.js` |
| Commission Logic | `src/lib/affiliateLogic.js` |
| Binding Logic (90 days) | `src/lib/bindingLogic.js` |
| WhatsApp Notifications | `src/lib/fonntePush.js` |
| Input Validation | `src/lib/validation.js` |
| Database Schema | `NEW_DATABASE_SCHEMA.sql` |
| Environment Vars | `.env` |

---

## 🗄️ DATABASE TABLES

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `products` | Product catalog | id, name, price, commission_rate |
| `admins` | Admin accounts | id, email, password_hash |
| `affiliators` | Affiliate accounts | id, email, nomor_wa, status, current_balance |
| `users` | Customers (for orders) | id, nama, nomor_wa, alamat |
| `customers` | Customer address book | id, nama, nomor_wa, alamat |
| `orders` | All orders | id, order_number, user_id, affiliator_id, status |
| `order_items` | Order line items | id, order_id, product_id, qty, harga_satuan |
| `customer_binding` | 90-day affiliate binding | user_id, affiliator_id, start_date, end_date |
| `withdrawals` | Commission withdrawal requests | affiliator_id, nominal, status |
| `affiliator_product_links` | TikTok links per product | affiliator_id, product_id, tiktok_link |

---

## 🔄 ORDER STATUS FLOW

```
WAITING_CONFIRMATION → PROCESSING → SHIPPED → COMPLETED
         ↓
     CANCELLED
```

| Status | Trigger |
|--------|---------|
| `WAITING_CONFIRMATION` | Order created |
| `PROCESSING` | Admin clicks "Konfirmasi" |
| `SHIPPED` | Admin inputs resi via ShippingModal |
| `COMPLETED` | Admin clicks "Selesai" → Commission calculated |

---

## 🔑 KEY FUNCTIONS

### Creating Order (Manual/Offline)
```javascript
// 1. Create or get user
const userResult = await createOrGetUser(nama, nomorWA, null, alamat);

// 2. Save to customers
await upsertCustomer({ nama, nomor_wa: nomorWA, alamat });

// 3. Generate order number
const { orderNumber } = await generateOrderNumber(); // #YYYYMMDD-XXXXX

// 4. Create order
const orderResult = await createOrder(userId, {
  order_number: orderNumber,
  metode_bayar: 'transfer', // or 'cod'
  total_produk: subtotal,
  shipping_cost: ongkir,
  total_bayar: subtotal + ongkir,
  alamat: address,
  nomor_wa: phone,
  is_offline: true
});

// 5. Add order items
await addOrderItems(orderId, items);

// 6. Send WhatsApp notification
await sendOrderConfirmation(phone, name, orderNumber, items, ...);
```

### Completing Order (Add Commission)
```javascript
// When status → COMPLETED and has affiliator:
const commission = orderTotal * (commissionRate / 100);
await addCommissionToBalance(affiliatorId, commission, orderId);
```

### Parsing WA Message
```javascript
import { parseWAMessage } from './lib/addressParser';
import { validateAddress, formatValidatedAddress } from './lib/indonesiaAddress';

const parsed = parseWAMessage(waMessageText);
const validated = await validateAddress(parsed);
const formattedAddress = formatValidatedAddress(validated);
```

---

## 🌐 API ENDPOINTS

### Supabase REST (via client)
```javascript
supabase.from('TABLE').select('*')
supabase.from('TABLE').insert([data])
supabase.from('TABLE').update(data).eq('id', id)
supabase.from('TABLE').delete().eq('id', id)
```

### Fonnte (WhatsApp)
```
POST https://api.fonnte.com/send
Headers: { Authorization: FONNTE_TOKEN }
Body: { target: "628xxx", message: "text" }
```

### Emsifa (Address)
```
GET https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json
GET https://www.emsifa.com/api-wilayah-indonesia/api/regencies/{province_id}.json
GET https://www.emsifa.com/api-wilayah-indonesia/api/districts/{regency_id}.json
```

---

## 🔧 ENV VARIABLES

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGci...
VITE_FONNTE_TOKEN=your_token
```

---

## 🐛 COMMON BUGS & FIXES

| Bug | Cause | Fix |
|-----|-------|-----|
| Login fails | Wrong password_hash comparison | Check password in admins/affiliators table |
| Order not created | User doesn't exist | Call `createOrGetUser()` first |
| WA not sent | Missing FONNTE_TOKEN | Add to `.env` |
| Commission not added | No affiliator_id on order | Ensure binding exists |
| Address parser empty | Format not recognized | Use field labels (Nama:, HP:, Alamat:) |

---

## 🎨 UI THEME

```css
Primary Gold: #D4AF37
Hover Gold: #F4D03F
Background: #022c22 (dark green)
Glass Effect: bg-black/40 backdrop-blur-sm
Border: border-[#D4AF37]/50
```

---

**Use this file for quick AI troubleshooting. For full details, see `BLUEPRINT.md`**
