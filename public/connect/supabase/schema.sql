-- =========================================================
-- CONNECT — Schéma de la base de données Supabase
--
-- À exécuter une seule fois :
-- Supabase > SQL Editor > New query > coller ce fichier > Run
-- (le script peut être relancé sans casser ce qui existe)
-- =========================================================


-- =========================================================
-- 1. PROFILS
-- Un profil par utilisateur (lié au compte de auth.users)
-- =========================================================

create table if not exists public.profiles (
    id                  uuid primary key references auth.users (id) on delete cascade,
    email               text not null,
    first_name          text not null default '',
    last_name           text not null default '',
    role                text not null default 'Membre',
    color               text not null default 'blue'
                        check (color in ('blue', 'purple', 'green', 'pink', 'orange')),

    -- Géolocalisation
    latitude            double precision check (latitude  between -90  and 90),
    longitude           double precision check (longitude between -180 and 180),
    location_updated_at timestamptz,

    -- Confidentialité
    share_location      boolean not null default true,
    show_online         boolean not null default true,

    last_seen           timestamptz not null default now(),
    created_at          timestamptz not null default now()
);


-- =========================================================
-- 2. MESSAGES
-- Messages privés entre deux utilisateurs
-- =========================================================

create table if not exists public.messages (
    id          bigint generated always as identity primary key,
    sender_id   uuid not null default auth.uid()
                references public.profiles (id) on delete cascade,
    receiver_id uuid not null
                references public.profiles (id) on delete cascade,
    content     text not null check (char_length(trim(content)) between 1 and 2000),
    read_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index if not exists messages_pair_idx
    on public.messages (sender_id, receiver_id, created_at desc);

create index if not exists messages_unread_idx
    on public.messages (receiver_id)
    where read_at is null;


-- =========================================================
-- 3. CRÉATION AUTOMATIQUE DU PROFIL À L'INSCRIPTION
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, email, first_name, last_name, color)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'first_name', ''),
        coalesce(new.raw_user_meta_data ->> 'last_name', ''),
        (array['blue', 'purple', 'green', 'pink', 'orange'])[1 + floor(random() * 5)::int]
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- =========================================================
-- 4. CONFIDENTIALITÉ : si le partage de position est désactivé,
--    la position est effacée de la base (pas juste cachée)
-- =========================================================

create or replace function public.clear_hidden_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.share_location = false then
        new.latitude := null;
        new.longitude := null;
        new.location_updated_at := null;
    end if;

    return new;
end;
$$;

drop trigger if exists profiles_clear_hidden_location on public.profiles;

create trigger profiles_clear_hidden_location
    before insert or update on public.profiles
    for each row execute function public.clear_hidden_location();


-- =========================================================
-- 5. SÉCURITÉ (Row Level Security)
-- =========================================================

alter table public.profiles enable row level security;
alter table public.messages enable row level security;


-- Profils : tout utilisateur connecté peut voir les profils (annuaire + carte)
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
    on public.profiles for select
    to authenticated
    using (true);

-- Profils : chacun ne modifie que le sien
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
    on public.profiles for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);


-- Messages : on ne voit que les messages qu'on a envoyés ou reçus
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
    on public.messages for select
    to authenticated
    using ((select auth.uid()) in (sender_id, receiver_id));

-- Messages : on ne peut envoyer qu'en son propre nom
drop policy if exists "messages_insert_as_sender" on public.messages;
create policy "messages_insert_as_sender"
    on public.messages for insert
    to authenticated
    with check ((select auth.uid()) = sender_id and sender_id <> receiver_id);

-- Messages : seul le destinataire peut marquer un message comme lu
drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read"
    on public.messages for update
    to authenticated
    using ((select auth.uid()) = receiver_id)
    with check ((select auth.uid()) = receiver_id);


-- Colonnes modifiables (empêche de changer son id, son email, etc.)
revoke update on public.profiles from anon, authenticated;
grant update (
    first_name, last_name, role, color,
    latitude, longitude, location_updated_at,
    share_location, show_online, last_seen
) on public.profiles to authenticated;

-- Pour un message, seule la date de lecture peut être modifiée
revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;


-- =========================================================
-- 6. TEMPS RÉEL
-- Active les notifications en direct pour les messages et
-- les profils (positions sur la carte)
-- =========================================================

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'messages'
    ) then
        alter publication supabase_realtime add table public.messages;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'profiles'
    ) then
        alter publication supabase_realtime add table public.profiles;
    end if;
end;
$$;
