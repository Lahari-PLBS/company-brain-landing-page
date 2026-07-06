-- Create files table to store uploaded workspace resources
create table public.files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  source_type text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create queries table to store AI chat history and insights
create table public.queries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid default gen_random_uuid() not null,
  question text not null,
  answer text not null,
  sources jsonb default '[]'::jsonb not null,
  insights jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on both tables
alter table public.files enable row level security;
alter table public.queries enable row level security;

-- RLS Policies for files table
create policy "Users can view their own files"
  on public.files for select
  using (auth.uid() = user_id);

create policy "Users can insert their own files"
  on public.files for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own files"
  on public.files for delete
  using (auth.uid() = user_id);

-- RLS Policies for queries table
create policy "Users can view their own queries"
  on public.queries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own queries"
  on public.queries for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own queries"
  on public.queries for delete
  using (auth.uid() = user_id);
