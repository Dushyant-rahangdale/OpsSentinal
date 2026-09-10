-- Jira service mappings are meaningful only while the workspace integration exists
-- and is enabled. More importantly, this trigger coordinates stale service-settings
-- writes with destructive workspace removal: the mapping write takes a KEY SHARE lock
-- on the singleton JiraConfig row while removal takes FOR UPDATE on the same row.
-- Whichever operation wins the lock establishes the authoritative lifecycle outcome.

CREATE OR REPLACE FUNCTION "guard_jira_service_mapping_workspace"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
  FROM "JiraConfig"
  WHERE "id" = 'default'
    AND "enabled" = TRUE
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jira workspace is not configured or is disabled'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_guard_jira_service_mapping_workspace" ON "JiraServiceMapping";

CREATE TRIGGER "trg_guard_jira_service_mapping_workspace"
BEFORE INSERT OR UPDATE ON "JiraServiceMapping"
FOR EACH ROW
EXECUTE FUNCTION "guard_jira_service_mapping_workspace"();
