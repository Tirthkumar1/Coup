-- This drops all foreign key constraints on the columns before altering them.
-- It dynamically finds the constraint names so it won't fail if the names differ.

do $$
declare
    r record;
begin
    -- Drop FK constraints for players.user_id
    for r in (
        select tc.constraint_name 
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu 
          on tc.constraint_name = kcu.constraint_name
        where tc.table_name = 'players' and kcu.column_name = 'user_id' and tc.constraint_type = 'FOREIGN KEY'
    ) loop
        execute 'alter table players drop constraint ' || r.constraint_name;
    end loop;

    -- Drop FK constraints for game_state.current_turn_user_id
    for r in (
        select tc.constraint_name 
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu 
          on tc.constraint_name = kcu.constraint_name
        where tc.table_name = 'game_state' and kcu.column_name = 'current_turn_user_id' and tc.constraint_type = 'FOREIGN KEY'
    ) loop
        execute 'alter table game_state drop constraint ' || r.constraint_name;
    end loop;

    -- Drop FK constraints for action_log.actor_id and target_id
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

-- Now forcefully alter the column types
alter table players       alter column user_id type text using user_id::text;
alter table game_state    alter column current_turn_user_id type text using current_turn_user_id::text;
alter table action_log    alter column actor_id type text using actor_id::text;
alter table action_log    alter column target_id type text using target_id::text;
