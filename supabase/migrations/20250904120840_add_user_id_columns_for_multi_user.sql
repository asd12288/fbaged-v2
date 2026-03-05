-- Add user_id columns to enable multi-user support
-- These columns will reference auth.users(id) to establish user ownership

-- Add user_id column to accounts table
ALTER TABLE accounts ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id column to campaigns table  
ALTER TABLE campaigns ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id column to deposits table
ALTER TABLE deposits ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create performance indexes for faster user-based queries
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);  
CREATE INDEX idx_deposits_user_id ON deposits(user_id);;
