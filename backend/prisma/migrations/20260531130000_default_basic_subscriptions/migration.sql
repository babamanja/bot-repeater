-- Assign Basic plan to users without a subscription row.
INSERT INTO subscriptions (id, user_id, plan_code, status, created_at)
SELECT gen_random_uuid(), u.id, 'basic', 'active', NOW()
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL
  AND u.deleted_at IS NULL;

-- Downgrade canceled Premium subscriptions past their paid period.
UPDATE subscriptions
SET
  plan_code = 'basic',
  status = 'active',
  current_period_end = NULL
WHERE plan_code = 'premium'
  AND status = 'canceled'
  AND (
    current_period_end IS NULL
    OR current_period_end < NOW()
  );
