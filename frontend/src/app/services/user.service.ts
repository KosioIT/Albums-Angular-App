import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminUser, UserProfile as User } from '../models/user';
import { api } from '../core/api';
import { apiBody, apiRequest } from '../core/api-request';

// Admin endpoints for managing users
@Injectable({
  providedIn: 'root',
})
export class UserService {
  // Every user with their activity and sessions
  getAll(): Observable<AdminUser[]> {
    return apiRequest<AdminUser[]>(api.get('/users'));
  }

  getByEmail(email: string): Observable<User> {
    return apiRequest<User>(api.get(`/users/email/${encodeURIComponent(email)}`));
  }

  getByUsername(username: string): Observable<User> {
    return apiRequest<User>(api.get(`/users/username/${encodeURIComponent(username)}`));
  }

  setRole(email: string, role: AdminUser['role']): Observable<{ role: AdminUser['role'] }> {
    return apiRequest(api.patch(`/users/${encodeURIComponent(email)}/role`, { role }));
  }

  // Signs the user out on every device
  revokeSessions(email: string): Observable<{ success: boolean; message: string }> {
    return apiBody(api.post(`/users/${encodeURIComponent(email)}/sessions/revoke`));
  }

  // Also removes their likes from the albums, their playlists and their activity
  delete(email: string): Observable<{ success: boolean; message: string }> {
    return apiBody(api.delete('/users', { params: { email } }));
  }
}
