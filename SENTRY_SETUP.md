# 🔍 Sentry Error Tracking Setup

## Langkah 1: Create Sentry Account & Project (5 menit)

1. **Buka [sentry.io](https://sentry.io)** dan daftar akun (gratis)
2. **Login** ke dashboard Sentry
3. **Buat project baru**:
   - Platform: `JavaScript` → `React`
   - Organization: Pilih atau buat
   - Project: `moimutapiliet` atau nama pilihan
   - Team: Default
   - Klik **Create Project**

4. **Copy DSN** (contoh):
   ```
   https://abc123def456@ghi789.ingest.sentry.io/1234567
   ```

## Langkah 2: Tambahkan ke .env

File `.env`:
```env
VITE_SENTRY_DSN=https://abc123def456@ghi789.ingest.sentry.io/1234567
```

## Langkah 3: Install Sentry SDK

```bash
npm install @sentry/react @sentry/tracing
```

## Langkah 4: Konfigurasi Sentry di `main.jsx`

File: `src/main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// 🔍 Initialize Sentry SEBELUM rendering app
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new BrowserTracing({
      // Set sampling rate for performance monitoring
      tracingOrigins: ["localhost", /^\//],
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        window.history
      ),
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 0.1, // Capture 10% of transactions (adjust untuk production)
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // Capture 100% on error
  
  // Environment
  environment: import.meta.env.MODE || 'development',
  
  // Release version (optional but recommended)
  release: "1.0.0",
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

## Langkah 5: Wrap App dengan Sentry Error Boundary

File: `src/App.jsx`

```jsx
import * as Sentry from "@sentry/react";

// Wrap App dengan Sentry Error Boundary
const SentryApp = Sentry.withProfiler(App);

export default SentryApp;
```

## Langkah 6: Test Sentry (PENTING!)

Tambahkan test button di Dashboard atau buat test page:

```jsx
const testSentryError = () => {
  try {
    throw new Error("🧪 Test error from Sentry");
  } catch (err) {
    Sentry.captureException(err);
  }
};

// atau gunakan 
const testSentryMessage = () => {
  Sentry.captureMessage("🧪 Test message dari aplikasi");
};
```

## Langkah 7: Automatic Error Capture

Sentry akan otomatis capture:
- ✅ Unhandled exceptions
- ✅ Promise rejections (unhandled)
- ✅ Console errors
- ✅ Network errors
- ✅ Performance issues

## Production Best Practices

### 1. **Sampling Rates** (jangan capture semua, mahal!)

```jsx
{
  tracesSampleRate: 0.1,           // 10% untuk development
  replaysSessionSampleRate: 0.1,   // 10% sessions
  replaysOnErrorSampleRate: 1.0,   // 100% saat error
}
```

Untuk production:
```jsx
{
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.05 : 0.1,
  replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.05 : 0.1,
}
```

### 2. **Custom Context** (tambahkan info user)

```jsx
Sentry.setContext("user", {
  id: user.id,
  email: user.email,
  type: user.type, // admin/affiliator/customer
});

Sentry.setTag("platform", "web");
Sentry.setTag("version", "1.0.0");
```

### 3. **Filter Sensitive Data**

```jsx
Sentry.init({
  beforeSend(event, hint) {
    // Jangan send password / tokens
    if (event.request?.url?.includes('password')) {
      return null; // Drop event
    }
    return event;
  },
})
```

## Monitoring Commands

### Capture Exception (untuk try-catch)

```jsx
try {
  // some code
} catch (error) {
  Sentry.captureException(error);
}
```

### Capture Message

```jsx
Sentry.captureMessage("Operasi selesai dengan warning", "warning");
```

### Set Breadcrumbs (trail of actions)

```jsx
Sentry.captureMessage("User mulai order");
Sentry.captureMessage("Verifikasi payment...");
Sentry.captureMessage("Order berhasil dibuat");
```

## Sentry Dashboard Features

### 1. **Issues Tab**
- Lihat semua error yang terjadi
- Grouping otomatis ke issue sama
- Assign ke team member

### 2. **Performance Tab**
- Lihat loading time, API calls
- Identify bottlenecks

### 3. **Replay Tab**
- Lihat video replay saat error terjadi
- Debug lebih mudah

### 4. **Alerts & Notifications**
- Email notification per issue
- Slack integration (premium)
- Custom rules

## Status Monitoring

✅ **Green** = No errors in last 24 hours
🟡 **Yellow** = Few errors detected
🔴 **Red** = Many errors detected

## Free Tier Limits

- 5,000 events/month
- 1 user project
- No replay
- Email notifications

## Scale ke Premium (kalau perlu)

- Unlimited events
- Team collaboration
- Full session replay
- Custom retention

## Quick Checklist

- [ ] Sentry account dibuat
- [ ] DSN di copy ke .env
- [ ] `npm install @sentry/react @sentry/tracing`
- [ ] main.jsx dikonfigurasi
- [ ] App.jsx di-wrap dengan Sentry
- [ ] Test error berhasil terdeteksi
- [ ] Deployment ke production
- [ ] Monitor dashboard regularly

## Testing Checklist

```javascript
// Test di browser console:

// 1. Test message
Sentry.captureMessage("Test message dari console");

// 2. Test error
Sentry.captureException(new Error("Test error dari console"));

// 3. Lihat di Sentry dashboard dalam 1-5 menit
```

## Troubleshooting

**Error tidak masuk ke Sentry?**
1. Cek DSN di VITE_SENTRY_DSN
2. Cek browser console untuk warning
3. Cek Network tab - request ke sentry.io ada?
4. Cek environment: production vs development

**Sample rate terlalu rendah?**
Increase `tracesSampleRate` ke 0.5 atau 1.0 untuk development

**Privacy concerns?**
Include `beforeSend()` untuk filter sensitive data
