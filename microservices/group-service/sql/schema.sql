-- ============================================================
-- group-service schema — ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Grupos
create table if not exists erp_groups (
  id          uuid         primary key default gen_random_uuid(),
  nombre      varchar(120) not null,
  descripcion text         not null default '',
  nivel       varchar(80)  not null default '',
  actor       varchar(120) not null default '',
  integrantes integer      not null default 0,
  tickets     integer      not null default 0,
  estado      varchar(40)  not null default 'success',
  created_at  timestamptz  not null default now()
);

-- Permisos por miembro de grupo
create table if not exists erp_group_members (
  group_id    uuid   not null references erp_groups(id) on delete cascade,
  user_id     text   not null,
  permissions text[] not null default '{}',
  primary key (group_id, user_id)
);

-- RLS — el service_role bypasa RLS automáticamente
alter table erp_groups        enable row level security;
alter table erp_group_members enable row level security;
