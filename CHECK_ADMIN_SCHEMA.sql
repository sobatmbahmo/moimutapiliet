-- Check the actual schema of admins table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admins'
ORDER BY ordinal_position;
