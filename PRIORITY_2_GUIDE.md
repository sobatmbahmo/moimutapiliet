# 📋 PRIORITY 2 IMPLEMENTATION GUIDE

## 🎯 Fokus: Rate Limiting, Audit Logging, Backup, Error Tracking

---

## 1. 🔒 RATE LIMITING - Anti Abuse & Brute Force

### Problem:
- Admin bisa unlimited login attempts (brute force risk)
- Customer could spam order creation
- Fonnte API could be abused (expensive)

### Solution: Simple Server-Side Rate Limiting

#### Option A: Supabase Edge Functions (RECOMMENDED)
```javascript
// supabase/functions/rate-limit-check.js
export async function POST(req: Request) {
  const { email, action } = await req.json();
  
  // Get from Redis or Supabase
  const key = `limit:${action}:${email}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 900); // 15 min window
  }
  
  if (count > 5) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' 
      }),
      { status: 429 }
    );
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
```

#### Option B: Client-Side (Simple, Lower-cost):
```javascript
// src/lib/rateLimitClient.js

const RATE_LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 },      // 5 attempts / 15 min
  createOrder: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 orders / hour
  sendResi: { max: 20, windowMs: 60 * 60 * 1000 }     // 20 notifications / hour
};

const attempts = {}; // { 'login:user@email.com': { count, resetTime } }

export const checkRateLimit = (action, identifier) => {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  
  if (!attempts[key]) {
    attempts[key] = { count: 1, resetTime: now + RATE_LIMITS[action].windowMs };
    return { allowed: true, remaining: RATE_LIMITS[action].max - 1 };
  }
  
  // Reset if window expired
  if (now > attempts[key].resetTime) {
    attempts[key] = { count: 1, resetTime: now + RATE_LIMITS[action].windowMs };
    return { allowed: true, remaining: RATE_LIMITS[action].max - 1 };
  }
  
  // Check limit
  attempts[key].count++;
  const remaining = RATE_LIMITS[action].max - attempts[key].count;
  const allowed = attempts[key].count <= RATE_LIMITS[action].max;
  
  return { 
    allowed,
    remaining: Math.max(0, remaining),
    resetTime: attempts[key].resetTime
  };
};

// Usage di AuthModal.jsx:
const handleLogin = async () => {
  const result = checkRateLimit('login', email);
  
  if (!result.allowed) {
    const minutesLeft = Math.ceil((result.resetTime - Date.now()) / 60000);
    setErrorMsg(`Terlalu banyak percobaan. Coba lagi dalam ${minutesLeft} menit.`);
    return;
  }
  
  // Proceed with login...
};
```

### Implementation Checklist:
- [ ] Add rate limiting untuk login (5x per 15 min)
- [ ] Add rate limiting untuk order creation (10x per hour)
- [ ] Add rate limiting untuk Fonnte API calls
- [ ] Show user-friendly countdown message
- [ ] Add persistent storage (localStorage) untuk cross-session tracking

---

## 2. 📝 AUDIT LOGGING - Track All Changes

### Problem:
- Tidak tahu siapa ubah order status
- Tidak ada history jika data dihapus
- Sulit investigate fraud/issues

### Solution: Automatic Audit Table + Triggers

```sql
-- 1. Create audit table
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  admin_id UUID REFERENCES users(id),
  admin_email TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create index for faster queries
CREATE INDEX idx_audit_logs_table_record 
  ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created 
  ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin 
  ON audit_logs(admin_id);

-- 3. Auto-logging function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name, 
    record_id, 
    action, 
    old_data, 
    new_data, 
    admin_id,
    admin_email,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    (SELECT email FROM users WHERE id = auth.uid()),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger ke critical tables
CREATE TRIGGER orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER order_items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 5. Create RLS policy untuk audit logs (admin only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_read" ON audit_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "audit_logs_no_delete" ON audit_logs 
  FOR DELETE USING (false); -- Immutable
```

### Access Audit Logs dari Dashboard:
```javascript
// src/lib/auditQueries.js

export const getOrderAuditLog = async (orderId) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id, action, created_at, admin_email, old_data, new_data
    `)
    .eq('table_name', 'orders')
    .eq('record_id', orderId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Component untuk display:
// <AuditLog orderId={order.id} />
// Shows: Admin X changed status from WAITING_PAYMENT to processing at 2024-02-13 10:30
```

### Implementation Checklist:
- [ ] Create audit_logs table
- [ ] Create audit trigger function
- [ ] Attach triggers ke tables: orders, order_items, users
- [ ] Setup RLS untuk audit_logs (admin only)
- [ ] Create getOrderAuditLog function
- [ ] Add Audit Log viewer ke admin dashboard (optional)

---

## 3. 💾 BACKUP AUTOMATION - Data Protection

### Problem:
- Zero backup = data loss = disaster
- No disaster recovery plan

### Recommended Strategy:

#### Phase 1: Supabase Built-in (EASIEST - GCP Cloud Storage Included)
```
Steps:
1. Dashboard → Settings → Database → Backups
2. Enable automated daily backups (7 day retention)
3. Optional: download weekly export

Cost: Free (included)
Recovery: 1-click restore (5-10 min)
Timeline: Easy setup (2 min)
```

#### Phase 2: Cross-Cloud Backup (RECOMMENDED)
- Location: Store backups in multiple cloud providers
- Schedule: Daily at 2 AM

**Option: Use Supabase + Google Drive**
```bash
#!/bin/bash
# backup-script.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_$TIMESTAMP.sql"

# 1. Export from Supabase
pg_dump \
  "postgresql://postgres.USER:PASSWORD@db.supabase.co:5432/postgres" \
  > "/tmp/$BACKUP_FILE"

# 2. Compress
gzip "/tmp/$BACKUP_FILE"

# 3. Upload to Google Drive using rclone
rclone copy "/tmp/$BACKUP_FILE.gz" "gdrive:Backups/Database/"

# 4. Keep local backups for 30 days
find /local/backups -name "backup_*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_FILE"
```

**Setup Automation (Linux/Windows):**
```bash
# Linux: Add to crontab
0 2 * * * /usr/local/bin/backup-script.sh >> /var/log/backups.log

# Windows: Task Scheduler
# Trigger: Daily at 2 AM
# Action: Run script backup.ps1
```

#### Phase 3: Backup Monitoring
```javascript
// Monitor backup status via Supabase
const checkBackupStatus = async () => {
  // Check if backup happened today
  const { data } = await supabase
    .from('audit_logs')
    .select('created_at')
    .eq('table_name', 'backup_status')
    .gte('created_at', today)
    .limit(1);
  
  if (!data || data.length === 0) {
    // Alert admin
    sendAlert('⚠️ Database backup failed today');
  }
};
```

### Implementation Checklist:
- [ ] Enable Supabase automated backups (5 min)
- [ ] Create backup script untuk Google Drive (20 min)
- [ ] Setup cron/Task Scheduler (10 min)
- [ ] Test recovery process (restore dari backup) (15 min)
- [ ] Document backup procedure
- [ ] Setup backup failure alerts

---

## 4. 📊 ERROR TRACKING - Production Monitoring

### Problem:
- Silent failures in production (users affected, tidak tahu)
- No error logs untuk debugging
- Performance issues tidak terdeteksi

### Solution: Sentry (Free tier = 5000 events/month)

#### Setup (10 minutes):
```javascript
// 1. Install
npm install @sentry/react @sentry/tracing

// 2. Setup in main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://YOUR_KEY@sentry.io/PROJECT_ID",
  environment: "production",
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// 3. Usage - automatic for unhandled errors
// Plus manual logging:

import { handleError } from '@/lib/errorHandler';

try {
  await someFunctionThatMightFail();
} catch (err) {
  const errorInfo = handleError(err);
  
  // Log to Sentry
  Sentry.captureException(err, {
    tags: { 
      operation: 'order_creation',
      severity: errorInfo.severity 
    },
    extra: { 
      userMessage: errorInfo.userMessage,
      technicalDetails: errorInfo.technicalDetails
    }
  });
  
  // Show user message
  setErrorMsg(errorInfo.userMessage);
}
```

#### Configuration:
```javascript
// src/lib/sentry.js
export const initSentry = () => {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE, // development, production
    
    // Ignore certain errors
    ignoreErrors: [
      'NetworkError', // Too noisy
      'cancelled', // Aborted requests
      'Non-Error promise rejection captured' // Generic
    ],
    
    // Denylist URLs (exclude noisy third-parties)
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i
    ]
  });
};
```

### Add to .env:
```
VITE_SENTRY_DSN=https://xxxxx@sentry.io/123456
```

### What Sentry Provides:
✅ Real-time error alerts (email + dashboard)
✅ Error grouping (merge duplicates)
✅ Stack traces with source maps
✅ Session replay on error (see what user was doing)
✅ Performance monitoring
✅ Release tracking

### Implementation Checklist:
- [ ] Create Sentry account (free)
- [ ] Copy DSN to .env
- [ ] Install @sentry/react
- [ ] Initialize Sentry in main.jsx
- [ ] Update errorHandler untuk Sentry logging
- [ ] Set up alerts (email when error spike)
- [ ] Test: Trigger error dan verify Sentry catches it

---

## 📊 PRIORITY 2 SUMMARY

| Item | Time | Effort | Cost | Impact |
|------|------|--------|------|--------|
| Rate Limiting | 2h | Easy | $0 | High (prevents abuse) |
| Audit Logging | 4h | Medium | $0 | High (compliance + debug) |
| Backup Automation | 1h | Easy | $0-5 | Critical (data survival) |
| Error Tracking | 1h | Easy | $0 (free tier) | High (production visibility) |
| **Total** | **8h** | - | **$0-5** | **Very High** |

---

## 🎯 RECOMMENDATION ORDER

1. **START**: Error Tracking (Sentry) → Quick win, 10 min setup
2. **THEN**: Audit Logging → 4 hours, but essential for production
3. **PARALLEL**: Backup Automation → 1 hour, do it while audit testing
4. **LAST**: Rate Limiting → Can implement gradually per operation

**Timeline**: 1 focused day (Monday) atau 2 days part-time

---

## ⚠️ TESTING PRIORITY 2

After implementation:

```javascript
// Rate Limiting Test
- Try login 6 times → 6th should fail
- Wait message should show countdown

// Audit Logging Test
- Create order → check audit_logs table
- Change status → old_data and new_data should be logged
- Check who made the change (admin_email)

// Backup Test
- Manually trigger backup script
- Verify file exists in Google Drive
- Test RESTORE (yang paling penting!)

// Error Tracking Test
- Trigger an error intentionally
- Check Sentry dashboard → error should appear
- Check email alert received
```

---

**Last updated**: 13 Feb 2026
