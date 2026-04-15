import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Groups } from './pages/groups/groups';
import { authGuard } from './components/guards/auth.guard';
import { Permission } from './models/permissions';
import { GroupSelect } from './pages/group-select/group-select';
import { Users } from './pages/users/users';
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
  { path: 'home', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'groups',
    component: Groups,
    canActivate: [authGuard],
    data: {
      permissions: [Permission.GroupsView, Permission.GroupsManage],
      permissionLogic: 'any'
    }
  },
  {
    path: 'users',
    component: UserAdmin,
    canActivate: [authGuard],
    data: {
      permissions: [Permission.UsersView, Permission.UsersManage],
      permissionLogic: 'any'
    }
  },
  {
    path: 'profile',
    component: Users,
    canActivate: [authGuard]
    // Accesible por cualquier usuario logueado
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    children: [
      { path: 'list', component: TicketList },
      {
        path: 'create',
        component: TicketCreate,
        canActivate: [authGuard],
        data: { permissions: [Permission.TicketsAdd, Permission.TicketAdd], permissionLogic: 'any' }
      },
      { path: ':id', component: TicketDetail }
    ]
  },
  { path: '**', redirectTo: '' }
];
