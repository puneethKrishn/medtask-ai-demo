-- Row-Level Security policies scoped by org_id
-- Run after initial schema migration

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_audit_log ENABLE ROW LEVEL SECURITY;

-- App role used by the connection pool
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medtask_app') THEN
    CREATE ROLE medtask_app LOGIN;
  END IF;
END $$;

-- Tasks: only see rows matching current org
CREATE POLICY tasks_org_isolation ON tasks
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tasks_org_insert ON tasks
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- Users: only see rows matching current org
CREATE POLICY users_org_isolation ON users
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Patients: only see rows matching current org
CREATE POLICY patients_org_isolation ON patients
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Audit log: accessible via task's org (join-based or set param)
CREATE POLICY audit_log_org_isolation ON task_audit_log
  USING (task_id IN (
    SELECT id FROM tasks WHERE org_id = current_setting('app.current_org_id', true)::uuid
  ));

-- Grant usage to app role
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO medtask_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO medtask_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO medtask_app;
GRANT SELECT, INSERT ON task_audit_log TO medtask_app;
GRANT SELECT ON orgs TO medtask_app;
