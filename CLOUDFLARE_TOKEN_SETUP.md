# 🚀 CLOUDFLARE PAGES - MANUAL SETUP DENGAN API TOKEN

**Status:** ✅ API Token Ready  
**Token:** Sudah tersimpan secara aman

---

## 📋 OPSI 1: AUTO-SETUP (RECOMMENDED)

**Buka link ini di browser Anda:**
```
https://dash.cloudflare.com/sign-up/pages
```

Atau:
1. Buka: https://dash.cloudflare.com
2. Klik: **Pages** (sidebar)
3. Klik: **Create a project**
4. **Connect GitHub**
   - Authorize Cloudflare mengakses GitHub
   - Pilih repository: `sobatmbahmo/moimutapiliet`
5. **Configure build:**
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
6. **Add Environment Variables:**
   - Klik **Advanced** atau **Environment variables**
   - Tambah 3 variables:

```
VITE_SUPABASE_URL = https://sflnecqovkzfnrbsoawo.supabase.co
VITE_SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbG5lY3Fvdmt6Zm5yYnNvYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODM0NjUsImV4cCI6MjA4NjQ1OTQ2NX0.ayQ_yjVAE-y2jbGI6pUN-KLDOt1ra31vErX9VEDmPgI
VITE_FONNTE_TOKEN = rUanTDbsyiRTN9nqTp6v
```

7. **Klik:** `Save and Deploy`

✅ Done! Tunggu 2-3 menit untuk first build & deploy.

---

## 📊 API TOKEN INFO (TERSIMPAN)

```
Token: HVsLVLfDEPRcsRYbfFSojmxEHOwE-pSDnx74UpoKHVsLVLfDEPRcsRYbfFSojmxEHOwE-pSDnx74UpoK
Permissions:
  ✅ Cloudflare Pages: Edit
  ✅ Account Settings: Edit
  ✅ Workers Scripts: Edit
  ✅ Workers Routes: Edit (all zones)
Account: Sobatmbahmo@gmail.com
```

---

## ✅ AFTER DEPLOY

Akan dapat URL LIVE seperti:
```
https://moimutapiliet-xxxxx.pages.dev
```

**Test:**
1. Buka URL tersebut
2. Login dengan akun admin
3. Coba buat order
4. Verifikasi Supabase & Fonnte integration

---

## 🔄 FUTURE UPDATES (AUTO)

Setiap push ke `main` branch:
```bash
git push
```

→ Cloudflare otomatis deploy dalam 2-3 menit ✅

---

## ⚠️ AFTER SETUP - DELETE TOKEN (OPTIONAL)

Untuk security, Anda bisa delete API token setelah setup selesai:
1. Buka: https://dash.cloudflare.com/profile/api-tokens
2. Find token yang dibuat
3. Klik **Delete**

Tidak akan affect Pages project yang sudah berjalan.

---

**Status: READY FOR DEPLOYMENT** ✅

Lakukan OPSI 1 step-by-step, dan website akan LIVE dalam 5 menit!
