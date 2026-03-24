do $$
declare
    r record;
begin
    -- 1. Drop the RLS policies that depend on the columns
    drop policy if exists "players: self insert" on players;
    drop policy if exists "players: self update" on players;
    drop policy if exists "action_log: actor can insert" on action_log;

    -- 2. Drop the original foreign keys dynamically
    for r in (
        select tc.constraint_name 
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu 
          on tc.constraint_name = kcu.constraint_name
        where tc.table_name = 'players' and kcu.column_name = 'user_id' and tc.constraint_type = 'FOREIGN KEY'
    ) loop
        execute 'alter table players drop constraint ' || r.constraint_name;
    end loop;

    for r in (
        select tc.constraint_name 
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu 
          on tc.constraint_name = kcu.constraint_name
        where tc.table_name = 'game_state' and kcu.column_name = 'current_turn_user_id' and tc.constraint_type = 'FOREIGN KEY'
    ) loop
        execute 'alter table game_state drop constraint ' || r.constraint_name;
    end loop;

    for r in (
        select tc.constraint_name 
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu 
          on tc.constraint_name = kcu.constraint_name
        where tc.table_name = 'action_log' and kcu.column_name in ('actor_id', 'target_id') and tc.constraint_type = 'FOREIGN KEY'
    ) loop
        execute 'alter table action_log drop constraint ' || r.constraint_name;
    end loop;

end $$;

-- 3. Alter the columns from UUID to TEXT
alter table players       alter column user_id type text using user_id::text;
alter table game_state    alter column current_turn_user_id type text using current_turn_user_id::text;
alter table action_log    alter column actor_id type text using actor_id::text;
alter table action_log    alter column target_id type text using target_id::text;

-- 4. Re-create the RLS policies with text casting to match auth.uid()
create policy "players: self insert" on players for insert to authenticated with check (auth.uid()::text = user_id);
create policy "players: self update" on players for update to authenticated using (auth.uid()::text = user_id);
create policy "action_log: actor can insert" on action_log for insert to authenticated with check (auth.uid()::text = actor_id);
