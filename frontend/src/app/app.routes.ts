import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { AlbumsListComponent } from './components/albums-list/albums-list.component';
import { ForgottenPasswordComponent } from './components/auth/forgotten-password/forgotten-password.component';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password.component';
import { ManageAlbumsComponent } from './components/admin/manage-albums/manage-albums.component';
import { ManageUsersComponent } from './components/admin/manage-users/manage-users.component';
import { AlbumCreateComponent } from './components/admin/album-create/album-create.component';
import { FavoriteAlbumsComponent } from './components/favorites/favorite-albums/favorite-albums.component';
import { SessionsComponent } from './components/account/sessions/sessions.component';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'albums-list', component: AlbumsListComponent },

  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgottenPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },

  { path: 'favorites', component: FavoriteAlbumsComponent, canActivate: [authGuard] },
  { path: 'account/sessions', component: SessionsComponent, canActivate: [authGuard] },

  { path: 'admin/albums', component: ManageAlbumsComponent, canActivate: [adminGuard] },
  { path: 'admin/users', component: ManageUsersComponent, canActivate: [adminGuard] },
  { path: 'admin/add-album', component: AlbumCreateComponent, canActivate: [adminGuard] },

  { path: '**', redirectTo: '', pathMatch: 'full' },
];
