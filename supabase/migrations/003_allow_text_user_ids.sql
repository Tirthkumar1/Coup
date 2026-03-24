-- Supabase's auth.users(id) is a UUID, but our local bot logic
-- generates a string like "bot_12345" for the user_id. We need
-- to change user_id on the players table to text so both can coexist.

alter table players alter column user_id type text using user_id::text;
alter table game_state alter column current_turn_user_id type text using current_turn_user_id::text;
alter table game_state alter column winner_id type text using winner_id::text;
alter table game_state alter column losing_influence_user_id type text using losing_influence_user_id::text;
alter table action_log alter column actor_id type text using actor_id::text;
alter table action_log alter column target_id type text using target_id::text;
