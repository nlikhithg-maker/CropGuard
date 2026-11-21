-- Run this once in the Supabase SQL Editor for the project.
create table if not exists public.farmer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  village text,
  primary_crop text,
  farm_size_acres numeric(10, 2) check (farm_size_acres is null or farm_size_acres >= 0),
  preferred_language text not null default 'English'
    check (preferred_language in ('English', 'Tamil', 'Hindi', 'Telugu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farmer_profiles enable row level security;
revoke all on table public.farmer_profiles from anon, authenticated;
grant select, insert, update on table public.farmer_profiles to authenticated;

drop policy if exists "Farmers can read their own profile" on public.farmer_profiles;
create policy "Farmers can read their own profile"
  on public.farmer_profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Farmers can create their own profile" on public.farmer_profiles;
create policy "Farmers can create their own profile"
  on public.farmer_profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Farmers can update their own profile" on public.farmer_profiles;
create policy "Farmers can update their own profile"
  on public.farmer_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create a profile when a farmer registers, including when email confirmation is enabled.
create or replace function public.handle_new_farmer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.farmer_profiles (
    id, full_name, phone, village, primary_crop, farm_size_acres, preferred_language
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'village', ''),
    nullif(new.raw_user_meta_data ->> 'primary_crop', ''),
    nullif(new.raw_user_meta_data ->> 'farm_size_acres', '')::numeric,
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_language', ''), 'English')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_farmer_profile on auth.users;
create trigger on_auth_user_created_farmer_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_farmer_profile();
