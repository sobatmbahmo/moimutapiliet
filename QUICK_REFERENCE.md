# Quick Reference Guide - February 2026

## 🎯 Current Project Status

**Active Platform:** E-commerce with Affiliate Management  
**Current Phase:** Phase 6 Complete ✅  
**Repository:** https://github.com/sobatmbahmo/moimutapiliet  
**Deployment:** Cloudflare Pages (auto-deploy enabled)  

---

## 👥 User Types

### 1. **Affiliator (Mitra)**
- Register with: nama, email, password, nomor_wa, akun_tiktok, bank_name, account_number
- Dashboard shows their assigned products
- Can bulk edit TikTok links for products
- Receives WhatsApp notification when approved ✅
- Future: Track earnings, request withdrawal

### 2. **Admin**
- Manages affiliate registrations (approve/reject)
- Can bulk edit default product links
- Dashboard shows: pending affiliators, products, orders
- Sends approval notifications automatically ✅

### 3. **Customer** (Not yet implemented)
- Browse products
- Add to cart & checkout
- Place orders through affiliate links
- Future: Account dashboard, order tracking

---

## 🗄️ Database Structure (Key Tables)

### `affiliators`
```
id (UUID)
nama (VARCHAR)
email (VARCHAR)
password_hash (VARCHAR)
nomor_wa (VARCHAR) - WhatsApp number
status (VARCHAR) - pending/active/rejected
akun_tiktok (VARCHAR)
bank_name (VARCHAR) ✅
account_number (VARCHAR) ✅
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### `products`
```
id (INT)
nama (VARCHAR)
deskripsi (TEXT)
harga (DECIMAL)
stok (INT)
image_url (VARCHAR)
default_link (VARCHAR) - Default TikTok link
created_at (TIMESTAMP)
```

### `affiliator_product_links` ✅
```
id (BIGINT)
affiliator_id (UUID FK)
product_id (INT FK)
tiktok_link (VARCHAR) - Custom link per affiliate
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
UNIQUE(affiliator_id, product_id)
```

### Additional Tables
- `admins` - Admin accounts
- `customers` - Customer records
- `orders` - Order data
- `order_items` - Items in orders

---

## 🔑 Key Functions

### Authentication (`supabaseQueries.js`)
```javascript
createAffiliator(nama, nomor_wa, email, password_hash, akun_tiktok, account_number, bank_name)
// Creates new affiliator with bank details
```

### Product Link Management (`supabaseQueries.js`)
```javascript
addAffiliatorProductLink(affiliatorId, productId, tiktokLink)
updateAffiliatorProductLink(affiliatorId, productId, tiktokLink)
getAffiliatorProductLink(affiliatorId, productId)
deleteAffiliatorProductLink(affiliatorId, productId)
```

### Notifications (`fonntePush.js`)
```javascript
sendAffiliatorApprovalNotification(phoneNumber, name, email, bankName, accountNumber)
// Sends WhatsApp with approval & account details
```

---

## 📱 UI Components

### Approval Flow
1. [Dashboard.jsx](Dashboard.jsx#L523) - Line 523: `handleApproveAffiliator()`
   - Fetches affiliator data from DB
   - Updates status to 'active'
   - Calls `sendAffiliatorApprovalNotification()`
   - Shows success message

2. [fonntePush.js](fonntePush.js#L365) - Line 365: `sendAffiliatorApprovalNotification()`
   - Formats WhatsApp message with account details
   - Sends via Fonnte API

### Bulk Edit Flow
1. [Dashboard.jsx](Dashboard.jsx) - Checkbox selection for multiple products
2. [BulkEditModal.jsx](BulkEditModal.jsx) - Modal for editing selected products
3. "Apply to All" button - Quick bulk assignment
4. Saves to `affiliator_product_links` table

---

## 🚀 Deployment Process

```bash
# 1. Make changes locally
npm run build    # Build (3.35s)

# 2. Commit to git
git add .
git commit -m "Description of changes"

# 3. Push to GitHub
git push origin main

# Cloudflare Pages automatically deploys on push ✅
```

**Last Deployment:** Commit `462840f` (Session log added)

---

## 🔗 Important URLs & APIs

### Fonnte WhatsApp API
- **Base URL:** https://api.fonnte.com/send
- **Method:** POST
- **Required Headers:** Authorization token
- **Used For:** Order confirmations, approvals, invoices, withdrawal status

### Supabase
- **Database:** PostgreSQL
- **RLS Status:** Disabled on 6 tables (for development ease)
- **Tables:** 6 main tables + custom links table

### GitHub
- **Repository:** https://github.com/sobatmbahmo/moimutapiliet
- **Branch:** main (production)
- **Auto-deployment:** Enabled on Cloudflare Pages

---

## 📊 Common Tasks & How To

### Add New Affiliator Bank Field
Edit in 3 places:
1. `AuthModal.jsx` - Add form input
2. `createAffiliator()` in `supabaseQueries.js` - Add parameter 
3. Database schema - Add column

✅ **Already done:** `bank_name`, `account_number`

### Send WhatsApp Notification
```javascript
import { sendAffiliatorApprovalNotification } from '../lib/fonntePush';

// Call it
await sendAffiliatorApprovalNotification(
  phoneNumber,      // e.g., "+62812345678"
  affiliatorName,   // e.g., "Budi"
  email,            // e.g., "budi@email.com"
  bankName,         // e.g., "BCA"
  accountNumber     // e.g., "123456789"
);
```

### Query Affiliator Data
```javascript
const { data: affiliator } = await supabase
  .from('affiliators')
  .select('*')
  .eq('id', affiliatorId)
  .single();

// Access fields:
affiliator.nama
affiliator.bank_name
affiliator.account_number
affiliator.nomor_wa
```

---

## ⚠️ Development Notes

### Field Naming Convention
✅ **Use snake_case in database:** `bank_name`, `account_number`, `nomor_wa`  
✅ **Use camelCase in React:** `bankName`, `accountNumber`, `nomorWa`

### Error Handling
- Approve affiliator notifications fail gracefully (approval still succeeds)
- Bulk edit operations have try-catch blocks
- User gets feedback via setErrorMsg, setSuccessMsg

### Performance
- Build time: ~3.35 seconds
- JavaScript bundle: 563.98 KB (gzip: 155.70 KB)
- CSS: 39.72 KB (gzip: 7.39 KB)
- RLS disabled = faster queries (but less secure - enable before production)

### Testing
- ❌ No automated tests (manual testing only)
- ❌ No unit tests
- ✅ Build validation (npm run build)
- ✅ Git history preserved

---

## 🔄 Next Features to Build

### Phase 7: Earnings Dashboard
```javascript
// Show affiliator:
- Total commission earned
- Per-product breakdown
- Commission rate (%)
- Pending vs paid commissions
```

### Phase 8: Withdrawal System
```javascript
// Affiliator:
- Request withdrawal → admin approval
// Admin:
- Review withdrawal requests
- Mark as paid
- Send payment notification
```

### Phase 9: Order Integration
```javascript
// Need to:
- Create orders from customer clicks
- Bind orders to affiliate
- Calculate commission automatically
- Build customer checkout
```

---

## 📝 Code Standards

**Formatting:**
- 2 spaces indentation
- camelCase for JS variables
- snake_case for database columns
- UPPERCASE for constants

**File Organization:**
```
src/
├── components/
│   ├── Dashboard.jsx
│   ├── AuthModal.jsx
│   ├── BulkEditModal.jsx
│   └── ... other components
├── lib/
│   ├── supabaseQueries.js
│   ├── fonntePush.js
│   └── ... utilities
├── App.jsx
└── main.jsx
```

**Documentation:**
- Inline comments for complex logic
- Function descriptions for key functions
- DATABASE_SCHEMA.sql kept updated

---

## 🎓 Learning Resources Used

- React 18 hooks & state management
- Supabase PostgreSQL queries
- Fonnte WhatsApp API integration
- Vite build optimization
- Cloudflare Pages deployment
- Git version control workflow

---

## 💾 How to Save & Restore Work

**Current Session Files:**
- `SESSION_LOG_2026-02-13-14.md` - Complete development history
- `DATABASE_SCHEMA.sql` - Database structure
- [Git repository](https://github.com/sobatmbahmo/moimutapiliet) - All code history

**To restore/continue:**
1. Clone: `git clone https://github.com/sobatmbahmo/moimutapiliet.git`
2. Install: `npm install`
3. Check commits: `git log --oneline` (see full history)
4. Read [SESSION_LOG_2026-02-13-14.md](SESSION_LOG_2026-02-13-14.md) for context

**To share with team:**
- All code in GitHub (public repository)
- Session log in project root (SESSION_LOG_2026-02-13-14.md)
- Database schema documented (DATABASE_SCHEMA.sql)

---

**Last Updated:** February 14, 2026  
**Status:** Ready for Phase 7 (Earnings Dashboard)  
**Estimated Time to Phase 7:** 2-3 hours
