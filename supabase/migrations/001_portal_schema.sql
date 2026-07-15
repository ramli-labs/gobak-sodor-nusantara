-- Portal Permainan Nusantara v1.0
-- Jalankan satu kali melalui Supabase SQL Editor pada proyek baru.

create extension if not exists pgcrypto;
create schema if not exists private;

-- ============================================================
-- Utility functions
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Core tables
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  role text not null default 'student' check (role in ('student','teacher','admin')),
  school_name text not null default '' check (char_length(school_name) <= 120),
  class_label text not null default '' check (char_length(class_label) <= 40),
  avatar text not null default '🌟' check (char_length(avatar) between 1 and 16),
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  class_code text not null unique check (class_code ~ '^[A-Za-z0-9]{4,12}$'),
  school_name text not null default '' check (char_length(school_name) <= 120),
  academic_year text not null default '' check (char_length(academic_year) <= 30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','inactive')),
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (char_length(trim(title)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  launch_path text not null check (char_length(launch_path) <= 240),
  icon text not null default '🎮' check (char_length(icon) between 1 and 16),
  subjects jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','coming_soon','hidden')),
  max_score integer not null default 100000 check (max_score > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  subject text not null default 'Campuran' check (char_length(subject) between 1 and 80),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.question_sets(id) on delete cascade,
  category text not null check (char_length(category) between 1 and 80),
  prompt text not null check (char_length(trim(prompt)) between 5 and 2000),
  choices jsonb not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_choices_valid check (
    jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 6
  )
);

-- Kunci jawaban dipisahkan agar tidak pernah ikut SELECT siswa.
create table if not exists public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_index integer not null check (correct_index between 0 and 5),
  explanation text not null default '' check (char_length(explanation) <= 2000),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  question_set_id uuid references public.question_sets(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 120),
  instructions text not null default '' check (char_length(instructions) <= 2000),
  due_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  class_id uuid references public.classes(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  score integer not null default 0 check (score >= 0),
  accuracy numeric(5,2) not null default 0 check (accuracy between 0 and 100),
  result text not null default 'completed' check (result in ('won','lost','completed','abandoned')),
  mode text not null default 'Solo' check (char_length(mode) between 1 and 30),
  difficulty text not null default 'Normal' check (char_length(difficulty) between 1 and 30),
  level_id text not null default '' check (char_length(level_id) <= 80),
  duration_seconds numeric(10,2) not null default 0 check (duration_seconds >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  question_count integer not null default 0 check (question_count >= 0),
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_index integer not null check (selected_index between 0 and 5),
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table if not exists public.achievements (
  id text primary key,
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) <= 500),
  icon text not null default '🏅' check (char_length(icon) between 1 and 16),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  is_active boolean not null default true
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.audit_logs (
  id bigint generated by default as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) <= 100),
  entity_type text not null check (char_length(entity_type) <= 80),
  entity_id text not null default '' check (char_length(entity_id) <= 160),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Role helpers are created after profiles exists.
create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_user_role() = 'admin';
$$;

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_classes_teacher on public.classes(teacher_id);
create index if not exists idx_class_members_student on public.class_members(student_id);
create index if not exists idx_question_sets_owner on public.question_sets(owner_id);
create index if not exists idx_questions_set_order on public.questions(question_set_id, order_index);
create index if not exists idx_assignments_class_active on public.assignments(class_id, is_active);
create index if not exists idx_sessions_user_completed on public.game_sessions(user_id, completed_at desc);
create index if not exists idx_sessions_game_score on public.game_sessions(game_id, verified, score desc);
create index if not exists idx_sessions_class on public.game_sessions(class_id, completed_at desc);
create index if not exists idx_attempts_session on public.question_attempts(session_id);
create unique index if not exists uq_sessions_client_session on public.game_sessions(user_id, game_id, (metadata ->> 'clientSessionId')) where coalesce(metadata ->> 'clientSessionId','') <> '';
create unique index if not exists uq_verified_assignment_once on public.game_sessions(user_id, assignment_id) where assignment_id is not null and verified;

-- ============================================================
-- Helper functions that depend on tables
-- ============================================================
create or replace function private.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    private.current_user_role() = 'teacher'
    and exists(
      select 1 from public.classes c
      where c.id = p_class_id and c.teacher_id = auth.uid()
    )
  ) or private.is_admin();
$$;

create or replace function private.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.class_members cm
    where cm.class_id = p_class_id
      and cm.student_id = auth.uid()
      and cm.status = 'active'
  );
$$;

create or replace function private.can_manage_question_set(p_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    private.current_user_role() = 'teacher'
    and exists(
      select 1 from public.question_sets qs
      where qs.id = p_set_id and qs.owner_id = auth.uid()
    )
  ) or private.is_admin();
$$;

-- Helper functions live in a non-exposed schema. They are callable by RLS
-- but do not become REST endpoints because only public is exposed.
grant usage on schema private to anon, authenticated;
grant execute on function private.current_user_role() to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_class_teacher(uuid) to authenticated;
grant execute on function private.is_class_member(uuid) to authenticated;
grant execute on function private.can_manage_question_set(uuid) to authenticated;

-- ============================================================
-- Auth profile trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, school_name, class_label, avatar)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80),
    'student',
    left(coalesce(new.raw_user_meta_data ->> 'school_name', ''), 120),
    left(coalesce(new.raw_user_meta_data ->> 'class_label', ''), 40),
    left(coalesce(nullif(new.raw_user_meta_data ->> 'avatar', ''), '🌟'), 16)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.prevent_profile_protected_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL Editor/service role memiliki auth.uid() null dan dipakai untuk bootstrap admin.
  if auth.uid() is not null and not private.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Role hanya dapat diubah oleh admin.';
    end if;
    if new.xp is distinct from old.xp then
      raise exception 'XP tidak dapat diubah langsung dari browser.';
    end if;
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'Kolom profil terlindungi tidak dapat diubah.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
before update on public.profiles
for each row execute function public.prevent_profile_protected_changes();

-- Menjaga set terbitan dan tugas tetap konsisten.
create or replace function public.validate_question_set_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_count integer;
  v_key_count integer;
begin
  if new.status <> 'published' then
    new.is_public := false;
  end if;

  if new.status = 'published' then
    select count(*) into v_question_count from public.questions where question_set_id = new.id;
    select count(*) into v_key_count
    from public.question_keys k
    join public.questions q on q.id = k.question_id
    where q.question_set_id = new.id;
    if v_question_count < 10 or v_key_count <> v_question_count then
      raise exception 'Set terbitan harus memiliki minimal 10 soal dan seluruh kunci jawaban.';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' and new.status <> 'published' and exists (
    select 1 from public.assignments where question_set_id = old.id and is_active
  ) then
    raise exception 'Set tidak dapat dijadikan draft selama masih dipakai tugas aktif.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_question_set_state on public.question_sets;
create trigger trg_validate_question_set_state
before insert or update on public.question_sets
for each row execute function public.validate_question_set_state();

create or replace function public.validate_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_slug text;
  v_set_owner uuid;
  v_set_status text;
begin
  select slug into v_game_slug from public.games where id = new.game_id;
  if v_game_slug is null then raise exception 'Game tidak ditemukan.'; end if;
  if new.is_active and new.due_at is not null and new.due_at <= now() then raise exception 'Tenggat tugas aktif harus berada di masa depan.'; end if;

  if v_game_slug = 'jelajah-nusantara' and new.question_set_id is null then
    raise exception 'Tugas Jelajah Nusantara memerlukan set soal terbitan.';
  end if;
  if v_game_slug <> 'jelajah-nusantara' and new.question_set_id is not null then
    raise exception 'Set soal khusus saat ini hanya didukung Jelajah Nusantara.';
  end if;

  if new.question_set_id is not null then
    select owner_id, status into v_set_owner, v_set_status
    from public.question_sets where id = new.question_set_id;
    if v_set_owner is null then raise exception 'Set soal tidak ditemukan.'; end if;
    if v_set_status <> 'published' then raise exception 'Set soal harus berstatus published.'; end if;
    if v_set_owner <> new.created_by and not private.is_admin() then
      raise exception 'Hanya set soal milik pembuat tugas yang dapat digunakan.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_assignment on public.assignments;
create trigger trg_validate_assignment
before insert or update on public.assignments
for each row execute function public.validate_assignment();

create or replace function public.prevent_assignment_creator_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() and new.created_by is distinct from old.created_by then
    raise exception 'Pembuat tugas tidak dapat diubah.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_assignment_creator on public.assignments;
create trigger trg_protect_assignment_creator
before update on public.assignments
for each row execute function public.prevent_assignment_creator_change();

-- Updated-at triggers
DO $$
DECLARE t text;
BEGIN
  foreach t in array array['profiles','teacher_requests','classes','games','question_sets','questions','assignments']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
END $$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.teacher_requests enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.games enable row level security;
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.assignments enable row level security;
alter table public.game_sessions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy "profiles_select_allowed" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or private.is_admin()
  or exists (
    select 1
    from public.classes c
    join public.class_members cm on cm.class_id = c.id
    where c.teacher_id = (select auth.uid()) and cm.student_id = profiles.id
  )
);

create policy "profiles_update_own_or_admin" on public.profiles
for update to authenticated
using (id = (select auth.uid()) or private.is_admin())
with check (id = (select auth.uid()) or private.is_admin());

-- Teacher requests
create policy "teacher_requests_select" on public.teacher_requests
for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

create policy "teacher_requests_insert_own" on public.teacher_requests
for insert to authenticated
with check (user_id = (select auth.uid()) and private.current_user_role() = 'student');

create policy "teacher_requests_update_admin" on public.teacher_requests
for update to authenticated
using (private.is_admin())
with check (private.is_admin());

-- Classes
create policy "classes_select" on public.classes
for select to authenticated
using (
  teacher_id = (select auth.uid())
  or private.is_class_member(id)
  or private.is_admin()
);

create policy "classes_insert_teacher" on public.classes
for insert to authenticated
with check (
  teacher_id = (select auth.uid())
  and private.current_user_role() in ('teacher','admin')
);

create policy "classes_update_teacher" on public.classes
for update to authenticated
using ((teacher_id = (select auth.uid()) and private.current_user_role() = 'teacher') or private.is_admin())
with check ((teacher_id = (select auth.uid()) and private.current_user_role() = 'teacher') or private.is_admin());

create policy "classes_delete_teacher" on public.classes
for delete to authenticated
using ((teacher_id = (select auth.uid()) and private.current_user_role() = 'teacher') or private.is_admin());

-- Class members: insert/remove through RPC for consistent checks.
create policy "class_members_select" on public.class_members
for select to authenticated
using (
  student_id = (select auth.uid())
  or private.is_class_teacher(class_id)
  or private.is_admin()
);

create policy "class_members_delete_teacher_or_self" on public.class_members
for delete to authenticated
using (
  student_id = (select auth.uid())
  or private.is_class_teacher(class_id)
  or private.is_admin()
);

-- Games are public when active; admins can manage all.
create policy "games_public_read" on public.games
for select to anon, authenticated
using (status in ('active','coming_soon') or private.is_admin());

create policy "games_admin_insert" on public.games
for insert to authenticated with check (private.is_admin());
create policy "games_admin_update" on public.games
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "games_admin_delete" on public.games
for delete to authenticated using (private.is_admin());

-- Question sets
create policy "question_sets_select" on public.question_sets
for select to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_admin()
  or (status = 'published' and is_public)
  or exists (
    select 1 from public.assignments a
    join public.class_members cm on cm.class_id = a.class_id
    where a.question_set_id = question_sets.id
      and cm.student_id = (select auth.uid())
      and cm.status = 'active'
      and a.is_active
  )
);

create policy "question_sets_insert" on public.question_sets
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and private.current_user_role() in ('teacher','admin')
);

create policy "question_sets_update" on public.question_sets
for update to authenticated
using ((owner_id = (select auth.uid()) and private.current_user_role() = 'teacher') or private.is_admin())
with check ((owner_id = (select auth.uid()) and private.current_user_role() = 'teacher') or private.is_admin());

create policy "question_sets_delete" on public.question_sets
for delete to authenticated
using ((owner_id = (select auth.uid()) and private.current_user_role() = 'teacher') or private.is_admin());

-- Questions may be read if the containing set is readable.
create policy "questions_select" on public.questions
for select to authenticated
using (
  exists (
    select 1 from public.question_sets qs
    where qs.id = questions.question_set_id
      and (
        qs.owner_id = (select auth.uid())
        or private.is_admin()
        or (qs.status = 'published' and qs.is_public)
      )
  )
);

-- Direct question write is intentionally disabled. Teachers use RPCs below.
-- question_keys has no anon/authenticated policy by design.

-- Assignments
create policy "assignments_select" on public.assignments
for select to authenticated
using (
  created_by = (select auth.uid())
  or private.is_class_teacher(class_id)
  or private.is_class_member(class_id)
  or private.is_admin()
);

create policy "assignments_insert" on public.assignments
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.is_class_teacher(class_id)
);

create policy "assignments_update" on public.assignments
for update to authenticated
using (private.is_class_teacher(class_id))
with check (
  private.is_admin()
  or (private.is_class_teacher(class_id) and created_by = (select auth.uid()))
);

create policy "assignments_delete" on public.assignments
for delete to authenticated
using (private.is_class_teacher(class_id));

-- Game sessions and attempts are inserted only by Edge Functions/service role.
create policy "sessions_select" on public.game_sessions
for select to authenticated
using (
  user_id = (select auth.uid())
  or (class_id is not null and private.is_class_teacher(class_id))
  or private.is_admin()
);

create policy "attempts_select" on public.question_attempts
for select to authenticated
using (
  exists (
    select 1 from public.game_sessions gs
    where gs.id = question_attempts.session_id
      and (
        gs.user_id = (select auth.uid())
        or (gs.class_id is not null and private.is_class_teacher(gs.class_id))
        or private.is_admin()
      )
  )
);

create policy "achievements_public_read" on public.achievements
for select to anon, authenticated
using (is_active);

create policy "user_achievements_select" on public.user_achievements
for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

create policy "audit_admin_select" on public.audit_logs
for select to authenticated
using (private.is_admin());

-- ============================================================
-- Secure RPCs
-- ============================================================
create or replace function public.join_class_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
begin
  if auth.uid() is null then raise exception 'Harus login.'; end if;
  if private.current_user_role() <> 'student' then raise exception 'Hanya akun siswa yang dapat bergabung.'; end if;

  select id into v_class_id
  from public.classes
  where upper(class_code) = upper(trim(p_code)) and is_active
  limit 1;

  if v_class_id is null then raise exception 'Kode kelas tidak ditemukan atau kelas tidak aktif.'; end if;

  insert into public.class_members(class_id, student_id, status)
  values (v_class_id, auth.uid(), 'active')
  on conflict (class_id, student_id) do update set status = 'active';

  return v_class_id;
end;
$$;

create or replace function public.leave_class(p_class_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Harus login.'; end if;
  delete from public.class_members
  where class_id = p_class_id and student_id = auth.uid();
  return found;
end;
$$;

create or replace function public.request_teacher_access(p_note text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Harus login.'; end if;
  if private.current_user_role() <> 'student' then raise exception 'Hanya akun siswa yang dapat mengajukan akses guru.'; end if;
  insert into public.teacher_requests(user_id, note, status)
  values (auth.uid(), left(coalesce(p_note,''), 1000), 'pending')
  on conflict (user_id) do update
    set note = excluded.note, status = 'pending', reviewed_by = null, reviewed_at = null, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_review_teacher_request(p_request_id uuid, p_approve boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid;
begin
  if not private.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  select user_id into v_user_id from public.teacher_requests where id = p_request_id for update;
  if v_user_id is null then raise exception 'Permintaan tidak ditemukan.'; end if;

  update public.teacher_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_request_id;

  if p_approve then update public.profiles set role = 'teacher' where id = v_user_id; end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'review_teacher_request', 'teacher_request', p_request_id::text, jsonb_build_object('approved', p_approve, 'user_id', v_user_id));
  return true;
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  if p_role not in ('student','teacher','admin') then raise exception 'Role tidak valid.'; end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then raise exception 'Admin tidak dapat menurunkan role akun sendiri.'; end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then raise exception 'Pengguna tidak ditemukan.'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'set_user_role', 'profile', p_user_id::text, jsonb_build_object('role', p_role));
  return true;
end;
$$;

create or replace function public.admin_set_game_status(p_game_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  if p_status not in ('active','coming_soon','hidden') then raise exception 'Status game tidak valid.'; end if;
  update public.games set status = p_status where id = p_game_id;
  if not found then raise exception 'Game tidak ditemukan.'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'set_game_status', 'game', p_game_id::text, jsonb_build_object('status', p_status));
  return true;
end;
$$;

create or replace function public.teacher_upsert_question(
  p_question_set_id uuid,
  p_question_id uuid,
  p_category text,
  p_prompt text,
  p_choices jsonb,
  p_correct_index integer,
  p_explanation text default '',
  p_order_index integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_set_status text;
begin
  if not private.can_manage_question_set(p_question_set_id) then raise exception 'Tidak berhak mengelola set soal ini.'; end if;
  select status into v_set_status from public.question_sets where id = p_question_set_id;
  if v_set_status <> 'draft' then raise exception 'Jadikan set sebagai draft sebelum mengubah soal.'; end if;
  if exists (select 1 from public.assignments where question_set_id = p_question_set_id and is_active) then raise exception 'Set sedang dipakai tugas aktif dan tidak dapat diubah.'; end if;
  if jsonb_typeof(p_choices) <> 'array' or jsonb_array_length(p_choices) < 2 or jsonb_array_length(p_choices) > 6 then raise exception 'Pilihan harus berupa 2–6 item.'; end if;
  if exists (select 1 from jsonb_array_elements(p_choices) item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) not between 1 and 500) then raise exception 'Setiap pilihan harus berupa teks 1–500 karakter.'; end if;
  if (select count(*) from jsonb_array_elements_text(p_choices)) <> (select count(distinct lower(trim(value))) from jsonb_array_elements_text(p_choices)) then raise exception 'Pilihan jawaban tidak boleh duplikat.'; end if;
  if p_correct_index < 0 or p_correct_index >= jsonb_array_length(p_choices) then raise exception 'Indeks jawaban benar tidak valid.'; end if;
  if char_length(trim(p_prompt)) not between 5 and 2000 then raise exception 'Pertanyaan harus 5–2000 karakter.'; end if;
  if char_length(trim(p_category)) not between 1 and 80 then raise exception 'Kategori harus 1–80 karakter.'; end if;

  if p_question_id is null then
    insert into public.questions(question_set_id, category, prompt, choices, order_index)
    values (p_question_set_id, left(trim(p_category),80), trim(p_prompt), p_choices, greatest(0,p_order_index))
    returning id into v_id;
  else
    update public.questions
    set category = left(trim(p_category),80), prompt = trim(p_prompt), choices = p_choices,
        order_index = greatest(0,p_order_index), updated_at = now()
    where id = p_question_id and question_set_id = p_question_set_id
    returning id into v_id;
    if v_id is null then raise exception 'Soal tidak ditemukan pada set ini.'; end if;
  end if;

  insert into public.question_keys(question_id, correct_index, explanation)
  values (v_id, p_correct_index, left(coalesce(p_explanation,''),2000))
  on conflict (question_id) do update
    set correct_index = excluded.correct_index, explanation = excluded.explanation, updated_at = now();

  return v_id;
end;
$$;

create or replace function public.teacher_delete_question(p_question_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
  v_set_status text;
begin
  select q.question_set_id, qs.status into v_set_id, v_set_status
  from public.questions q
  join public.question_sets qs on qs.id = q.question_set_id
  where q.id = p_question_id;
  if v_set_id is null then return false; end if;
  if not private.can_manage_question_set(v_set_id) then raise exception 'Tidak berhak menghapus soal ini.'; end if;
  if v_set_status <> 'draft' then raise exception 'Jadikan set sebagai draft sebelum menghapus soal.'; end if;
  if exists (select 1 from public.assignments where question_set_id = v_set_id and is_active) then raise exception 'Set sedang dipakai tugas aktif dan tidak dapat diubah.'; end if;
  delete from public.questions where id = p_question_id;
  return found;
end;
$$;

create or replace function public.teacher_get_questions(p_question_set_id uuid)
returns table (
  id uuid,
  category text,
  prompt text,
  choices jsonb,
  correct_index integer,
  explanation text,
  order_index integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.can_manage_question_set(p_question_set_id) then raise exception 'Tidak berhak membaca kunci jawaban set ini.'; end if;
  return query
  select q.id, q.category, q.prompt, q.choices, k.correct_index, k.explanation, q.order_index
  from public.questions q
  join public.question_keys k on k.question_id = q.id
  where q.question_set_id = p_question_set_id
  order by q.order_index, q.created_at;
end;
$$;

create or replace function public.award_session_rewards(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.game_sessions%rowtype;
  v_base_xp integer := 0;
  v_achievement_xp integer := 0;
  v_achievement_ids jsonb := '[]'::jsonb;
begin
  select * into v_session from public.game_sessions where id = p_session_id for update;
  if v_session.id is null or not v_session.verified then raise exception 'Sesi terverifikasi tidak ditemukan.'; end if;
  if coalesce((v_session.metadata ->> 'rewardsGranted')::boolean, false) then
    return jsonb_build_object('xpAwarded',0,'achievements','[]'::jsonb,'alreadyGranted',true);
  end if;

  v_base_xp := 100 + least(v_session.correct_count, 100) * 20 + case when v_session.result = 'won' then 100 else 0 end;

  with candidates(achievement_id) as (
    select 'first-session'::text
    union all select 'first-win' where v_session.result = 'won'
    union all select 'quiz-ace' where v_session.accuracy >= 90
    union all select 'culture-explorer' where (
      select count(distinct game_id) from public.game_sessions
      where user_id = v_session.user_id and verified
    ) >= 2
  ), inserted as (
    insert into public.user_achievements(user_id, achievement_id)
    select v_session.user_id, achievement_id from candidates
    on conflict do nothing
    returning achievement_id
  )
  select coalesce(sum(a.xp_reward),0), coalesce(jsonb_agg(i.achievement_id),'[]'::jsonb)
  into v_achievement_xp, v_achievement_ids
  from inserted i join public.achievements a on a.id = i.achievement_id;

  update public.profiles
  set xp = xp + v_base_xp + v_achievement_xp
  where id = v_session.user_id;

  update public.game_sessions
  set metadata = jsonb_set(coalesce(metadata,'{}'::jsonb), '{rewardsGranted}', 'true'::jsonb, true)
  where id = p_session_id;

  return jsonb_build_object(
    'xpAwarded', v_base_xp + v_achievement_xp,
    'baseXp', v_base_xp,
    'achievementXp', v_achievement_xp,
    'achievements', v_achievement_ids,
    'alreadyGranted', false
  );
end;
$$;

create or replace function public.get_portal_leaderboard(p_game_slug text default null, p_limit integer default 20)
returns table (
  rank bigint,
  display_name text,
  avatar text,
  game_title text,
  game_slug text,
  score integer,
  accuracy numeric,
  mode text,
  difficulty text,
  level_id text,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by gs.score desc, gs.completed_at asc) as rank,
    coalesce(nullif(split_part(trim(p.full_name),' ',1),''), 'Pemain Nusantara') as display_name,
    p.avatar,
    g.title,
    g.slug,
    gs.score,
    gs.accuracy,
    gs.mode,
    gs.difficulty,
    gs.level_id,
    gs.completed_at
  from public.game_sessions gs
  join public.profiles p on p.id = gs.user_id
  join public.games g on g.id = gs.game_id
  where gs.verified = true
    and (p_game_slug is null or g.slug = p_game_slug)
  order by gs.score desc, gs.completed_at asc
  limit least(greatest(coalesce(p_limit,20),1),100);
$$;

-- Restrict function execution explicitly.
revoke all on function public.join_class_by_code(text) from public;
revoke all on function public.leave_class(uuid) from public;
revoke all on function public.request_teacher_access(text) from public;
revoke all on function public.admin_review_teacher_request(uuid,boolean) from public;
revoke all on function public.admin_set_user_role(uuid,text) from public;
revoke all on function public.admin_set_game_status(uuid,text) from public;
revoke all on function public.teacher_upsert_question(uuid,uuid,text,text,jsonb,integer,text,integer) from public;
revoke all on function public.teacher_delete_question(uuid) from public;
revoke all on function public.teacher_get_questions(uuid) from public;
revoke all on function public.get_portal_leaderboard(text,integer) from public;
revoke all on function public.award_session_rewards(uuid) from public;

grant execute on function public.join_class_by_code(text) to authenticated;
grant execute on function public.leave_class(uuid) to authenticated;
grant execute on function public.request_teacher_access(text) to authenticated;
grant execute on function public.admin_review_teacher_request(uuid,boolean) to authenticated;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;
grant execute on function public.admin_set_game_status(uuid,text) to authenticated;
grant execute on function public.teacher_upsert_question(uuid,uuid,text,text,jsonb,integer,text,integer) to authenticated;
grant execute on function public.teacher_delete_question(uuid) to authenticated;
grant execute on function public.teacher_get_questions(uuid) to authenticated;
grant execute on function public.get_portal_leaderboard(text,integer) to anon, authenticated;
grant execute on function public.award_session_rewards(uuid) to service_role;

-- Hak tabel eksplisit; RLS tetap menjadi pembatas baris.
grant select on table public.games, public.achievements to anon;
grant select on table public.profiles, public.teacher_requests, public.classes, public.class_members,
  public.games, public.question_sets, public.questions, public.assignments, public.game_sessions,
  public.question_attempts, public.achievements, public.user_achievements, public.audit_logs to authenticated;
grant insert on table public.classes, public.question_sets, public.assignments, public.games to authenticated;
grant update on table public.classes, public.question_sets, public.assignments, public.games to authenticated;
grant delete on table public.classes, public.class_members, public.question_sets, public.assignments, public.games to authenticated;

-- Profil browser hanya dapat mengubah kolom identitas aman. Role dan XP wajib melalui RPC/fungsi server.
revoke update on table public.profiles from authenticated;
grant update (full_name, school_name, class_label, avatar) on table public.profiles to authenticated;
revoke insert, update on table public.teacher_requests from authenticated;

revoke all on table public.question_keys from anon, authenticated;
revoke insert, update, delete on table public.game_sessions from anon, authenticated;
revoke insert, update, delete on table public.question_attempts from anon, authenticated;
revoke insert, update, delete on table public.user_achievements from anon, authenticated;
revoke all on table public.audit_logs from anon;

-- ============================================================
-- Seed data
-- ============================================================
insert into public.games(slug,title,description,launch_path,icon,subjects,status,max_score)
values
  ('gobak-sodor','Gobak Sodor Nusantara','Strategi, gotong royong, dan kuis adaptif dalam permainan tradisional.','games/gobak-sodor/game.html','🏃','["Informatika","IPS","IPA","Matematika","Bahasa Indonesia"]'::jsonb,'active',100000),
  ('jelajah-nusantara','Jelajah Nusantara','Petualangan kuis budaya dan geografi dari barat hingga timur Indonesia.','games/jelajah-nusantara/','🧭','["IPS","Bahasa Indonesia","Budaya"]'::jsonb,'active',20000),
  ('congklak-cerdas','Congklak Cerdas','Permainan berhitung dan perencanaan berbasis congklak.','games/congklak/','🌰','["Matematika","Strategi"]'::jsonb,'coming_soon',50000),
  ('engklek-pintar','Engklek Pintar','Tantangan koordinasi dan pengetahuan sekolah.','games/engklek/','🦶','["Campuran"]'::jsonb,'coming_soon',50000),
  ('bentengan-nusantara','Bentengan Nusantara','Strategi tim untuk menjaga dan merebut benteng.','games/bentengan/','🏰','["Strategi","IPS"]'::jsonb,'coming_soon',80000)
on conflict (slug) do update set
  title=excluded.title, description=excluded.description, launch_path=excluded.launch_path,
  icon=excluded.icon, subjects=excluded.subjects, status=excluded.status, max_score=excluded.max_score,
  updated_at=now();

insert into public.achievements(id,name,description,icon,xp_reward)
values
  ('first-session','Langkah Pertama','Selesaikan satu sesi permainan.','🎮',100),
  ('first-win','Juara Pertama','Menangkan satu ronde permainan.','🏆',200),
  ('quiz-ace','Cerdas Nusantara','Capai akurasi 90% atau lebih dalam satu sesi.','🧠',250),
  ('culture-explorer','Penjelajah Budaya','Mainkan dua game Nusantara yang berbeda.','🧭',300)
on conflict (id) do update set name=excluded.name,description=excluded.description,icon=excluded.icon,xp_reward=excluded.xp_reward;

-- Admin pertama harus ditetapkan manual setelah akun dibuat:
-- update public.profiles set role='admin' where id='<UUID PENGGUNA>';
