-- Create the first operator account.
-- 1. Create auth user in Supabase Dashboard → Authentication → Users → Add user:
--      Email:    admin@loader.local
--      Password: <your password>
--      Auto confirm: YES
-- 2. Copy the user's UUID.
-- 3. Replace the UUID below and run.

insert into public.operators (id, username, display_name)
values (
  '00000000-0000-0000-0000-000000000000',   -- <-- paste auth user id here
  'admin',
  'Admin'
)
on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name;
