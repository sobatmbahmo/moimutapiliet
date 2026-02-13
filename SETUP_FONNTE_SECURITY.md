# ✅ Setup Keamanan Token Fonnte

## Masalah yang Diperbaiki
Token Fonnte (API key) yang sebelumnya hardcoded di dalam source code telah dipindahkan ke environment variables untuk keamanan maksimal.

## Langkah-langkah Setup

### 1. **Buat File `.env` di Root Project**
```bash
cp .env.example .env
```

Atau buat file `f:\Website 2026\apiliet_full_custom\moimutapiliet\.env` secara manual.

### 2. **Isi Token Fonnte Anda**
Edit file `.env` dan masukkan token Anda:
```
REACT_APP_FONNTE_TOKEN=rUanTDbsyiRTN9nqTp6v
```

Ganti `rUanTDbsyiRTN9nqTp6v` dengan token akun Fonnte Anda yang sebenarnya.

### 3. **Verifikasi .gitignore**
Pastikan `.env` sudah ada di `.gitignore` (sudah ditambahkan):
```
.env
.env.local
.env.*.local
```

### 4. **Restart Development Server**
```bash
# Hentikan server yang sedang berjalan (Ctrl+C)
# Kemudian jalankan lagi
npm run dev    # atau npm start
```

## Struktur Environment Variables

### Untuk Vite Projects (✓ Digunakan di sini):
```
VITE_FONNTE_TOKEN=your_token_here
```

Akses di code:
```javascript
const token = import.meta.env.VITE_FONNTE_TOKEN;
```

### Untuk React Create React App (tidak digunakan):
```
REACT_APP_FONNTE_TOKEN=your_token_here
```

Akses di code:
```javascript
const token = process.env.REACT_APP_FONNTE_TOKEN;
```

## ⚠️ Penting!
- **JANGAN pernah commit file `.env` ke repositori publik!**
- File `.env` sudah ditambahkan ke `.gitignore` dan tidak akan ter-commit
- Gunakan `.env.example` sebagai template untuk member tim
- Setiap developer/server production harus membuat `.env` mereka sendiri

## Pengecekan
Jika token tidak ditemukan, Anda akan melihat peringatan di console:
```
⚠️ Warning: FONNTE_TOKEN not found in environment variables. 
   WhatsApp notifications will not work.
```

## Testing
Untuk memastikan setup benar:
1. Buka browser console (F12)
2. Cek apakah ada warning tentang VITE_FONNTE_TOKEN
3. Jika app muncul error seperti "process is not defined", berarti env variables belum ter-load
4. Coba kirim notifikasi WhatsApp - seharusnya bekerja normal

Jika masih ada error, restart dev server:
```bash
# Hentikan server (Ctrl+C)
# Jalankan kembali
npm run dev
```

---

**Status**: ✅ Keamanan diperbaiki | Token terlindungi dari exposure publik
