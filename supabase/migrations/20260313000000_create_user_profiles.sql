-- Create user_profiles table
create table public.user_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  username    text unique,
  bio         text check (char_length(bio) <= 150),
  website     text,
  phone       text,
  gender      text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Automatically updated_at on every row update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Auto-insert a blank profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security
alter table public.user_profiles enable row level security;

-- Anyone can read any public profile
create policy "profiles_select"
  on public.user_profiles
  for select
  using (true);

-- Users can only update their own profile
create policy "profiles_update"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
