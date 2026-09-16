create extension if not exists pgcrypto;

create type public.app_role as enum ('client', 'staff', 'admin');
create type public.member_status as enum ('invited', 'active', 'suspended', 'revoked');
create type public.subscription_status as enum ('active', 'suspended', 'cancelled');
create type public.credit_bucket as enum ('included', 'extra');
create type public.request_type as enum ('revision', 'modification', 'creation');
create type public.request_status as enum ('new', 'in_progress', 'completed', 'rejected');
create type public.feedback_status as enum ('new', 'evaluating', 'implementing', 'completed', 'rejected');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  airtable_record_id text unique,
  shopify_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'client',
  status public.member_status not null default 'invited',
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  included_credits integer not null check (included_credits >= 0),
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  active boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'active',
  current_period_start date not null,
  current_period_end date not null,
  created_at timestamptz not null default now(),
  unique (company_id, current_period_start)
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bucket public.credit_bucket not null,
  amount integer not null check (amount <> 0),
  description text not null,
  graphic_request_id uuid,
  idempotency_key text unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.graphic_requests (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  type public.request_type not null,
  title text not null,
  brief text not null,
  credit_cost integer not null check (credit_cost > 0),
  status public.request_status not null default 'new',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_transactions
  add constraint credit_transactions_request_fk
  foreign key (graphic_request_id) references public.graphic_requests(id) on delete set null;

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.graphic_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  public_message text,
  internal_note text,
  created_at timestamptz not null default now()
);

create table public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.graphic_requests(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  company_id uuid not null references public.companies(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  category text not null,
  title text not null,
  description text not null,
  status public.feedback_status not null default 'new',
  public_response text,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback_votes (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feedback_id, voter_id)
);

create index graphic_requests_company_idx on public.graphic_requests(company_id, created_at desc);
create index credit_transactions_company_idx on public.credit_transactions(company_id, created_at desc);
create index feedback_status_idx on public.feedback(status, created_at desc);

create or replace function public.current_profile_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where id = auth.uid() and status = 'active';
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.graphic_requests enable row level security;
alter table public.request_events enable row level security;
alter table public.request_files enable row level security;
alter table public.feedback enable row level security;
alter table public.feedback_votes enable row level security;

create policy "clients read own company" on public.companies for select
  using (id = public.current_company_id() or public.current_profile_role() in ('staff', 'admin'));
create policy "users read own profile" on public.profiles for select
  using (id = auth.uid() or public.current_profile_role() in ('staff', 'admin'));
create policy "authenticated users read plans" on public.plans for select to authenticated using (active);
create policy "clients read own subscription" on public.subscriptions for select
  using (company_id = public.current_company_id() or public.current_profile_role() in ('staff', 'admin'));
create policy "clients read own credit ledger" on public.credit_transactions for select
  using (company_id = public.current_company_id() or public.current_profile_role() in ('staff', 'admin'));
create policy "clients read own requests" on public.graphic_requests for select
  using (company_id = public.current_company_id() or public.current_profile_role() in ('staff', 'admin'));
create policy "clients create own requests" on public.graphic_requests for insert to authenticated
  with check (company_id = public.current_company_id() and requested_by = auth.uid());
create policy "staff update requests" on public.graphic_requests for update
  using (public.current_profile_role() in ('staff', 'admin'));
create policy "clients read public request events" on public.request_events for select
  using (
    (internal_note is null and exists (
      select 1 from public.graphic_requests r
      where r.id = request_id and r.company_id = public.current_company_id()
    )) or public.current_profile_role() in ('staff', 'admin')
  );
create policy "clients read own visible files" on public.request_files for select
  using (
    (customer_visible and exists (
      select 1 from public.graphic_requests r
      where r.id = request_id and r.company_id = public.current_company_id()
    )) or public.current_profile_role() in ('staff', 'admin')
  );
create policy "authenticated users read feedback" on public.feedback for select to authenticated using (true);
create policy "clients create feedback" on public.feedback for insert to authenticated
  with check (company_id = public.current_company_id() and author_id = auth.uid());
create policy "staff update feedback" on public.feedback for update
  using (public.current_profile_role() in ('staff', 'admin'));
create policy "authenticated users read votes" on public.feedback_votes for select to authenticated using (true);
create policy "users manage own vote" on public.feedback_votes for insert to authenticated with check (voter_id = auth.uid());
create policy "users remove own vote" on public.feedback_votes for delete using (voter_id = auth.uid());

-- Credit mutations intentionally have no client INSERT/UPDATE/DELETE policy.
-- They must pass through trusted server functions using the service role.
