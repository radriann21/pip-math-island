-- RLS regression test. Run it against the project (MCP execute_sql / SQL editor).
-- It creates two fake parents inside a transaction and ALWAYS finishes by raising an exception,
-- so nothing is persisted. Expected outcome: the error message `RLS_TEST_OK (rolled back)`.
-- Any other message starting with `FAIL:` is a real regression.
do $$
declare
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  ca uuid; cb uuid; n int; v_xp int; rc int;
begin
  insert into auth.users (id, email, aud, role) values
    (ua, 'rls-a@test.local', 'authenticated', 'authenticated'),
    (ub, 'rls-b@test.local', 'authenticated', 'authenticated');
  insert into public.children (parent_id, name, grade) values (ua, 'A', 1) returning id into ca;
  insert into public.children (parent_id, name, grade) values (ub, 'B', 2) returning id into cb;

  -- act as parent A
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);

  select count(*) into n from public.children;
  if n <> 1 then raise exception 'FAIL: A sees % children (expected 1)', n; end if;

  perform public.record_round(ca, 1::smallint, 'add', 0::smallint, 1::smallint, 9::smallint, 1::smallint, 0::smallint,
                              7::smallint, 3::smallint, 120, 30, '[]'::jsonb, current_date, 1, array['first','perfect']);
  select xp into v_xp from public.children where id = ca;
  if v_xp <> 150 then raise exception 'FAIL: xp=% (expected 150)', v_xp; end if;
  select count(*) into n from public.topic_progress where child_id = ca and tier = 1 and best_stars = 3 and answered = 10 and correct = 10;
  if n <> 1 then raise exception 'FAIL: topic_progress not upserted'; end if;
  select count(*) into n from public.child_badges where child_id = ca;
  if n <> 2 then raise exception 'FAIL: badges=% (expected 2)', n; end if;

  -- second round accumulates and keeps best stars
  perform public.record_round(ca, 1::smallint, 'add', 1::smallint, 1::smallint, 5::smallint, 3::smallint, 2::smallint,
                              2::smallint, 1::smallint, 60, 0, '[]'::jsonb, current_date, 1, array['first']);
  select count(*) into n from public.topic_progress where child_id = ca and best_stars = 3 and answered = 20 and correct = 18;
  if n <> 1 then raise exception 'FAIL: progress did not accumulate / best_stars regressed'; end if;
  select count(*) into n from public.daily_activity where child_id = ca and rounds = 2 and bonus_claimed;
  if n <> 1 then raise exception 'FAIL: daily_activity'; end if;

  -- A must NOT write B's data through the RPC ...
  begin
    perform public.record_round(cb, 2::smallint, 'add', 0::smallint, 0::smallint, 5::smallint, 3::smallint, 2::smallint,
                                2::smallint, 1::smallint, 60, 0, '[]'::jsonb, current_date, 1, array[]::text[]);
    raise exception 'FAIL: A wrote to B via record_round';
  exception when insufficient_privilege then null;
  end;
  -- ... nor with direct inserts
  begin
    insert into public.rounds (child_id, grade, topic, tier_before, tier_after, first_try, second_try, missed, best_combo, stars, xp_gained)
    values (cb, 2, 'add', 0, 0, 10, 0, 0, 10, 3, 100);
    raise exception 'FAIL: A inserted a round for B';
  exception when insufficient_privilege then null;
  end;
  -- ... nor update B's profile (RLS filters the row: 0 rows affected)
  update public.children set name = 'hacked' where id = cb;
  get diagnostics rc = row_count;
  if rc <> 0 then raise exception 'FAIL: A updated B (% rows)', rc; end if;
  -- ... nor reassign own child to someone else
  begin
    update public.children set parent_id = ub where id = ca;
    raise exception 'FAIL: A reassigned child to B';
  exception when insufficient_privilege then null;
  end;
  -- invalid data is rejected by constraints
  begin
    perform public.record_round(ca, 1::smallint, 'add', 0::smallint, 0::smallint, 9::smallint, 9::smallint, 9::smallint,
                                2::smallint, 1::smallint, 60, 0, '[]'::jsonb, current_date, 1, array[]::text[]);
    raise exception 'FAIL: invalid round accepted';
  exception when check_violation then null;
  end;

  -- anon has no access at all
  reset role;
  set local role anon;
  begin
    perform 1 from public.children limit 1;
    raise exception 'FAIL: anon can read children';
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise exception 'RLS_TEST_OK (rolled back)';
end $$;
