-- Create posts table
create table public.trendit_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('image', 'video', 'text')),
  caption    text check (char_length(caption) <= 200),
  media_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create trigger trg_trendit_posts_updated_at
  before update on public.trendit_posts
  for each row execute function public.set_updated_at();

-- Row-level security
alter table public.trendit_posts enable row level security;

-- Anyone can read posts
create policy "trendit_posts_select"
  on public.trendit_posts
  for select
  using (true);

-- Only the owner can insert
create policy "trendit_posts_insert"
  on public.trendit_posts
  for insert
  with check (auth.uid() = user_id);

-- Only the owner can update
create policy "trendit_posts_update"
  on public.trendit_posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only the owner can delete
create policy "trendit_posts_delete"
  on public.trendit_posts
  for delete
  using (auth.uid() = user_id);
