-- Expose qr_tokens UPDATE events to Supabase Realtime so the operator's
-- dashboard knows the moment a driver consumes the current QR token.
-- Operator is authenticated (session cookie) → the existing
-- qr_tokens_auth_all policy already grants SELECT, so Realtime will deliver
-- events to that session. Anon callers get nothing (good: token strings must
-- not be enumerable).
alter publication supabase_realtime add table public.qr_tokens;
