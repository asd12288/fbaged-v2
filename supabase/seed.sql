-- =============================================================================
-- Seed file for local Supabase development environment
-- Re-running this file is safe due to ON CONFLICT DO NOTHING clauses
-- =============================================================================

-- -----------------------------------------------------------------------------
-- auth.users
-- Password for all users: password123
-- bcrypt hash: $2a$10$PfNSGe7e/qnMGVFDxFehsO3fyNwKmJjMT6t3pJGfsPR4pCVNLvnKG
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@fbaged.dev',
    '$2a$10$PfNSGe7e/qnMGVFDxFehsO3fyNwKmJjMT6t3pJGfsPR4pCVNLvnKG',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'alice@fbaged.dev',
    '$2a$10$PfNSGe7e/qnMGVFDxFehsO3fyNwKmJjMT6t3pJGfsPR4pCVNLvnKG',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'bob@fbaged.dev',
    '$2a$10$PfNSGe7e/qnMGVFDxFehsO3fyNwKmJjMT6t3pJGfsPR4pCVNLvnKG',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- public.profiles
-- -----------------------------------------------------------------------------

INSERT INTO public.profiles (id, created_at, role, username) VALUES
  ('00000000-0000-0000-0000-000000000001', now(), 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000002', now(), 'user',  'Alice'),
  ('00000000-0000-0000-0000-000000000003', now(), 'user',  'Bob')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- public.campaigns
-- 3 per user (6 total), realistic ILS advertising data
-- -----------------------------------------------------------------------------

-- Alice's campaigns
INSERT INTO public.campaigns (
  created_at, "campaignName", status, "dailyBudget",
  results, reaches, impressions, "linkClicks",
  cpm, cpc, ctr, clicks, "costPerResults", "amountSpent",
  image, "dailyResults", user_id
) VALUES
  (
    '2024-06-01 08:00:00+00',
    'Summer Sale - Retargeting',
    'Active',
    1500,
    342, 58400, 124000, 2850,
    45.2, 12.8, 2.3, 2850, 87.5, 29800.00,
    NULL, 12,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '2024-08-15 10:00:00+00',
    'Brand Awareness Q3',
    'Learning',
    800,
    54, 21000, 46000, 980,
    34.7, 9.4, 2.1, 980, 148.0, 7900.00,
    NULL, 4,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '2024-11-20 09:30:00+00',
    'Black Friday Promo',
    'Paused',
    3000,
    890, 105000, 218000, 6200,
    72.3, 21.5, 2.8, 6200, 64.2, 57100.00,
    NULL, 0,
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT DO NOTHING;

-- Bob's campaigns
INSERT INTO public.campaigns (
  created_at, "campaignName", status, "dailyBudget",
  results, reaches, impressions, "linkClicks",
  cpm, cpc, ctr, clicks, "costPerResults", "amountSpent",
  image, "dailyResults", user_id
) VALUES
  (
    '2024-05-10 11:00:00+00',
    'Lead Gen - Real Estate',
    'Active',
    2000,
    198, 47200, 98000, 3400,
    58.1, 15.3, 3.5, 3400, 112.0, 22200.00,
    NULL, 8,
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '2024-09-03 07:45:00+00',
    'Product Launch Campaign',
    'Active',
    1200,
    120, 31500, 65000, 1850,
    39.4, 11.2, 2.8, 1850, 98.3, 11800.00,
    NULL, 6,
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '2025-01-12 13:00:00+00',
    'New Year Discount Push',
    'Paused',
    500,
    33, 9800, 22000, 490,
    22.7, 6.1, 2.2, 490, 151.5, 5000.00,
    NULL, 0,
    '00000000-0000-0000-0000-000000000003'
  )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- public.accounts
-- 2 per user (4 total)
-- -----------------------------------------------------------------------------

INSERT INTO public.accounts (
  created_at, "nameAccount", "numAccounts", cost, "totalCost", user_id
) VALUES
  -- Alice's accounts
  (
    '2024-01-15 10:00:00+00',
    'Facebook Ads - Main',
    3, 350, 1050,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '2024-03-20 10:00:00+00',
    'Google Ads - Search',
    2, 450, 900,
    '00000000-0000-0000-0000-000000000002'
  ),
  -- Bob's accounts
  (
    '2024-02-01 10:00:00+00',
    'Facebook Ads - Real Estate',
    4, 300, 1200,
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '2024-04-10 10:00:00+00',
    'Google Ads - Display',
    1, 500, 500,
    '00000000-0000-0000-0000-000000000003'
  )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- public.deposits
-- 4-5 per user (8-10 total)
-- -----------------------------------------------------------------------------

INSERT INTO public.deposits (
  created_at, amount, "dateAdded", type, user_id
) VALUES
  -- Alice's deposits
  (
    '2024-01-10 09:00:00+00',
    20000.00, '2024-01-10', 'bank_transfer',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '2024-03-05 14:30:00+00',
    15000.00, '2024-03-05', 'credit_card',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '2024-06-18 11:00:00+00',
    25000.00, '2024-06-18', 'bank_transfer',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '2024-10-22 16:00:00+00',
    10000.00, '2024-10-22', 'credit_card',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '2025-01-08 09:30:00+00',
    30000.00, '2025-01-08', 'bank_transfer',
    '00000000-0000-0000-0000-000000000002'
  ),
  -- Bob's deposits
  (
    '2024-02-14 10:00:00+00',
    12000.00, '2024-02-14', 'bank_transfer',
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '2024-05-01 15:00:00+00',
    8000.00, '2024-05-01', 'credit_card',
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '2024-08-30 12:00:00+00',
    18000.00, '2024-08-30', 'bank_transfer',
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '2024-12-15 10:00:00+00',
    5000.00, '2024-12-15', 'credit_card',
    '00000000-0000-0000-0000-000000000003'
  )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- public.settings
-- 1 row
-- -----------------------------------------------------------------------------

INSERT INTO public.settings (created_at, "isMaintenanceMode") VALUES
  (now(), false)
ON CONFLICT DO NOTHING;
