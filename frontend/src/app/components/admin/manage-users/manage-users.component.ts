import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { AdminUser } from '../../../models/user';

type RoleFilter = 'all' | 'admin' | 'user';
type SortBy = 'newest' | 'name' | 'active' | 'seen';

// "today", "yesterday", "5 days ago", "3 months ago"
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years <= 1 ? 'a year ago' : `${years} years ago`;
}

/*
  Admin page with every user (/admin/users): search, filter by role, sort, and per user
  make / remove admin, sign out on every device, delete. Nothing can be done to one's own account
  here (the account menu has that), so an admin never locks themselves out.
*/
@Component({
  selector: 'app-manage-users',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css',
})
export class ManageUsersComponent {
  private users = inject(UserService);
  private auth = inject(AuthService);
  private toastr = inject(CustomToastrService);

  readonly timeAgo = timeAgo;
  readonly list = signal<AdminUser[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal<string | null>(null); // email of the user an action is running for

  readonly query = signal('');
  readonly role = signal<RoleFilter>('all');
  readonly sortBy = signal<SortBy>('newest');

  readonly counts = computed(() => {
    const all = this.list() ?? [];
    return { all: all.length, admin: all.filter((u) => u.role === 'admin').length, user: all.filter((u) => u.role !== 'admin').length };
  });

  readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    const role = this.role();
    const rows = (this.list() ?? []).filter(
      (u) =>
        (role === 'all' || (role === 'admin' ? u.role === 'admin' : u.role !== 'admin')) &&
        (!q || u.username?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
    const activity = (u: AdminUser) => u.stats.listens + u.stats.downloads + u.stats.likedCount;
    const by: Record<SortBy, (a: AdminUser, b: AdminUser) => number> = {
      newest: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
      name: (a, b) => (a.username ?? '').localeCompare(b.username ?? '', undefined, { sensitivity: 'base' }),
      active: (a, b) => activity(b) - activity(a),
      seen: (a, b) => (b.stats.lastSeen ?? '').localeCompare(a.stats.lastSeen ?? ''),
    };
    return [...rows].sort(by[this.sortBy()]);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.users.getAll().subscribe({
      next: (list) => {
        this.list.set(list);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  isMe(user: AdminUser): boolean {
    return user.id === this.auth.currentUser?.id;
  }

  // ===== Filters (from the template's inputs) =====

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  onSort(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortBy);
  }

  // ===== Actions =====

  toggleAdmin(user: AdminUser): void {
    const role = user.role === 'admin' ? 'user' : 'admin';
    const question =
      role === 'admin'
        ? `Make ${user.username} an admin? They will be able to manage albums and users.`
        : `Remove admin rights from ${user.username}?`;
    if (!confirm(question)) return;

    this.run(user, this.users.setRole(user.email, role), () => {
      this.patch(user, { role });
      this.toastr.showToast(`${user.username} is now ${role === 'admin' ? 'an admin' : 'a regular user'}.`, 'success', 'Role changed');
    });
  }

  signOut(user: AdminUser): void {
    if (!confirm(`Sign ${user.username} out on every device? They can sign in again.`)) return;
    this.run(user, this.users.revokeSessions(user.email), () => {
      this.patch(user, { stats: { ...user.stats, activeSessions: 0 } });
      this.toastr.showToast(`${user.username} was signed out everywhere.`, 'success', 'Signed out');
    });
  }

  remove(user: AdminUser): void {
    if (!confirm(`Delete ${user.username} (${user.email})? Their likes, playlists and activity are removed too. This cannot be undone.`)) return;
    this.run(user, this.users.delete(user.email), () => {
      this.list.update((list) => (list ?? []).filter((u) => u.id !== user.id));
      this.toastr.showToast(`${user.username} was deleted.`, 'success', 'User deleted');
    });
  }

  private run<T>(user: AdminUser, request: Observable<T>, done: () => void): void {
    if (this.busy()) return;
    this.busy.set(user.id);
    request.subscribe({
      next: () => {
        this.busy.set(null);
        done();
      },
      error: (err: Error) => {
        this.busy.set(null);
        this.toastr.showToast(err.message, 'error', 'Something went wrong');
      },
    });
  }

  private patch(user: AdminUser, change: Partial<AdminUser>): void {
    this.list.update((list) => (list ?? []).map((u) => (u.id === user.id ? { ...u, ...change } : u)));
  }
}
