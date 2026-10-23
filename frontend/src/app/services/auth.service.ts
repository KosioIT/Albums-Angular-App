import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';
import { User } from '../models/user';
import { LoginDTO } from '../dto/login.dto';
import { RegisterDTO } from '../dto/register.dto';
import { ApiResponse, ApiSuccessResponse } from '../core/api-repsonse';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor() {
    this.initialize();
  }

  // ===== Initialization Methods =====

  initialize(): void {
    this.loadUserFromStorage();
  }

  loadUserFromStorage() {
    const json = localStorage.getItem('user');
    if (json) {
      try {
        this.userSubject.next(JSON.parse(json));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }

  // ===== User Management Methods =====

  saveUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  isLoggedIn(): boolean {
    return !!this.currentUser?.token;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // ===== Authentication Methods =====

  login(dto: LoginDTO): Observable<User> {
    return apiRequest<User>(api.post('/auth/login', dto)).pipe(
      tap((user) => this.saveUser(user)),
    );
  }

  register(dto: RegisterDTO): Observable<User> {
    return apiRequest<User>(api.post('/auth/register', dto)).pipe(
      tap((user) => this.saveUser(user)),
    );
  }

  logout(): Observable<void> {
    this.userSubject.next(null);
    localStorage.removeItem('user');

    return apiRequest<void>(api.post('/auth/logout'));
  }

  checkExistingEmail(email: string): Observable<boolean> {
    return apiRequest<boolean>(api.get(`/users/email/${email}`)).pipe(
      map((user) => !!user),
    );
  }

  checkExistingUsername(username: string): Observable<boolean> {
    return apiRequest<boolean>(api.get(`/users/username/${username}`)).pipe(
      map((user) => !!user),
    );
  }

  checkCredentials(dto: LoginDTO): Observable<boolean> {
    return apiRequest<boolean>(api.post('/auth/check-password', dto));
  }

  sendResetCodeViaEmail(email: string): Observable<void> {
    return apiRequest<void>(api.post('/auth/request-reset', { email }));
  }

  checkResetCode(
    email: string,
    code: string,
  ): Observable<{ isValid: boolean }> {
    return apiRequest<{ isValid: boolean }>(
      api.post('/auth/check-reset-code', { email, code }),
    );
  }

  resetPassword(
    email: string,
    resetCode: string,
    newPassword: string,
  ): Observable<void> {
    return apiRequest<void>(
      api.post('/auth/reset-password', {
        email,
        resetCode,
        newPassword,
      }),
    );
  }

  // ===== Getters =====

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get userId(): string {
    if (!this.currentUser?._id) {
      throw new Error('User ID not available');
    }
    return this.currentUser._id;
  }

  get username(): string {
    if (!this.currentUser?.username) {
      throw new Error('Username not available');
    }
    return this.currentUser.username;
  }
}
