-- Clean up duplicate unique constraints to improve database performance
-- As identified in the multi-user analysis document

-- Remove duplicate unique constraints that are redundant to primary keys
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_id_key;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_id_key; 
ALTER TABLE deposits DROP CONSTRAINT IF EXISTS deposits_id_key;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_id_key;

-- Note: These were duplicate unique constraints on primary key columns
-- which are automatically unique, so these extra constraints were redundant
-- and causing unnecessary overhead during writes;
