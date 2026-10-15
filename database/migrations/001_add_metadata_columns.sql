-- database/migrations/001_add_metadata_columns.sql
-- Minimal migration to add missing metadata columns
-- Run with: psql $DATABASE_URL -f database/migrations/001_add_metadata_columns.sql

-- loan_applications: add reasons, final_status, model_probability, used_fallback
ALTER TABLE loan_applications 
ADD COLUMN IF NOT EXISTS reasons JSONB,
ADD COLUMN IF NOT EXISTS final_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS model_probability FLOAT,
ADD COLUMN IF NOT EXISTS used_fallback BOOLEAN;

-- transactions: add reasons, final_status, model_probability, used_fallback
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reasons JSONB,
ADD COLUMN IF NOT EXISTS final_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS model_probability FLOAT,
ADD COLUMN IF NOT EXISTS used_fallback BOOLEAN;

-- verification_logs: add final_status
ALTER TABLE verification_logs 
ADD COLUMN IF NOT EXISTS final_status VARCHAR(20);

-- Add check constraints for final_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'loan_applications_final_status_check'
    ) THEN
        ALTER TABLE loan_applications 
        ADD CONSTRAINT loan_applications_final_status_check 
        CHECK (final_status IN ('VERIFIED', 'HUMAN_REVIEW'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_final_status_check'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT transactions_final_status_check 
        CHECK (final_status IN ('VERIFIED', 'HUMAN_REVIEW'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'verification_logs_final_status_check'
    ) THEN
        ALTER TABLE verification_logs 
        ADD CONSTRAINT verification_logs_final_status_check 
        CHECK (final_status IN ('VERIFIED', 'HUMAN_REVIEW'));
    END IF;
END $$;