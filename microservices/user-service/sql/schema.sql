create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username varchar(80) not null unique,
  email varchar(180) not null unique,
  full_name varchar(180),
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  created_by uuid references users(id),
  assigned_to uuid references users(id),
  title varchar(200) not null,
  description text not null,
  state varchar(40) not null default 'open',
  priority varchar(40) not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_permissions (
  user_id uuid not null references users(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

insert into permissions (code, description)
values
  ('super-admin', 'Control total del sistema'),
  ('groups-view', 'Visualizar grupos'),
  ('group-view', 'Visualizar grupo específico'),
  ('groups-edit', 'Editar grupos'),
  ('groups-delete', 'Eliminar grupos'),
  ('groups-add', 'Crear grupos'),
  ('group-delete', 'Eliminar un grupo'),
  ('group-add', 'Crear un grupo'),
  ('user-view', 'Visualizar perfil de usuario'),
  ('users-view', 'Visualizar usuarios'),
  ('users-edit', 'Editar usuarios'),
  ('user-edit', 'Editar perfil o usuario'),
  ('user-delete', 'Eliminar usuarios'),
  ('user-add', 'Crear usuarios'),
  ('ticket-view', 'Ver ticket'),
  ('tickets-view', 'Ver tickets'),
  ('tickets-edit', 'Editar tickets'),
  ('ticket-edit', 'Editar ticket'),
  ('ticket-delete', 'Eliminar ticket')
on conflict (code) do nothing;
