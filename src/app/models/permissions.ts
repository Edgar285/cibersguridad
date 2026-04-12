export enum Permission {
  SuperAdmin = 'super-admin',
  GroupsView = 'groups-view',
  GroupView = 'group-view',
  GroupsEdit = 'groups-edit',
  GroupsDelete = 'groups-delete',
  GroupDelete = 'group-delete',
  GroupsAdd = 'groups-eeee',
  GroupAdd = 'group-ee',

  UserView = 'user-view',
  UsersView = 'users-view',
  UsersEdit = 'users-edit',
  UserEdit = 'user-edit',
  UserDelete = 'user-delete',
  UserAdd = 'user-add',

  TicketView = 'ticket-view',
  TicketsView = 'tickets-view',
  TicketsEdit = 'tickets-edit',
  TicketEdit = 'ticket-edit',
  TicketDelete = 'ticket-delete',

}

/** Agrupación visual de permisos para mostrar en la UI */
export const PERMISSIONS_BY_CATEGORY: { label: string; icon: string; perms: Permission[] }[] = [
  {
    label: 'Tickets',
    icon: 'pi pi-ticket',
    perms: [Permission.TicketView, Permission.TicketsView, Permission.TicketsEdit, Permission.TicketEdit, Permission.TicketDelete]
  },
  {
    label: 'Grupos',
    icon: 'pi pi-users',
    perms: [Permission.GroupView, Permission.GroupsView, Permission.GroupsEdit, Permission.GroupsAdd, Permission.GroupAdd, Permission.GroupsDelete, Permission.GroupDelete]
  },
  {
    label: 'Usuarios',
    icon: 'pi pi-user',
    perms: [Permission.UserView, Permission.UsersView, Permission.UsersEdit, Permission.UserEdit, Permission.UserDelete]
  }
];

export const DEFAULT_USER_PERMISSIONS: Permission[] = [
  Permission.TicketView,
  Permission.TicketsView,
  Permission.UserView,
  Permission.UsersView
];
const ALL_PERMISSIONS = Object.values(Permission) as Permission[];

export const ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(p => p !== Permission.SuperAdmin);
export const SUPERADMIN_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS];

