-- Add a full serialised GameState payload column to game_state.
-- This lets the client store and retrieve the entire state as a single JSONB blob
-- while the other columns remain as denormalised query-friendly fields.

alter table game_state
  add column if not exists payload jsonb not null default '{}';

-- Enable REPLICA IDENTITY FULL so Realtime delivers the full row on UPDATE.
alter table game_state  replica identity full;
alter table action_log  replica identity full;
