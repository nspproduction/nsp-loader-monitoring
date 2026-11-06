-- Add admin flag to operators so only admins can manage users.
alter table public.operators
  add column if not exists is_admin boolean not null default false;

-- Promote the seed admin (adjust username if yours differs).
update public.operators set is_admin = true where username = 'admin';
