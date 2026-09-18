-- Control Tower 0.3.0 — high-signal push events (OPTIONAL, apply after 20260918120000_control_push_tokens.sql).
--
-- Fires the control-tower-push Edge Function only on two transitions of control_portfolio:
--   * rag becomes 'RED'            (event = project_red)
--   * needs_ariel flips to true    (event = needs_ariel)
-- Nothing fires on ordinary status refreshes, so there is no notification noise.
--
-- Requires:
--   1. pg_net extension (Dashboard -> Database -> Extensions -> pg_net).
--   2. Vault secrets in this project:
--        control_tower_push_url       = https://tbqdpvmlhtlrngoxbouf.supabase.co/functions/v1/control-tower-push
--        control_tower_service_role   = <service_role key>   (lets the call pass the gateway's JWT check)
--        control_tower_internal       = <same value as the CONTROL_TOWER_INTERNAL_SECRET function secret>
--      e.g.  select vault.create_secret('https://.../functions/v1/control-tower-push', 'control_tower_push_url');
-- If the secrets are missing the trigger logs a notice and does nothing; it never fails the update.

create extension if not exists pg_net with schema extensions;

create or replace function public.control_portfolio_push_notify()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
    v_url      text;
    v_role     text;
    v_internal text;
    v_event    text;
    v_title    text;
    v_body     text;
    v_target   text;
    v_pid      text;
begin
    if tg_op = 'UPDATE' and new.rag = 'RED' and coalesce(old.rag, '') <> 'RED' then
        v_event  := 'project_red';
        v_title  := 'פרויקט הפך לאדום: ' || coalesce(new.project_name, '');
        v_body   := coalesce(nullif(new.blocker_dependency, ''), nullif(new.next_action, ''), 'נדרשת בדיקת שליטה עכשיו.');
        v_target := 'projects';
    elsif tg_op = 'UPDATE' and coalesce(new.needs_ariel, false) and not coalesce(old.needs_ariel, false) then
        v_event  := 'needs_ariel';
        v_title  := 'החלטה ממתינה לך: ' || coalesce(new.project_name, '');
        v_body   := coalesce(nullif(new.ariel_decision_input, ''), 'פרויקט ממתין להחלטה שלך.');
        v_target := 'now';
    else
        return new;
    end if;

    select decrypted_secret into v_url      from vault.decrypted_secrets where name = 'control_tower_push_url'     limit 1;
    select decrypted_secret into v_role     from vault.decrypted_secrets where name = 'control_tower_service_role' limit 1;
    select decrypted_secret into v_internal from vault.decrypted_secrets where name = 'control_tower_internal'     limit 1;
    if v_url is null or v_role is null or v_internal is null then
        raise notice 'control_portfolio_push_notify: vault secrets missing, push skipped';
        return new;
    end if;

    -- Best-effort project identifier for future deep-link routing; tolerate tables without an id column.
    begin
        v_pid := to_jsonb(new) ->> 'id';
    exception when others then
        v_pid := null;
    end;

    perform net.http_post(
        url     := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_role,
            'x-control-tower-internal', v_internal
        ),
        body    := jsonb_build_object(
            'event', v_event,
            'title', left(v_title, 80),
            'body', left(v_body, 160),
            'target', v_target,
            'project_id', v_pid
        )
    );
    return new;
exception when others then
    raise notice 'control_portfolio_push_notify failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists control_portfolio_push_notify on public.control_portfolio;
create trigger control_portfolio_push_notify
    after update on public.control_portfolio
    for each row execute function public.control_portfolio_push_notify();
