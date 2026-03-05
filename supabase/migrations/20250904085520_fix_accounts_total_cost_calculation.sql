-- Fix accounts totalCost calculation
UPDATE accounts 
SET "totalCost" = "numAccounts" * cost 
WHERE "totalCost" IS NULL;;
