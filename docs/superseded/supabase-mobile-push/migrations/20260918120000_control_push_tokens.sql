-- Control Tower 0.3.0 — device push tokens (owner-scoped).
-- Target project: tbqdpvmlhtlrngoxbouf (Control Tower backend).
-- Apply with: supabase db push   (or paste into the SQL editor of that project)
--
-- Security model: one row per FCM token, owned by the authenticated user that registered it.
-- RLS restricts every operation to auth.uid() = user_id. No anon access. No public grants.

create table if not exists public.control_push_tokens (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
    token         text not null unique,
    platform      text not null default 'android' check (platform in ('android')),
    app_version   text,
    build_sha     text,
    device_label  text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    last_seen_at  timestamptz not null default now()
);

comment on table public.control_push_tokens is
    'FCM device tokens for Control Tower push. One row per token; owner-scoped by RLS.';

create index if not exists control_push_tokens_user_id_idx on public.control_push_tokens (user_id);

-- Keep updated_at / last_seen_at server-side; the client never sets them.
create or replace function public.control_push_tokens_touch()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    new.last_seen_at := now();
    return new;
end;
$$;

drop trigger if exists control_push_tokens_touch on public.control_push_tokens;
create trigger control_push_tokens_touch
    before update on public.control_push_tokens
    for each row execute function public.control_push_tokens_touch();

alter table public.control_push_tokens enable row level security;

drop policy if exists "owner selects own push tokens" on public.control_push_tokens;
create policy "owner selects own push tokens"
    on public.control_push_tokens for select
    to authenticated
    using (user_id = auth.uid());

drop policy if exists "owner inserts own push tokens" on public.control_push_tokens;
create policy "owner inserts own push tokens"
    on public.control_push_tokens for insert
    to authenticated
    with check (user_id = auth.uid());

drop policy if exists "owner updates own push tokens" on public.control_push_tokens;
create policy "owner updates own push tokens"
    on public.control_push_tokens for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "owner deletes own push tokens" on public.control_push_tokens;
create policy "owner deletes own push tokens"
    on public.control_push_tokens for delete
    to authenticated
    using (user_id = auth.uid());

-- Explicit grants: authenticated only. anon gets nothing (matches the other control_* tables).
revoke all on public.control_push_tokens from anon;
grant select, insert, update, delete on public.control_push_tokens to authenticated;
