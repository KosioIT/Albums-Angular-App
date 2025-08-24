import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user';
import { RegisterDTO } from '../dto/register.dto';
import { LoginDTO } from '../dto/login.dto';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  private adminEmail = 'admin@albums.com';

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
    const token = this.getToken();
    return !!token;
  }

  getToken(): string | null {
    return this.userSubject.value?.token ?? null;
  }

  checkIfLoggedIn(): void {
    if (!this.isLoggedIn()) {
      throw new Error('User is not logged in');
    }
  }

  getUserId(): string {
    if (!this.isLoggedIn()) {
      throw new Error('User is not logged in');
    }
    if (!this.userSubject.value?._id) {
      throw new Error('User ID is not available');
    }
    return this.userSubject.value?._id;
  }
  
  getUsername(): string {
    if (!this.isLoggedIn()) {
      throw new Error('User is not logged in');
    }
    if (!this.userSubject.value?.username) {
      throw new Error('Username is not available');
    }
    return this.userSubject.value?.username;
  }

  isAdmin(): boolean {
    if (this.userSubject.value) {
      return this.userSubject.value.email === this.adminEmail;
    }
    return false;
  }

  register(dto: RegisterDTO): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/auth/register`, dto)
      .pipe(tap((user) => this.saveUser(user)));
  }

  login(dto: LoginDTO): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/auth/login`, dto)
      .pipe(tap((user) => this.saveUser(user)));
  }

  logout(): void {
    localStorage.removeItem('user');
    this.userSubject.next(null);
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

  checkCredentials(dto: LoginDTO): Observable<{ exists: boolean }> {
    return this.http.post<{ exists: boolean }>(
      `${environment.apiUrl}/auth/check-password`,
      dto
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
