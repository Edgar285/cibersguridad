import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Home } from './pages/home/home';
import { Groups } from './pages/groups/groups';
import { Users } from './pages/users/users';
import { authGuard } from './components/guards/auth.guard';
import { Permission } from './models/permissions';
import { GroupSelect } from './pages/group-select/group-select';
import { TicketKanban } from './pages/tickets/kanban';
import { TicketList } from './pages/tickets/list';
import { TicketDetail } from './pages/tickets/detail';
import { TicketCreate } from './pages/tickets/create';
import { UserAdmin } from './pages/user-admin/user-admin';

export const routes: Routes = [
  { path: '', component: Landing },

  {
    path: 'auth',
    children: [
      { path: 'login', component: Login },
      { path: 'register', component: Register }
    ]
  },

  { path: 'group-select', component: GroupSelect, canActivate: [authGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'home', component: Home, canActivate: [authGuard] },
  {
    path: 'groups',
    component: Groups,
    canActivate: [authGuard],
    data: { permissions: [Permission.GroupsView, Permission.GroupView], permissionLogic: 'any' }
  },
  {
    path: 'users',
    component: Users,
    canActivate: [authGuard],
    data: { permissions: [Permission.UsersView, Permission.UserView], permissionLogic: 'any' }
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    children: [
      { path: 'kanban', component: TicketKanban },
      { path: 'list', component: TicketList },
      { path: 'create', component: TicketCreate },
      { path: ':id', component: TicketDetail }
    ]
  },
  {
    path: 'user-admin',
    component: UserAdmin,
    canActivate: [authGuard],
    data: { permissions: [Permission.UsersEdit, Permission.UserEdit, Permission.UserDelete], permissionLogic: 'any' }
  },

  { path: '**', redirectTo: '' }
];
