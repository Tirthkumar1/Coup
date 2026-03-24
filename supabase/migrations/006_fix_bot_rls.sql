-- 006_fix_bot_rls.sql
-- Allow room hosts to manage players (needed for bots)

-- 1. Drop existing policies to redefine them
drop policy if exists "players: self insert" on players;
drop policy if exists "players: self update" on players;

-- 2. New insert policy: 
--    Allow if user_id matches OR if the requester is the host of the room.
create policy "players: insert policy"
  on players for insert
  to authenticated
  with check (
    (auth.uid()::text = user_id) OR
    exists (
      select 1 from rooms
      where id = room_id and host_id = auth.uid()
    )
  );

-- 3. New update policy:
--    Allow if user_id matches OR if the requester is the host of the room.
create policy "players: update policy"
  on players for update
  to authenticated
  using (
    (auth.uid()::text = user_id) OR
    exists (
      select 1 from rooms
      where id = room_id and host_id = auth.uid()
    )
  )
  with check (
    (auth.uid()::text = user_id) OR
    exists (
      select 1 from rooms
      where id = room_id and host_id = auth.uid()
    )
  );
