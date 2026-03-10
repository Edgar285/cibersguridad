export enum Permission {
  GroupsView = 'groups-view',
  GroupView = 'group-view',
  GroupsEdit = 'groups-edit',
  GroupsDelete = 'groups-delete',
  GroupDelete = 'group-delete',
  GroupsAdd = 'groups-add',
  GroupAdd = 'group-add',

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
  TicketAdd = 'ticket-add',
  TicketsAdd = 'tickets-add'
}

export const DEFAULT_USER_PERMISSIONS: Permission[] = [
  Permission.TicketView,
  Permission.TicketsView,
  Permission.UserView,
  Permission.UsersView
];

export const ADMIN_PERMISSIONS: Permission[] = Object.values(Permission);
