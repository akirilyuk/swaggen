-- Legacy app versions used a single `store_state_meta.key` = 'swaggen-next-store' for all users.
-- That collides on PRIMARY KEY and breaks RLS on upsert (UPDATE path hits another user's row).
-- Move each owned row to a per-user key. Rows with NULL user_id are left unchanged.
UPDATE store_state_meta
SET key = 'swaggen-next-store:user:' || user_id::text
WHERE key = 'swaggen-next-store'
  AND user_id IS NOT NULL;
