-- Pip's Math Island: core schema.
-- Ownership model: a parent (auth.users) owns child profiles; every other row hangs off a child.
-- All tables have RLS enabled. Only the `authenticated` role is granted access (never `anon`).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- children
create table public.children (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid not null references auth.users (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 24),
  grade         smallint not null check (grade between 1 and 6),
  locale        text not null default 'en' check (locale in ('en', 'es')),
  sound_enabled boolean not null default true,
  xp            integer not null default 0 check (xp >= 0),
  streak        integer not null default 0 check (streak >= 0),
  last_played   date,
  rounds_total  integer not null default 0 check (rounds_total >= 0),
  race_best     integer not null default 0 check (race_best >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index children_parent_id_idx on public.children (parent_id);
create trigger children_set_updated_at before update on public.children
  for each row execute function public.set_updated_at();

create or replace function public.enforce_max_children()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select count(*) from public.children where parent_id = new.parent_id) >= 8 then
    raise exception 'A parent can have at most 8 child profiles' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger children_max_per_parent before insert on public.children
  for each row execute function public.enforce_max_children();

-- ---------------------------------------------------------------- topic_progress
create table public.topic_progress (
  child_id   uuid not null references public.children (id) on delete cascade,
  grade      smallint not null check (grade between 1 and 6),
  topic      text not null check (topic in ('count','add','sub','mul','div','frac','place','time','money','geo','pattern','word')),
  tier       smallint not null default 0 check (tier between 0 and 2),
  best_stars smallint not null default 0 check (best_stars between 0 and 3),
  answered   integer not null default 0 check (answered >= 0),
  correct    integer not null default 0 check (correct >= 0 and correct <= answered),
  updated_at timestamptz not null default now(),
  primary key (child_id, grade, topic)
);
create trigger topic_progress_set_updated_at before update on public.topic_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- rounds (history)
create table public.rounds (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  grade       smallint not null check (grade between 1 and 6),
  topic       text not null check (topic in ('count','add','sub','mul','div','frac','place','time','money','geo','pattern','word')),
  tier_before smallint not null check (tier_before between 0 and 2),
  tier_after  smallint not null check (tier_after between 0 and 2),
  first_try   smallint not null check (first_try between 0 and 10),
  second_try  smallint not null check (second_try between 0 and 10),
  missed      smallint not null check (missed between 0 and 10),
  best_combo  smallint not null check (best_combo between 0 and 10),
  stars       smallint not null check (stars between 0 and 3),
  xp_gained   integer not null check (xp_gained between 0 and 200),
  details     jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  played_at   timestamptz not null default now(),
  check (first_try + second_try + missed = 10)
);
create index rounds_child_played_idx on public.rounds (child_id, played_at desc);

-- ---------------------------------------------------------------- stickers
create table public.child_badges (
  child_id  uuid not null references public.children (id) on delete cascade,
  badge_id  text not null check (char_length(badge_id) between 1 and 40),
  earned_at timestamptz not null default now(),
  primary key (child_id, badge_id)
);

-- ---------------------------------------------------------------- quick race
create table public.race_scores (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children (id) on delete cascade,
  grade      smallint not null check (grade between 1 and 6),
  score      smallint not null check (score between 0 and 500),
  best_combo smallint not null default 0 check (best_combo between 0 and 500),
  played_at  timestamptz not null default now()
);
create index race_scores_child_played_idx on public.race_scores (child_id, played_at desc);

-- ---------------------------------------------------------------- daily goal
create table public.daily_activity (
  child_id      uuid not null references public.children (id) on delete cascade,
  day           date not null,
  rounds        integer not null default 0 check (rounds >= 0),
  bonus_claimed boolean not null default false,
  primary key (child_id, day)
);

-- ---------------------------------------------------------------- RLS
alter table public.children        enable row level security;
alter table public.topic_progress  enable row level security;
alter table public.rounds          enable row level security;
alter table public.child_badges    enable row level security;
alter table public.race_scores     enable row level security;
alter table public.daily_activity  enable row level security;

create policy "parents read own children"   on public.children for select to authenticated
  using (parent_id = (select auth.uid()));
create policy "parents create own children" on public.children for insert to authenticated
  with check (parent_id = (select auth.uid()));
create policy "parents update own children" on public.children for update to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
create policy "parents delete own children" on public.children for delete to authenticated
  using (parent_id = (select auth.uid()));

-- topic_progress
create policy "parents read child progress"   on public.topic_progress for select to authenticated
  using (exists (select 1 from public.children c where c.id = topic_progress.child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child progress" on public.topic_progress for insert to authenticated
  with check (exists (select 1 from public.children c where c.id = topic_progress.child_id and c.parent_id = (select auth.uid())));
create policy "parents update child progress" on public.topic_progress for update to authenticated
  using (exists (select 1 from public.children c where c.id = topic_progress.child_id and c.parent_id = (select auth.uid())))
  with check (exists (select 1 from public.children c where c.id = topic_progress.child_id and c.parent_id = (select auth.uid())));

-- rounds
create policy "parents read child rounds"   on public.rounds for select to authenticated
  using (exists (select 1 from public.children c where c.id = rounds.child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child rounds" on public.rounds for insert to authenticated
  with check (exists (select 1 from public.children c where c.id = rounds.child_id and c.parent_id = (select auth.uid())));

-- child_badges
create policy "parents read child badges"   on public.child_badges for select to authenticated
  using (exists (select 1 from public.children c where c.id = child_badges.child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child badges" on public.child_badges for insert to authenticated
  with check (exists (select 1 from public.children c where c.id = child_badges.child_id and c.parent_id = (select auth.uid())));

-- race_scores
create policy "parents read child races"   on public.race_scores for select to authenticated
  using (exists (select 1 from public.children c where c.id = race_scores.child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child races" on public.race_scores for insert to authenticated
  with check (exists (select 1 from public.children c where c.id = race_scores.child_id and c.parent_id = (select auth.uid())));

-- daily_activity
create policy "parents read child activity"   on public.daily_activity for select to authenticated
  using (exists (select 1 from public.children c where c.id = daily_activity.child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child activity" on public.daily_activity for insert to authenticated
  with check (exists (select 1 from public.children c where c.id = daily_activity.child_id and c.parent_id = (select auth.uid())));
create policy "parents update child activity" on public.daily_activity for update to authenticated
  using (exists (select 1 from public.children c where c.id = daily_activity.child_id and c.parent_id = (select auth.uid())))
  with check (exists (select 1 from public.children c where c.id = daily_activity.child_id and c.parent_id = (select auth.uid())));

-- ---------------------------------------------------------------- grants (Data API exposure)
revoke all on public.children, public.topic_progress, public.rounds, public.child_badges,
              public.race_scores, public.daily_activity from anon, authenticated;
grant select, insert, update, delete on public.children       to authenticated;
grant select, insert, update         on public.topic_progress to authenticated;
grant select, insert                 on public.rounds         to authenticated;
grant select, insert                 on public.child_badges   to authenticated;
grant select, insert                 on public.race_scores    to authenticated;
grant select, insert, update         on public.daily_activity to authenticated;
