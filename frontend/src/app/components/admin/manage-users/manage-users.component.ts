import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { VoteService } from '../../../services/vote.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { AdminUser, BanDays } from '../../../models/user';
import { Vote, VoteAction, voteTitle } from '../../../models/vote';

type RoleFilter = 'all' | 'admin' | 'user' | 'banned';
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

// The proposal form, open for one user at a time
interface Draft {
  user: AdminUser;
  action: VoteAction;
  reason: string;
  days: string; // the select's value; '' = permanent
  suspend: boolean;
}

/*
  Admin page with every user (/admin/users): search, filter, sort, sign a user out everywhere, and
  propose a ban, an unban, admin rights or deleting the account. Those are voted on by the admins
  (see /admin/votes); with a single admin they happen right away. Nothing can be done to one's own
  account here (the account menu has that), so an admin never locks themselves out.
*/
@Component({
  selector: 'app-manage-users',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css',
})
export class ManageUsersComponent {
  private users = inject(UserService);
  private auth = inject(AuthService);
  private votes = inject(VoteService);
  private toastr = inject(CustomToastrService);

  readonly timeAgo = timeAgo;
  readonly voteTitle = voteTitle;
  readonly list = signal<AdminUser[] | null>(null);
  readonly openVotes = signal<Map<string, Vote>>(new Map()); // target email -> its open vote
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal<string | null>(null); // email of the user an action is running for

  readonly query = signal('');
  readonly role = signal<RoleFilter>('all');
  readonly sortBy = signal<SortBy>('newest');

  readonly draft = signal<Draft | null>(null);
  readonly banDurations = [
    { value: '1', label: '1 day' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '', label: 'Permanently' },
  ];

  readonly counts = computed(() => {
    const all = this.list() ?? [];
    return {
      all: all.length,
      admin: all.filter((u) => u.role === 'admin').length,
      user: all.filter((u) => u.role !== 'admin').length,
      banned: all.filter((u) => u.ban).length,
    };
  });

  readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    const role = this.role();
    const rows = (this.list() ?? []).filter(
      (u) =>
        (role === 'all' ||
          (role === 'banned' ? !!u.ban : role === 'admin' ? u.role === 'admin' : u.role !== 'admin')) &&
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
    forkJoin({ users: this.users.getAll(), votes: this.votes.list() }).subscribe({
      next: ({ users, votes }) => {
        this.list.set(users);
        this.openVotes.set(new Map(votes.open.map((v) => [v.target, v])));
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

  // Who would vote on a proposal about this user: every admin except them
  voters(user: AdminUser): number {
    return (this.list() ?? []).filter((u) => u.role === 'admin' && u.id !== user.id).length;
  }

  // With a single voter (this admin) a proposal is decided at once
  immediate(user: AdminUser): boolean {
    return this.voters(user) <= 1;
  }

  needed(user: AdminUser): number {
    return Math.floor(this.voters(user) / 2) + 1;
  }

  // ===== Filters (from the template's inputs) =====

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  onSort(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortBy);
  }

  // ===== Proposals =====

  openDraft(user: AdminUser, action: VoteAction): void {
    const current = this.draft();
    if (current?.user.id === user.id && current.action === action) {
      this.draft.set(null); // the same button closes it
      return;
    }
    this.draft.set({ user, action, reason: '', days: '7', suspend: false });
  }

  closeDraft(): void {
    this.draft.set(null);
  }

  editDraft(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  draftTitle(d: Draft): string {
    return voteTitle({ action: d.action, targetName: d.user.username, days: this.draftDays(d) });
  }

  private draftDays(d: Draft): BanDays {
    return (d.days ? Number(d.days) : null) as BanDays;
  }

  reasonOk(d: Draft): boolean {
    const length = d.reason.trim().length;
    return length >= 3 && length <= 300;
  }

  // Only someone who can still sign in (a banned user already cannot; a suspension would replace the ban)
  canSuspend(d: Draft): boolean {
    return (d.action === 'ban' || d.action === 'delete') && !this.immediate(d.user) && !d.user.ban;
  }

  submitLabel(d: Draft): string {
    if (!this.immediate(d.user)) return 'Propose';
    const labels: Record<VoteAction, string> = {
      ban: 'Ban now',
      unban: 'Unban now',
      make_admin: 'Make admin now',
      remove_admin: 'Remove admin now',
      delete: 'Delete now',
    };
    return labels[d.action];
  }

  submit(d: Draft): void {
    if (!this.reasonOk(d) || this.busy()) return;
    if (d.action === 'delete' && this.immediate(d.user)) {
      if (!confirm(`Delete ${d.user.username} (${d.user.email})? Their likes, playlists and activity are removed too. This cannot be undone.`)) return;
    }
    this.busy.set(d.user.id);
    this.votes
      .propose({
        action: d.action,
        target: d.user.email,
        reason: d.reason.trim(),
        days: d.action === 'ban' ? this.draftDays(d) : undefined,
        suspend: this.canSuspend(d) && d.suspend,
      })
      .subscribe({
        next: (vote) => {
          this.busy.set(null);
          this.draft.set(null);
          if (vote.status === 'passed' && !vote.error) {
            this.toastr.showToast(`"${voteTitle(vote)}" is done.`, 'success', 'Done');
          } else if (vote.error) {
            this.toastr.showToast(vote.error, 'error', 'Not carried out');
          } else {
            const more = vote.needed - vote.yes;
            this.toastr.showToast(
              `The other admins can vote on it for 3 days. ${more} more "yes" vote${more === 1 ? '' : 's'} needed.`,
              'success',
              'Proposal made',
              'Go to votes',
              '/admin/votes',
            );
          }
          this.load();
        },
        error: (err: Error) => {
          this.busy.set(null);
          this.toastr.showToast(err.message, 'error', 'Could not propose it');
        },
      });
  }

  // Signing out is not a punishment (they can sign in again), so it needs no vote
  signOut(user: AdminUser): void {
    if (!confirm(`Sign ${user.username} out on every device? They can sign in again.`)) return;
    this.busy.set(user.id);
    this.users.revokeSessions(user.email).subscribe({
      next: () => {
        this.busy.set(null);
        this.list.update((list) =>
          (list ?? []).map((u) => (u.id === user.id ? { ...u, stats: { ...u.stats, activeSessions: 0 } } : u)),
        );
        this.toastr.showToast(`${user.username} was signed out everywhere.`, 'success', 'Signed out');
      },
      error: (err: Error) => {
        this.busy.set(null);
        this.toastr.showToast(err.message, 'error', 'Something went wrong');
      },
    });
  }
}
