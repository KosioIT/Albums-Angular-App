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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgottenPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'albums-list', component: AlbumsListComponent },
  { path: 'admin/albums', component: ManageAlbumsComponent },
  { path: 'admin/users', component: ManageUsersComponent },
  { path: 'admin/add-album', component: AlbumCreateComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
