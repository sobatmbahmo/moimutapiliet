# ✅ TESTING CHECKLIST - Priority 1 Validation & Error Handling

**Date**: February 13, 2026
**Server**: http://localhost:5175/
**Status**: TESTING IN PROGRESS

---

## 🔐 **PHASE 1: Input Validation Testing** (15 minutes)

### **Admin Login Page**
- [ ] **Test 1a**: Invalid email
  - Input: `notanemail`
  - Expected: Show error "Email tidak valid"
  - Result: ✓ / ✗

- [ ] **Test 1b**: Empty password
  - Input: (empty)
  - Expected: Show error "Password harus diisi"
  - Result: ✓ / ✗

- [ ] **Test 1c**: Valid input
  - Email: `admin@test.com`
  - Password: `Test@1234`
  - Expected: Proceed to login or show auth error
  - Result: ✓ / ✗

### **Affiliator Register Page**
- [ ] **Test 2a**: Name too short
  - Input: `A` (1 char)
  - Expected: Show error "Nama minimal 2 karakter"
  - Result: ✓ / ✗

- [ ] **Test 2b**: Invalid email
  - Input: `test@invalid@com`
  - Expected: Show error "Email tidak valid"
  - Result: ✓ / ✗

- [ ] **Test 2c**: Weak password
  - Input: `pass123` (no uppercase, no special)
  - Expected: Show error about password requirements
  - Result: ✓ / ✗

- [ ] **Test 2d**: Invalid phone (non-Indonesian)
  - Input: `+11234567890` (US number)
  - Expected: Show error about Indonesian format
  - Result: ✓ / ✗

- [ ] **Test 2e**: Valid Indonesian phone formats
  - ✓ `08123456789`
  - ✓ `0812 3456789` (with space)
  - ✓ `+628123456789`
  - ✓ `628123456789`
  - Expected: All accepted
  - Result: ✓ / ✗

- [ ] **Test 2f**: Password mismatch
  - Password: `Test@1234`
  - Confirm: `Test@5678`
  - Expected: Show error "Password tidak cocok"
  - Result: ✓ / ✗

### **Affiliator Login Page**
- [ ] **Test 3a**: Invalid email
  - Input: `@example.com`
  - Expected: Show error "Email tidak valid"
  - Result: ✓ / ✗

- [ ] **Test 3b**: Empty password
  - Expected: Show error "Password harus diisi"
  - Result: ✓ / ✗

---

## 🛒 **PHASE 2: Dashboard Validation Testing** (15 minutes)

### **Offline Order Creation**
- [ ] **Test 4a**: Invalid customer name
  - Input: Name with special chars `John!@#$`
  - Expected: Show error
  - Result: ✓ / ✗

- [ ] **Test 4b**: Invalid phone number
  - Input: `12345678` (non-Indonesian)
  - Expected: Show error "Format WhatsApp tidak valid (08xxx, +628xxx, atau 628xxx)"
  - Result: ✓ / ✗

- [ ] **Test 4c**: Valid order creation
  - Customer name: `John Doe`
  - Phone: `08123456789`
  - Select 1+ items
  - Expected: Order created successfully
  - Result: ✓ / ✗

### **Shipping Cost Input**
- [ ] **Test 5a**: Ongkir too high
  - Input: `15000000` (Rp15M, above limit)
  - Expected: Show error "Ongkir maksimal Rp10.000.000"
  - Result: ✓ / ✗

- [ ] **Test 5b**: Negative ongkir
  - Input: `-1000`
  - Expected: Show error "Ongkir minimal Rp0"
  - Result: ✓ / ✗

- [ ] **Test 5c**: Valid ongkir
  - Input: `50000` (Rp50K)
  - Expected: Accepted
  - Result: ✓ / ✗

### **Resi Notification**
- [ ] **Test 6a**: Resi too short
  - Input: `ABC` (3 chars, need 5+)
  - Expected: Show error "Nomor resi minimal 5 karakter"
  - Result: ✓ / ✗

- [ ] **Test 6b**: Resi too long
  - Input: `ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345678901` (51 chars)
  - Expected: Show error "Nomor resi maksimal 50 karakter"
  - Result: ✓ / ✗

- [ ] **Test 6c**: Valid resi
  - Input: `JNT123456789`
  - Expected: Accepted
  - Result: ✓ / ✗

---

## ⚠️ **PHASE 3: Error Handling Testing** (15 minutes)

### **Network Error Simulation**
- [ ] **Test 7a**: Disconnect internet
  - Action: Disable internet/WiFi
  - Try to create order
  - Expected: User-friendly error "Gagal terhubung ke server. Periksa koneksi internet Anda."
  - Result: ✓ / ✗

- [ ] **Test 7b**: Reconnect
  - Action: Re-enable internet
  - Retry operation
  - Expected: Works normally
  - Result: ✓ / ✗

### **Server Error Simulation**
- [ ] **Test 8a**: Invalid Supabase request
  - Action: Submit form with invalid data
  - Expected: Error handled gracefully, helpful message shown
  - Result: ✓ / ✗

### **Timeout Testing**
- [ ] **Test 9a**: Slow network
  - Action: Throttle network to slow 3G
  - Try operation
  - Expected: Timeout message if takes > 30 sec
  - Result: ✓ / ✗

---

## 🔒 **PHASE 4: XSS Prevention Testing** (10 minutes)

### **Input Sanitization**
- [ ] **Test 10a**: Admin login - XSS attempt
  - Email: `admin@test.com<script>alert('xss')</script>`
  - Expected: Script removed, no alert shown
  - Result: ✓ / ✗

- [ ] **Test 10b**: Customer name - XSS attempt
  - Name: `John<img src=x onerror=alert('xss')>`
  - Expected: HTML cleaned, no execution
  - Result: ✓ / ✗

- [ ] **Test 10c**: Phone number - Special chars
  - Input: `08123456789";DROP TABLE users;--`
  - Expected: Cleaned/rejected, no SQL execution
  - Result: ✓ / ✗

---

## 📊 **PHASE 5: UI/UX Testing** (10 minutes)

### **Error Messages**
- [ ] **Test 11a**: All error messages in Indonesian
  - Expected: No English error messages
  - Result: ✓ / ✗

- [ ] **Test 11b**: Error messages are helpful
  - Example: Not just "Error!" but "Nama minimal 2 karakter"
  - Result: ✓ / ✗

- [ ] **Test 11c**: Success messages clear
  - Example: "✅ Order berhasil dibuat"
  - Result: ✓ / ✗

### **Form Validation Timing**
- [ ] **Test 12a**: Validation happens before submit
  - Action: Type invalid data, click submit
  - Expected: Error shown without network request
  - Result: ✓ / ✗

- [ ] **Test 12b**: Loading state during processing
  - Action: Submit valid form
  - Expected: Loading spinner/disabled button
  - Result: ✓ / ✗

---

## 📋 **SUMMARY**

```
Total Tests: 45
Passed: ___ / 45
Failed: ___ / 45
Success Rate: ____%

Critical Issues: _______
Minor Issues: _______
All Good: [ ] YES / [ ] NO
```

---

## 🔧 **Notes**

**Bugs Found:**
```
Bug #1: ________________
Bug #2: ________________
Bug #3: ________________
```

**Recommendations:**
```
1. ________________
2. ________________
3. ________________
```

---

**Testing Date**: ________________
**Tester Name**: ________________
**Approved By**: ________________

✅ = PASS
✗ = FAIL / NEEDS FIX
