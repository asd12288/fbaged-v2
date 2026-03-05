-- Migrate all existing data to the admin user
-- Admin user ID: 74bf6365-b9ca-457c-84f0-2ae72fdee58a
-- This preserves all existing campaigns, accounts, and financial data

-- Assign all existing accounts (25 records) to admin user
UPDATE accounts 
SET user_id = '74bf6365-b9ca-457c-84f0-2ae72fdee58a';

-- Assign all existing campaigns (76 records) to admin user  
UPDATE campaigns 
SET user_id = '74bf6365-b9ca-457c-84f0-2ae72fdee58a';

-- Assign all existing deposits (83 records) to admin user
UPDATE deposits 
SET user_id = '74bf6365-b9ca-457c-84f0-2ae72fdee58a';

-- Make user_id columns required (NOT NULL constraint)
-- This ensures all future records must have an owner
ALTER TABLE accounts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE deposits ALTER COLUMN user_id SET NOT NULL;;
