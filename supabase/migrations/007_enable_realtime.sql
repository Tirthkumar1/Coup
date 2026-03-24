-- 007_enable_realtime.sql
-- Enable Realtime for all tables used in the lobby and game

-- 1. Ensure REPLICA IDENTITY is FULL for all tables to get complete updates
alter table rooms   replica identity full;
alter table players replica identity full;

-- 2. Recreate the publication for all relevant tables
drop publication if exists supabase_realtime;

create publication supabase_realtime
  for table rooms, players, game_state, action_log;
