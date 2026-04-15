-- ============================================================
-- ticket-service schema — ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Tickets
create table if not exists erp_tickets (
  id          uuid        primary key default gen_random_uuid(),
  title       varchar(200) not null,
  description text         not null default '',
  status      varchar(40)  not null default 'pending',
  priority    varchar(40)  not null default 'medio',
  group_id    uuid         not null,
  author      text         not null,
  assigned_to text,
  due_date    date,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- Auto-actualizar updated_at
create or replace function erp_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_tickets_updated_at on erp_tickets;
create trigger erp_tickets_updated_at
  before update on erp_tickets
  for each row execute function erp_set_updated_at();

-- Comentarios
create table if not exists erp_ticket_comments (
  id        uuid        primary key default gen_random_uuid(),
  ticket_id uuid        not null references erp_tickets(id) on delete cascade,
  author    text        not null,
  message   text        not null,
  at        timestamptz not null default now()
);

-- Historial de cambios
create table if not exists erp_ticket_history (
  id        uuid        primary key default gen_random_uuid(),
  ticket_id uuid        not null references erp_tickets(id) on delete cascade,
  field     varchar(80) not null,
  from_val  text,
  to_val    text,
  at        timestamptz not null default now(),
  author    text
);

-- RLS — el service_role bypasa RLS automáticamente
alter table erp_tickets         enable row level security;
alter table erp_ticket_comments enable row level security;
alter table erp_ticket_history  enable row level security;
