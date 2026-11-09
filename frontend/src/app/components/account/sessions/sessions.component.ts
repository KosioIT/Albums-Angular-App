import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { UserSession } from '../../../models/user';

// "Chrome on Windows" from a user agent string; good enough to recognise your own devices
export function describeDevice(userAgent: string): string {
  const ua = userAgent || '';
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' : 'Unknown browser';
  const os =
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Android/.test(ua) ? 'Android' :
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : 'unknown OS';
  return `${browser} on ${os}`;
}

@Component({
  selector: 'app-sessions',
  imports: [DatePipe],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.css',
})
export class SessionsComponent implements OnInit {
  sessions: UserSession[] = [];
  loading = true;
  busyId: string | null = null; // session being revoked

  readonly describeDevice = describeDevice;

  constructor(
    private authService: AuthService,
    private toastr: CustomToastrService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.authService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading = false;
      },
      error: (err: Error) => {
        this.loading = false;
        this.toastr.showToast(err.message, 'error', 'Could not load sessions');
      },
    });
  }

  get otherSessions(): number {
    return this.sessions.filter((s) => !s.current).length;
  }

  revoke(session: UserSession): void {
    if (session.current) {
      this.signOut();
      return;
    }

    this.busyId = session.id;
    this.authService.revokeSession(session.id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter((s) => s.id !== session.id);
        this.busyId = null;
        this.toastr.showToast(`${describeDevice(session.userAgent)} was signed out.`, 'success', 'Session ended');
      },
      error: (err: Error) => {
        this.busyId = null;
        this.toastr.showToast(err.message, 'error', 'Could not end the session');
        this.load(); // it may already be gone
      },
    });
  }

  signOut(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  signOutEverywhere(): void {
    if (!confirm('Sign out of all devices, including this one?')) return;
    this.authService.logoutAll().subscribe(() => this.router.navigate(['/login']));
  }
}
