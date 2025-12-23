-- Add performance indexes for frequently queried fields

-- Composite index for orders by market, side, and state (for order book)
CREATE INDEX IF NOT EXISTS "orders_market_side_state_idx" ON "orders" ("market_id", "side", "state");

-- Composite index for trades by market and date (for trade history)
CREATE INDEX IF NOT EXISTS "trades_market_date_idx" ON "trades" ("market_id", "created_at" DESC);

-- Index for orders by user and created date (for user order history)
CREATE INDEX IF NOT EXISTS "orders_user_created_idx" ON "orders" ("user_id", "created_at" DESC);

-- Composite index for token offerings by status and start date
CREATE INDEX IF NOT EXISTS "token_offerings_status_start_idx" ON "token_offerings" ("status", "start_date");

-- Index for KYC documents by user and status (for pending reviews)
CREATE INDEX IF NOT EXISTS "kyc_documents_user_status_idx" ON "kyc_documents" ("user_id", "status");

-- Composite index for AML transactions by user and date
CREATE INDEX IF NOT EXISTS "aml_transactions_user_date_idx" ON "aml_transactions" ("user_id", "created_at" DESC);

-- Index for fee charges by status and period
CREATE INDEX IF NOT EXISTS "fee_charges_status_period_idx" ON "fee_charges" ("status", "period_start" DESC);

-- Index for accounts by user and currency (already unique, but index helps lookups)
-- This is already covered by the unique constraint, but adding explicit index for clarity

-- Index for VC funds by status and regulatory status (for filtering)
CREATE INDEX IF NOT EXISTS "vc_funds_status_regulatory_idx" ON "vc_funds" ("status", "regulatory_status");

-- Index for performance records by fund and date (for charts)
CREATE INDEX IF NOT EXISTS "vc_fund_performance_fund_date_idx" ON "vc_fund_performance_records" ("vc_fund_id", "record_date" DESC);

