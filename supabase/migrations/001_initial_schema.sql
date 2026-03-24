-- =============================================================================
-- Coup Multiplayer Card Game – Initial Schema
-- =============================================================================
-- rooms       : A game lobby identified by a short join code. Tracks status
--               (waiting / active / finished) and optional settings (JSONB).
-- players     : One row per user per room. Holds coin count, influence cards,
--               and elimination status. Cascades on room deletion.
-- game_state  : Single row per room (1-1). Authoritative game state: whose
--               turn it is, the deck, and treasury coins. Updated every action.
-- action_log  : Append-only log of every action taken during a game. Used for
--               Realtime feed, history replay, and dispute resolution.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ROOMS
-- ---------------------------------------------------------------------------
create table if not exists rooms (
  id          uuid        primary key default gen_random_uuid(),
  code        text        unique not null,          -- 4-digit join code
  status      text        not null default 'waiting'
                          check (status in ('waiting', 'active', 'finished')),
  host_id     uuid        references auth.users (id),
  settings    jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists rooms_host_id_idx on rooms (host_id);

alter table rooms enable row level security;

-- Any authenticated user can read a room (needed to join by code).
create policy "rooms: read by authenticated"
  on rooms for select
  to authenticated
  using (true);

-- Only the host can update or delete the room.
create policy "rooms: host can update"
  on rooms for update
  to authenticated
  using (auth.uid() = host_id);

create policy "rooms: host can delete"
  on rooms for delete
  to authenticated
  using (auth.uid() = host_id);

-- Any authenticated user can create a room (they become the host).
create policy "rooms: authenticated can insert"
  on rooms for insert
  to authenticated
  with check (auth.uid() = host_id);

-- ---------------------------------------------------------------------------
-- PLAYERS
-- ---------------------------------------------------------------------------
create table if not exists players (
  id              uuid        primary key default gen_random_uuid(),
  room_id         uuid        not null references rooms (id) on delete cascade,
  user_id         uuid        references auth.users (id),
  display_name    text        not null,
  coins           integer     not null default 2,
  cards           jsonb       not null default '[]', -- [{character, revealed}]
  is_eliminated   boolean     not null default false,
  joined_at       timestamptz not null default now()
);

create index if not exists players_room_id_idx   on players (room_id);
create index if not exists players_user_id_idx   on players (user_id);

alter table players enable row level security;

-- Helper: is the current user a member of a given room?
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from players
    where room_id = p_room_id
      and user_id = auth.uid()
  );
$$;

-- Players can only see rows for rooms they have joined.
create policy "players: members can read"
  on players for select
  to authenticated
  using (public.is_room_member(room_id));

-- Users can insert their own player row.
create policy "players: self insert"
  on players for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own player row (e.g. name change pre-game).
-- Game engine updates (coins, cards, eliminated) go through service-role calls.
create policy "players: self update"
  on players for update
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- GAME STATE
-- ---------------------------------------------------------------------------
create table if not exists game_state (
  id                   uuid        primary key default gen_random_uuid(),
  room_id              uuid        not null unique references rooms (id) on delete cascade,
  phase                text        not null default 'waiting',
  current_turn_user_id uuid,       -- auth.users id of whose turn it is
  deck                 jsonb       not null default '[]', -- remaining shuffled deck
  treasury_coins       integer     not null default 30,
  updated_at           timestamptz not null default now()
);

create index if not exists game_state_room_id_idx on game_state (room_id);

alter table game_state enable row level security;

-- Only room members may read the game state.
create policy "game_state: members can read"
  on game_state for select
  to authenticated
  using (public.is_room_member(room_id));

-- Only the host may insert the initial game state row.
create policy "game_state: host can insert"
  on game_state for insert
  to authenticated
  with check (
    exists (
      select 1 from rooms
      where id = room_id and host_id = auth.uid()
    )
  );

-- Updates go through service-role (server-side logic). Direct client updates
-- are restricted to the host for now; tighten once a backend is in place.
create policy "game_state: host can update"
  on game_state for update
  to authenticated
  using (
    exists (
      select 1 from rooms
      where id = room_id and host_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- ACTION LOG
-- ---------------------------------------------------------------------------
create table if not exists action_log (
  id              uuid        primary key default gen_random_uuid(),
  game_state_id   uuid        not null references game_state (id) on delete cascade,
  actor_id        uuid        references auth.users (id),
  action_type     text        not null,
  target_id       uuid        references auth.users (id),
  payload         jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists action_log_game_state_id_idx on action_log (game_state_id);
create index if not exists action_log_actor_id_idx      on action_log (actor_id);

alter table action_log enable row level security;

-- Members of the room can read the action log (via game_state → room).
create policy "action_log: members can read"
  on action_log for select
  to authenticated
  using (
    exists (
      select 1
      from game_state gs
      where gs.id = game_state_id
        and public.is_room_member(gs.room_id)
    )
  );

-- The acting user can insert their own actions.
create policy "action_log: actor can insert"
  on action_log for insert
  to authenticated
  with check (auth.uid() = actor_id);

-- ---------------------------------------------------------------------------
-- REALTIME PUBLICATIONS
-- Enable Realtime on the tables clients need to subscribe to.
-- ---------------------------------------------------------------------------
drop publication if exists supabase_realtime;

create publication supabase_realtime
  for table game_state, action_log;
