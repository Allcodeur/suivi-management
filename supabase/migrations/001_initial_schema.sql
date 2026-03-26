-- ═══════════════════════════════════════════════════════════
-- WorkloadIQ — Supabase Schema
-- Run this in your Supabase SQL editor (Project > SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ────────────────────────────────────────────────
-- Extends Supabase auth.users with role info
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  role        text not null default 'colleague' check (role in ('manager', 'colleague')),
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'colleague')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── SPRINTS ─────────────────────────────────────────────────
create table public.sprints (
  id            uuid default uuid_generate_v4() primary key,
  name          text not null,                          -- e.g. "Sprint 5"
  start_date    date not null,
  end_date      date not null,
  capacity_days numeric(4,1) not null default 8,        -- planned available days
  actual_days   numeric(4,1),                           -- filled at end of sprint
  colleague_id  uuid references public.profiles(id) on delete cascade not null,
  is_active     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Only one active sprint per colleague
create unique index one_active_sprint_per_colleague
  on public.sprints(colleague_id)
  where is_active = true;

-- ── TASKS ────────────────────────────────────────────────────
create table public.tasks (
  id            uuid default uuid_generate_v4() primary key,
  sprint_id     uuid references public.sprints(id) on delete cascade not null,
  name          text not null,
  days          numeric(3,2) not null default 1,        -- e.g. 0.5, 1, 2.5
  category      text not null default 'Autre'
                  check (category in ('SEO Tech','Contenu','Stratégie','Admin','Formation','Autre')),
  quadrant      text not null default 'Q2'
                  check (quadrant in ('Q1','Q2','Q3','Q4')),
  is_done       boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── NOTIFICATIONS LOG ────────────────────────────────────────
create table public.notification_log (
  id            uuid default uuid_generate_v4() primary key,
  sprint_id     uuid references public.sprints(id) on delete cascade not null,
  type          text not null check (type in ('overload','underload','sprint_summary')),
  sent_at       timestamptz default now(),
  recipient     text not null,
  payload       jsonb
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.sprints          enable row level security;
alter table public.tasks            enable row level security;
alter table public.notification_log enable row level security;

-- Profiles: users see their own; managers see all
create policy "Own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Manager sees all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'manager')
  );

create policy "Update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Sprints: colleague owns theirs; manager sees all
create policy "Colleague manages own sprints" on public.sprints
  for all using (colleague_id = auth.uid());

create policy "Manager sees all sprints" on public.sprints
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'manager')
  );

create policy "Manager updates sprints" on public.sprints
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'manager')
  );

-- Tasks: linked to sprint ownership
create policy "Access tasks via sprint" on public.tasks
  for all using (
    exists (
      select 1 from public.sprints s
      where s.id = sprint_id
        and (s.colleague_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'manager'))
    )
  );

-- Notification log: managers only
create policy "Manager sees notifications" on public.notification_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'manager')
  );

-- ── HELPER VIEWS ─────────────────────────────────────────────

-- Sprint summary with computed load metrics
create or replace view public.sprint_summary as
select
  s.id,
  s.name,
  s.start_date,
  s.end_date,
  s.capacity_days,
  s.actual_days,
  s.is_active,
  s.colleague_id,
  p.full_name  as colleague_name,
  p.email      as colleague_email,
  count(t.id)  as task_count,
  coalesce(sum(t.days), 0) as planned_days,
  coalesce(sum(t.days) filter (where t.is_done), 0) as completed_days,
  round(coalesce(sum(t.days), 0) / nullif(s.capacity_days, 0) * 100, 1) as load_pct
from public.sprints s
join public.profiles p on p.id = s.colleague_id
left join public.tasks t on t.sprint_id = s.id
group by s.id, p.full_name, p.email;

-- Updated_at auto-trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_sprints_updated_at before update on public.sprints
  for each row execute procedure public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ── SEED DATA (optional — remove in production) ──────────────
-- Insert two demo accounts via Supabase Auth dashboard, then run:
-- UPDATE public.profiles SET role = 'manager' WHERE email = 'manager@demo.com';
