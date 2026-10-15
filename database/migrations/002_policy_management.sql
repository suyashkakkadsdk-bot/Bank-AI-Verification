-- database/migrations/002_policy_management.sql
-- Phase 1: Policy Management Database Schema
-- Additive, non-destructive migration

-- ============================================================
-- EXTEND verification_rules TABLE
-- ============================================================
ALTER TABLE verification_rules 
ADD COLUMN IF NOT EXISTS rule_type TEXT,
ADD COLUMN IF NOT EXISTS parameters JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Add check constraint for rule_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'verification_rules_rule_type_check'
    ) THEN
        ALTER TABLE verification_rules 
        ADD CONSTRAINT verification_rules_rule_type_check 
        CHECK (rule_type IN ('LOAN', 'FRAUD'));
    END IF;
END $$;

-- ============================================================
-- CREATE admins TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITHOUT TIME ZONE
);

-- ============================================================
-- CREATE policy_audit_log TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    action TEXT NOT NULL,
    rule_id INTEGER REFERENCES verification_rules(id),
    old_parameters JSONB,
    new_parameters JSONB,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add check constraint for action
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'policy_audit_log_action_check'
    ) THEN
        ALTER TABLE policy_audit_log 
        ADD CONSTRAINT policy_audit_log_action_check 
        CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PASSWORD_CHANGE'));
    END IF;
END $$;

-- ============================================================
-- SEED DEFAULT LOAN POLICY (exact current thresholds)
-- ============================================================
INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Loan Credit Score Risk', 'Credit score based risk scoring', 'HIGH', 'LOAN',
       '{"credit_score_thresholds": [{"min": 700, "score": 0}, {"min": 650, "max": 699, "score": 20}, {"max": 649, "score": 40}]}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Loan Credit Score Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Loan Existing Debt Risk', 'Existing debt risk scoring', 'HIGH', 'LOAN',
       '{"existing_debt_thresholds": [{"min": 1, "score": 30}, {"max": 0, "score": 0}]}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Loan Existing Debt Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Loan Income Ratio Risk', 'Loan to income ratio risk scoring', 'HIGH', 'LOAN',
       '{"loan_to_income_thresholds": [{"max": 7, "score": 0}, {"min": 7.01, "max": 10, "score": 15}, {"min": 10.01, "score": 30}]}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Loan Income Ratio Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Loan Independent Decision', 'Independent decision thresholds', 'HIGH', 'LOAN',
       '{"high_risk_indicators": {"approved_max": 0, "review_max": 2, "rejected_min": 3}}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Loan Independent Decision');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Loan Risk Level', 'Final risk level thresholds', 'HIGH', 'LOAN',
       '{"risk_levels": [{"max": 30, "level": "LOW"}, {"max": 70, "level": "MEDIUM"}, {"min": 71, "level": "HIGH"}]}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Loan Risk Level');

-- ============================================================
-- SEED DEFAULT FRAUD POLICY (exact current thresholds)
-- ============================================================
INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Amount Risk', 'Transaction amount risk scoring', 'HIGH', 'FRAUD',
       '{"amount_thresholds": [{"min": 50000, "score": 30}, {"min": 20000, "max": 49999, "score": 15}, {"max": 19999, "score": 0}]}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Amount Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Location Risk', 'Unusual location risk scoring', 'MEDIUM', 'FRAUD',
       '{"location_unusual_score": 20}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Location Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Device Risk', 'Suspicious device risk scoring', 'HIGH', 'FRAUD',
       '{"suspicious_device_prefixes": ["DEV4", "DEV099"], "device_score": 25}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Device Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Behaviour Risk', 'Abnormal behaviour risk scoring', 'HIGH', 'FRAUD',
       '{"abnormal_behaviour_score": 20}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Behaviour Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Frequency Risk', 'High frequency risk scoring', 'MEDIUM', 'FRAUD',
       '{"frequency_threshold": 10, "frequency_score": 15}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Frequency Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Timing Risk', 'Unusual timing risk scoring', 'MEDIUM', 'FRAUD',
       '{"unusual_hours_start": 0, "unusual_hours_end": 4, "timing_score": 15}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Timing Risk');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Independent Decision', 'Independent decision thresholds', 'HIGH', 'FRAUD',
       '{"suspicious_indicators": {"genuine_max": 0, "review_max": 2, "fraud_min": 3}}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Independent Decision');

INSERT INTO verification_rules (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by)
SELECT 'Fraud Risk Level', 'Final risk level thresholds', 'HIGH', 'FRAUD',
       '{"risk_levels": [{"max": 30, "level": "LOW"}, {"max": 70, "level": "MEDIUM"}, {"min": 71, "level": "HIGH"}]}'::jsonb,
       true, 1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM verification_rules WHERE rule_name = 'Fraud Risk Level');

-- ============================================================
-- CREATE DEFAULT ADMIN USER (password: admin123 - will be hashed)
-- ============================================================
-- Note: Password will be set via application code using bcrypt
-- This is a placeholder - actual password set on first login or via script
INSERT INTO admins (username, password_hash, role, is_active)
SELECT 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');