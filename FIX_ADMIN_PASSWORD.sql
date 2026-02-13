-- ================================================================
-- FIX ADMIN PASSWORD - Ensure password matches login attempt
-- ================================================================

-- Update password explicitly
UPDATE admins
SET password_hash = 'admin2026'
WHERE email = 'sobatmbahmo@gmail.com';

-- Verify
SELECT id, email, nama, password_hash FROM admins 
WHERE email = 'sobatmbahmo@gmail.com';
