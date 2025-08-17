import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  private adminEmail = "admin@albums.com";

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const json = localStorage.getItem('user');
    if (json) {
      try {
        const user: User = JSON.parse(json);
        this.userSubject.next(user);
      } catch {
        // Remove invalid JSON
        localStorage.removeItem('user');
        this.userSubject.next(null);
      }
    }
  }

  private saveUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  isAdmin(): boolean {
    if (this.userSubject.value) {
      return this.userSubject.value.email === this.adminEmail;
    }
    return false;
  }

  register(
    username: string,
    email: string,
    password: string
  ): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/auth/register`, {
        username,
        email,
        password,
      })
      .pipe(tap((user) => this.saveUser(user)));
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((user) => this.saveUser(user)));
  }

  logout(): void {
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  getToken(): string | null {
    return this.userSubject.value?.token ?? null;
  }

  checkIfEmailExists(email: string): Observable<boolean> {
    return this.http
      .post<{ exists: boolean }>(`${environment.apiUrl}/auth/check-email`, {
        email,
      })
      .pipe(
        map((response) => response.exists),
        catchError(() => of(false)) // Return false on error (not existing email)
      );
  }

  checkIfUsernameExists(username: any): Observable<boolean> {
    return this.http
      .post<{ exists: boolean }>(`${environment.apiUrl}/auth/check-username`, {
        username,
      })
      .pipe(
        map((response) => response.exists),
        catchError(() => of(false)) // Return false on error (not existing username)
      );
  }

  checkCredentials(credentials: {
    email: string;
    password: string;
  }): Observable<{ exists: boolean }> {
    return this.http.post<{ exists: boolean }>(
      `${environment.apiUrl}/auth/check-password`,
      credentials
    );
  }

  sendResetCodeViaEmail(email: string): Observable<Object> {
    return this.http.post(`${environment.apiUrl}/auth/request-reset`, {
      email,
    });
  }

  checkResetCode(email: string, code: string): Observable<{ valid: boolean }> {
    return this.http.post<{ valid: boolean }>(
      `${environment.apiUrl}/auth/check-reset-code`,
      { email, code }
    );
  }

  resetPassword(
    email: string,
    resetToken: string,
    newPassword: string
  ): Observable<Object> {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      email,
      resetToken,
      newPassword,
    });
  }
}
