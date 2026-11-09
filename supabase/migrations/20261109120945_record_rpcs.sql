-- Atomic write paths used by the app. SECURITY INVOKER: every statement runs under the caller's RLS.
-- The domain layer in the client computes stars/tier/xp/badges; these functions persist them in one transaction.

create or replace function public.record_round(
  p_child_id    uuid,
  p_grade       smallint,
  p_topic       text,
  p_tier_before smallint,
  p_tier_after  smallint,
  p_first_try   smallint,
  p_second_try  smallint,
  p_missed      smallint,
  p_best_combo  smallint,
  p_stars       smallint,
  p_xp_gained   integer,
  p_bonus_xp    integer,
  p_details     jsonb,
  p_today       date,
  p_streak      integer,
  p_badges      text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.children c where c.id = p_child_id and c.parent_id = (select auth.uid())
  ) then
    raise exception 'child not found' using errcode = '42501';
  end if;
  if p_bonus_xp < 0 or p_bonus_xp > 100 then
    raise exception 'invalid bonus xp' using errcode = 'check_violation';
  end if;

  insert into public.rounds (child_id, grade, topic, tier_before, tier_after, first_try, second_try, missed,
                             best_combo, stars, xp_gained, details)
  values (p_child_id, p_grade, p_topic, p_tier_before, p_tier_after, p_first_try, p_second_try, p_missed,
          p_best_combo, p_stars, p_xp_gained, coalesce(p_details, '[]'::jsonb));

  insert into public.topic_progress as tp (child_id, grade, topic, tier, best_stars, answered, correct)
  values (p_child_id, p_grade, p_topic, p_tier_after, p_stars, 10, p_first_try + p_second_try)
  on conflict (child_id, grade, topic) do update
    set tier       = excluded.tier,
        best_stars = greatest(tp.best_stars, excluded.best_stars),
        answered   = tp.answered + excluded.answered,
        correct    = tp.correct + excluded.correct;

  insert into public.daily_activity as da (child_id, day, rounds, bonus_claimed)
  values (p_child_id, p_today, 1, p_bonus_xp > 0)
  on conflict (child_id, day) do update
    set rounds = da.rounds + 1,
        bonus_claimed = da.bonus_claimed or excluded.bonus_claimed;

  update public.children
     set xp           = xp + p_xp_gained + p_bonus_xp,
         streak       = p_streak,
         last_played  = greatest(coalesce(last_played, p_today), p_today),
         rounds_total = rounds_total + 1
   where id = p_child_id;

  insert into public.child_badges (child_id, badge_id)
  select p_child_id, b from unnest(coalesce(p_badges, '{}'::text[])) as b
  on conflict do nothing;
end;
$$;

create or replace function public.record_race(
  p_child_id   uuid,
  p_grade      smallint,
  p_score      smallint,
  p_best_combo smallint,
  p_xp_gained  integer,
  p_badges     text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.children c where c.id = p_child_id and c.parent_id = (select auth.uid())
  ) then
    raise exception 'child not found' using errcode = '42501';
  end if;
  if p_xp_gained < 0 or p_xp_gained > 1000 then
    raise exception 'invalid xp' using errcode = 'check_violation';
  end if;

  insert into public.race_scores (child_id, grade, score, best_combo)
  values (p_child_id, p_grade, p_score, p_best_combo);

  update public.children
     set race_best = greatest(race_best, p_score),
         xp        = xp + p_xp_gained
   where id = p_child_id;

  insert into public.child_badges (child_id, badge_id)
  select p_child_id, b from unnest(coalesce(p_badges, '{}'::text[])) as b
  on conflict do nothing;
end;
$$;

revoke execute on function public.record_round(uuid, smallint, text, smallint, smallint, smallint, smallint, smallint, smallint, smallint, integer, integer, jsonb, date, integer, text[]) from public, anon;
revoke execute on function public.record_race(uuid, smallint, smallint, smallint, integer, text[]) from public, anon;
grant execute on function public.record_round(uuid, smallint, text, smallint, smallint, smallint, smallint, smallint, smallint, smallint, integer, integer, jsonb, date, integer, text[]) to authenticated;
grant execute on function public.record_race(uuid, smallint, smallint, smallint, integer, text[]) to authenticated;
