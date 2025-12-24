-- Update your user role to ADMIN
-- Replace 'your-email@example.com' with your actual email address

UPDATE "User" 
SET role = 'ADMIN' 
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, name, email, role, status 
FROM "User" 
WHERE email = 'your-email@example.com';










