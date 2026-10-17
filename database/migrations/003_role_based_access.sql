-- database/migrations/003_role_based_access.sql
-- Phase 1: Role-Based Access Control
-- Additive, non-destructive migration for existing database

-- ============================================================
-- EXTEND admins TABLE FOR ROLE-BASED ACCESS
-- ============================================================

-- Add created_by_admin_id to track who created the account (for employee management)
-- Use ON DELETE SET NULL so deleting a manager doesn't block deletion of their created accounts
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS created_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL;

-- Add index for creator lookups
CREATE INDEX IF NOT EXISTS idx_admins_created_by ON admins(created_by_admin_id);

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- ============================================================
-- ENFORCE VALID ROLE VALUES
-- ============================================================

-- First, check if any existing rows have invalid roles
-- This will fail if invalid roles exist, preventing accidental data corruption
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM admins
    WHERE role NOT IN ('admin', 'manager', 'employee');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Migration aborted: % admin accounts have invalid role values. Fix data before applying migration.', invalid_count;
    END IF;
END $$;

-- Add check constraint for valid roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'admins_role_check'
    ) THEN
        ALTER TABLE admins 
        ADD CONSTRAINT admins_role_check 
        CHECK (role IN ('admin', 'manager', 'employee'));
    END IF;
END $$;

-- ============================================================
-- AUDIT LOG EXTENSION FOR EMPLOYEE MANAGEMENT ACTIONS
-- ============================================================

-- Extend audit log action constraint to include employee management actions
-- Drop and recreate constraint to add new action values (PostgreSQL doesn't support ALTER CONSTRAINT)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'policy_audit_log_action_check'
    ) THEN
        ALTER TABLE policy_audit_log DROP CONSTRAINT policy_audit_log_action_check;
    END IF;
    
    -- Create constraint with all existing and new action values
    ALTER TABLE policy_audit_log 
    ADD CONSTRAINT policy_audit_log_action_check 
    CHECK (action IN (
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PASSWORD_CHANGE',
        'EMPLOYEE_CREATE', 'EMPLOYEE_ACTIVATE', 
        'EMPLOYEE_DEACTIVATE', 'EMPLOYEE_PASSWORD_RESET', 'EMPLOYEE_DELETE'
    ));
END $$;

-- ============================================================
-- NOTES
-- ============================================================
-- This migration:
-- 1. Preserves all existing accounts and password hashes
-- 2. Does not change existing admin roles (they remain 'admin')
-- 3. Adds created_by_admin_id for employee management tracking with ON DELETE SET NULL
-- 4. Adds role constraint that allows only 'admin', 'manager', 'employee'
-- 6. Adds indexes for performance on role and creator lookups
-- 7. Extends audit log action constraint for employee management actions
-- 8. Does NOT automatically convert existing admins to managers
-- 7. Does NOT create any default manager/employee accounts
-- 8. Safe to re-run: uses IF NOT EXISTS for indexes, constraint recreation is idempotent
--    (DROP IF EXISTS would be needed for full idempotency on constraint)