alter type public.app_role add value if not exists 'graphic_operator';

do $$ begin
  create type public.request_priority as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

alter table public.graphic_requests
  add column if not exists due_date date,
  add column if not exists priority public.request_priority not null default 'medium',
  add column if not exists awaiting_client_response boolean not null default false;

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.graphic_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists request_messages_request_idx on public.request_messages(request_id, created_at asc);

alter table public.request_messages enable row level security;

drop policy if exists "clients read own requests" on public.graphic_requests;
create policy "clients and graphics read permitted requests" on public.graphic_requests for select
  using (
    company_id = public.current_company_id()
    or public.current_profile_role() in ('staff', 'admin')
    or (assigned_to = auth.uid() and public.current_profile_role() = 'graphic_operator')
  );

create policy "clients read own public request messages" on public.request_messages for select
  using (
    customer_visible and exists (
      select 1 from public.graphic_requests request
      where request.id = request_id and request.company_id = public.current_company_id()
    )
  );
