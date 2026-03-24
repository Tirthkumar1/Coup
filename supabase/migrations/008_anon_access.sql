-- 008_anon_access.sql
-- Allow guest players (anon role) to participate in the game

-- 1. Rooms: Allow anyone (anon/authenticated) to find a room by code
drop policy if exists "rooms: read by authenticated" on rooms;
create policy "rooms: read policy" on rooms for select to anon, authenticated using (true);

-- 2. Players: Allow anyone to join (insert), read the list, and update their own guest row
drop policy if exists "players: insert policy" on players;
create policy "players: insert policy" on players for insert to anon, authenticated 
with check (
  (auth.uid()::text = user_id) OR 
  exists (select 1 from rooms where id = room_id and host_id = auth.uid()) OR
  (auth.role() = 'anon')
);

drop policy if exists "players: members can read" on players;
create policy "players: read policy" on players for select to anon, authenticated using (true);

drop policy if exists "players: update policy" on players;
create policy "players: update policy" on players for update to anon, authenticated 
using (
  (auth.uid()::text = user_id) OR 
  exists (select 1 from rooms where id = room_id and host_id = auth.uid()) OR
  (auth.role() = 'anon')
);

-- 3. Game State: Allow anyone to read the game state
drop policy if exists "game_state: members can read" on game_state;
create policy "game_state: read policy" on game_state for select to anon, authenticated using (true);

-- 4. Action Log: Allow anyone to read and insert actions
drop policy if exists "action_log: members can read" on action_log;
create policy "action_log: read policy" on action_log for select to anon, authenticated using (true);

drop policy if exists "action_log: actor can insert" on action_log;
create policy "action_log: insert policy" on action_log for insert to anon, authenticated 
with check (
  (auth.uid()::text = actor_id) OR
  (auth.role() = 'anon')
);
