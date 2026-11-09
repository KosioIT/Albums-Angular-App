import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, map, catchError, of, finalize } from 'rxjs';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';
import { authToken, setRefreshHandler } from '../core/auth-token';
import { AuthResponse } from '../core/api-repsonse';
import { normalizeApiError } from '../errors/api-errors/normalizeApiError';
import { User, UserSession } from '../models/user';
import { LoginDTO } from '../dto/login.dto';
import { RegisterDTO } from '../dto/register.dto';
import { CustomToastrService } from './custom-toastr.service';

/*
  Session model (matches the backend):
  - access token: short-lived JWT, kept in memory only (core/auth-token.ts)
  - refresh token: httpOnly cookie that JavaScript never sees; /auth/refresh swaps it for a new pair
  On startup restoreSession() asks for a new access token, so a reload keeps the user logged in.
*/
@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private toastr = inject(CustomToastrService);

  private userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  // One refresh at a time: parallel 401s share it, because reusing an old refresh token kills the session
  private refreshInFlight: Promise<string | null> | null = null;

  constructor() {
    setRefreshHandler(() => this.refreshAccessToken());
  }

  // ===== Session state =====

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  hasLiked(albumId: string): boolean {
    return !!this.currentUser?.likedAlbums?.includes(albumId);
  }

  // Keeps the local user in sync after a like / unlike
  setLiked(albumId: string, liked: boolean): void {
    const user = this.currentUser;
    if (!user) return;
    const others = (user.likedAlbums ?? []).filter((id) => id !== albumId);
    this.userSubject.next({ ...user, likedAlbums: liked ? [...others, albumId] : others });
  }

  private setSession({ token, user }: AuthResponse): User {
    authToken.set(token);
    this.userSubject.next(user);
    return user;
  }

  private clearSession(): void {
    authToken.set(null);
    this.userSubject.next(null);
  }

  // Runs once before the first navigation (see main.ts); never fails
  async restoreSession(): Promise<void> {
    await this.refreshAccessToken();
  }

  refreshAccessToken(): Promise<string | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.withCrossTabLock(() => this.requestRefresh()).finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async requestRefresh(): Promise<string | null> {
    const wasLoggedIn = this.isLoggedIn();
    try {
      const res = await api.post<AuthResponse>('/auth/refresh');
      this.setSession(res.data);
      return res.data.token;
    } catch {
      this.clearSession();
      if (wasLoggedIn) this.onSessionExpired();
      return null;
    }
  }

  /*
    Two tabs share one refresh cookie. If both refreshed at once, the second would present a token
    that was just rotated and the backend would revoke the session. The lock makes the second tab
    wait and then send the new cookie.
  */
  private withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? locks.request('auth-refresh', fn) : fn();
  }

  private onSessionExpired(): void {
    this.toastr.showToast('Please sign in again.', 'warning', 'Session expired');
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  // ===== Login / register / logout =====

  login(dto: LoginDTO): Observable<User> {
    return this.authRequest(api.post<AuthResponse>('/auth/login', dto));
  }

  // The backend logs the new user in right away
  register(dto: RegisterDTO): Observable<User> {
    return this.authRequest(api.post<AuthResponse>('/auth/register', dto));
  }

  // The local session is cleared even when the request fails (e.g. offline)
  logout(): Observable<void> {
    return this.endSession('/auth/logout');
  }

  logoutAll(): Observable<void> {
    return this.endSession('/auth/logout-all');
  }

  private endSession(url: string): Observable<void> {
    return from(api.post(url)).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
    );
  }

  getSessions(): Observable<UserSession[]> {
    return apiRequest<UserSession[]>(api.get('/auth/sessions'));
  }

  revokeSession(id: string): Observable<void> {
    return apiRequest<void>(api.delete(`/auth/sessions/${encodeURIComponent(id)}`));
  }

  // ===== Password reset =====

  // Always "succeeds": the backend does not reveal whether the email is registered
  requestResetCode(email: string): Observable<void> {
    return apiRequest<void>(api.post('/auth/request-reset', { email }));
  }

  // On success the backend revokes every old session and logs the user in
  resetPassword(email: string, code: string, newPassword: string): Observable<User> {
    return this.authRequest(api.post<AuthResponse>('/auth/reset-password', { email, code, newPassword }));
  }

  private authRequest(request: Promise<{ data: AuthResponse }>): Observable<User> {
    return from(request).pipe(
      map((res) => this.setSession(res.data)),
      catchError((err) => normalizeApiError(err)),
    );
  }
}
