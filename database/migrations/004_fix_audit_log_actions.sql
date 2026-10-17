-- database/migrations/004_fix_audit_log_actions.sql
-- Fix: policy_audit_log_action_check constraint missing employee management actions
-- The constraint was created in 002 with only basic actions.
-- Migration 003 intended to extend it but was never applied.
-- No existing actions are removed; only the missing ones are added.

-- Drop existing constraint
ALTER TABLE policy_audit_log DROP CONSTRAINT IF EXISTS policy_audit_log_action_check;

-- Recreate with all actions: existing + employee management
ALTER TABLE policy_audit_log
ADD CONSTRAINT policy_audit_log_action_check
CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PASSWORD_CHANGE',
    'EMPLOYEE_CREATE', 'EMPLOYEE_ACTIVATE',
    'EMPLOYEE_DEACTIVATE', 'EMPLOYEE_PASSWORD_RESET', 'EMPLOYEE_DELETE'
));
