export enum Permission {
  SuperAdmin = 'super-admin',

  // ── Groups ────────────────────────────────────────────────────
  GroupsView    = 'groups:view',
  GroupView     = 'groups:view',     // alias retrocompat
  GroupsAdd     = 'groups:add',
  GroupAdd      = 'groups:add',      // alias retrocompat
  GroupsEdit    = 'groups:edit',
  GroupsDelete  = 'groups:delete',
  GroupDelete   = 'groups:delete',   // alias retrocompat
  GroupsManage  = 'groups:manage',   // gestionar grupos (add+edit+delete)

  // ── Users ─────────────────────────────────────────────────────
  UsersView   = 'users:view',
  UserView    = 'users:view',   // alias retrocompat
  UsersAdd    = 'users:add',
  UserAdd     = 'users:add',    // alias retrocompat
  UsersEdit   = 'users:edit',
  UserEdit    = 'users:edit',   // alias retrocompat
  UsersDelete = 'users:delete',
  UserDelete  = 'users:delete', // alias retrocompat
  UsersManage = 'users:manage', // gestionar usuarios (add+edit+delete)

  // ── Tickets ───────────────────────────────────────────────────
  TicketsView   = 'tickets:view',
  TicketView    = 'tickets:view',   // alias retrocompat
  TicketsAdd    = 'tickets:add',
  TicketAdd     = 'tickets:add',    // alias retrocompat
  TicketsEdit   = 'tickets:edit',
  TicketEdit    = 'tickets:edit',   // alias retrocompat
  TicketsDelete = 'tickets:delete',
  TicketDelete  = 'tickets:delete', // alias retrocompat
  TicketsMove   = 'tickets:move',   // mover estado de ticket
}

/** Agrupación visual de permisos para mostrar en la UI */
export const PERMISSIONS_BY_CATEGORY: { label: string; icon: string; perms: Permission[] }[] = [
  {
    label: 'Tickets',
    icon: 'pi pi-ticket',
    perms: [Permission.TicketsView, Permission.TicketsAdd, Permission.TicketsEdit, Permission.TicketsDelete, Permission.TicketsMove]
  },
  {
    label: 'Grupos',
    icon: 'pi pi-users',
    perms: [Permission.GroupsView, Permission.GroupsAdd, Permission.GroupsEdit, Permission.GroupsDelete, Permission.GroupsManage]
  },
  {
    label: 'Usuarios',
    icon: 'pi pi-user',
    perms: [Permission.UsersView, Permission.UsersAdd, Permission.UsersEdit, Permission.UsersDelete, Permission.UsersManage]
  }
];

export const DEFAULT_USER_PERMISSIONS: Permission[] = [
  Permission.TicketsView,
  Permission.TicketsAdd,
  Permission.UsersView
];

const ALL_PERMISSIONS = [
  Permission.SuperAdmin,
  Permission.GroupsView, Permission.GroupsAdd, Permission.GroupsEdit, Permission.GroupsDelete, Permission.GroupsManage,
  Permission.UsersView, Permission.UsersAdd, Permission.UsersEdit, Permission.UsersDelete, Permission.UsersManage,
  Permission.TicketsView, Permission.TicketsAdd, Permission.TicketsEdit, Permission.TicketsDelete, Permission.TicketsMove
];

export const ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(p => p !== Permission.SuperAdmin);
export const SUPERADMIN_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS];

