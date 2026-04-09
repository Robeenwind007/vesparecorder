-- ============================================================
-- VESPA RECORDER v2 — Schéma sans authentification Supabase
-- Accès via clé anon uniquement, filtrage par email applicatif
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: utilisateurs (gérés par l'admin, pas par auth.users)
-- ============================================================
create table public.utilisateurs (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique,
  nom         text,
  role        text not null default 'piegeur' check (role in ('admin', 'piegeur')),
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.utilisateurs (email, role) values
  ('bertrandbernard10@gmail.com', 'admin'),
  ('robeenwind007@gmail.com',     'piegeur');

-- ============================================================
-- TABLE: donneurs_ordre
-- ============================================================
create table public.donneurs_ordre (
  id         uuid primary key default uuid_generate_v4(),
  nom        text not null unique,
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.donneurs_ordre (nom) values
  ('PM Cordemais'), ('MAIRIE Savenay'), ('SAEGERMAN'), ('POLLENIZ'),
  ('TURCAT'), ('MAIRIE Montluc'), ('MAIRIE Cordemais'), ('PARTICULIER'),
  ('GUEMENE Alisone'), ('CROSSOUARD'), ('MAIRIE Donges'), ('PIRAU'),
  ('ROUGIER'), ('MOLERES'), ('MAIRIE Le Temple'), ('DIRE OUEST'),
  ('LUCA'), ('MAIRIE Couéron'), ('HARLL');

-- ============================================================
-- TABLE: observations
-- ============================================================
create table public.observations (
  id                   uuid primary key default uuid_generate_v4(),
  date_observation     date not null default current_date,
  donneur_ordre        text,
  origine_localisation text check (origine_localisation in ('GPS','Adresse')),
  latitude             double precision,
  longitude            double precision,
  adresse              text,
  espece               text not null check (espece in (
                         'Asiatique','Européen','Guêpes','Vespa Soror','Vespa Orientalis')),
  type_nid             text check (type_nid in ('Primaire','Secondaire','Non défini')),
  nombre_nids          integer not null default 1 check (nombre_nids > 0),
  beneficiaire         text,
  emplacement          text check (emplacement in (
                         'Arbre','Haie','Appenti','Toiture','Garage',
                         'Volet/fenêtre','Enterré','Carton/Pneu','Autres')),
  image_url            text,
  retire               boolean not null default false,
  saisi_par_email      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_obs_date   on public.observations(date_observation desc);
create index idx_obs_espece on public.observations(espece);
create index idx_obs_retire on public.observations(retire);
create index idx_obs_email  on public.observations(saisi_par_email);
create index idx_obs_gps    on public.observations(latitude, longitude) where latitude is not null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger obs_updated_at
  before update on public.observations
  for each row execute function public.set_updated_at();

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public)
values ('photos-nids', 'photos-nids', true)
on conflict do nothing;

-- ============================================================
-- RLS — accès anon complet (sécurité applicative)
-- ============================================================
alter table public.utilisateurs   enable row level security;
alter table public.donneurs_ordre enable row level security;
alter table public.observations   enable row level security;

create policy "anon_all_utilisateurs"  on public.utilisateurs   for all to anon using (true) with check (true);
create policy "anon_all_donneurs"      on public.donneurs_ordre for all to anon using (true) with check (true);
create policy "anon_all_observations" on public.observations   for all to anon using (true) with check (true);

create policy "anon_read_photos"   on storage.objects for select to anon using (bucket_id = 'photos-nids');
create policy "anon_insert_photos" on storage.objects for insert to anon with check (bucket_id = 'photos-nids');
create policy "anon_delete_photos" on storage.objects for delete to anon using (bucket_id = 'photos-nids');

-- ============================================================
-- VUE stats
-- ============================================================
create or replace view public.stats_dashboard as
select
  count(*)                                                           as total_observations,
  count(*) filter (where espece = 'Asiatique')                       as total_asiatique,
  count(*) filter (where espece != 'Asiatique')                      as total_autres,
  count(*) filter (where retire = true)                              as total_retires,
  count(*) filter (where retire = false)                             as total_actifs,
  count(*) filter (where type_nid = 'Primaire')                      as total_primaires,
  count(*) filter (where type_nid = 'Secondaire')                    as total_secondaires,
  count(*) filter (where date_observation >= date_trunc('month', current_date)) as ce_mois,
  count(*) filter (where date_observation >= date_trunc('year',  current_date)) as cette_annee
from public.observations;

grant select on public.stats_dashboard to anon;
grant all    on public.utilisateurs    to anon;
grant all    on public.donneurs_ordre  to anon;
grant all    on public.observations    to anon;
