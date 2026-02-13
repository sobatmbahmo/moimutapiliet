-- ================================================================
-- FIX ADMIN DATA - Fill NULL values
-- ================================================================

-- Update admin dengan NULL values (CORRECTED - no alamat column)
UPDATE admins
SET 
  nama = COALESCE(nama, 'Admin Master'),
  nomor_wa = COALESCE(nomor_wa, '0812345678'),
  password_hash = COALESCE(password_hash, 'admin2026')
WHERE email = 'sobatmbahmo@gmail.com';

-- Verify hasil
SELECT id, email, nama, nomor_wa, role, password_hash FROM admins 
WHERE email = 'sobatmbahmo@gmail.com';
