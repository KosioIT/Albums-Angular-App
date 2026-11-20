import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VoteService } from '../../../services/vote.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { STATUS_LABELS, Vote, voteTitle } from '../../../models/vote';

// "2 days left", "5 hours left", "less than an hour left"
export function timeLeft(iso: string, now = Date.now()): string {
  const hours = Math.floor((Date.parse(iso) - now) / 3_600_000);
  if (hours < 1) return 'less than an hour left';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} left`;
  const days = Math.round(hours / 24); // a new vote shows "3 days left", not "2"…
  return `${days} day${days === 1 ? '' : 's'} left`;
}

/*
  Admin votes (/admin/votes): open proposals to vote on (or withdraw) and the latest results.
  Proposals are made on the Manage users page.
*/
@Component({
  selector: 'app-votes',
  imports: [DatePipe, RouterLink],
  templateUrl: './votes.component.html',
  styleUrl: './votes.component.css',
})
export class VotesComponent {
  private votes = inject(VoteService);
  private toastr = inject(CustomToastrService);

  readonly title = voteTitle;
  readonly timeLeft = timeLeft;
  readonly statusLabel = STATUS_LABELS;
  readonly open = signal<Vote[] | null>(null);
  readonly closed = signal<Vote[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.votes.list().subscribe({
      next: ({ open, closed }) => {
        this.open.set(open);
        this.closed.set(closed);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  // How each voter voted, in the order of the voters list ('…' = not yet)
  ballots(v: Vote): { email: string; vote: 'yes' | 'no' | null }[] {
    return v.voters.map((email) => ({ email, vote: v.votes[email] ?? null }));
  }

  vote(v: Vote, choice: 'yes' | 'no'): void {
    const question =
      choice === 'yes' ? `Vote YES on "${voteTitle(v)}"?` : `Vote NO on "${voteTitle(v)}"?`;
    if (!confirm(`${question} Votes are final.`)) return;
    this.busy.set(v.id);
    this.votes.vote(v.id, choice).subscribe({
      next: (result) => {
        this.busy.set(null);
        this.report(result);
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(null);
        this.toastr.showToast(err.message, 'error', 'Vote not counted');
        this.load();
      },
    });
  }

  cancel(v: Vote): void {
    if (!confirm(`Withdraw "${voteTitle(v)}"?${v.suspend ? ' The suspension is lifted.' : ''}`)) return;
    this.busy.set(v.id);
    this.votes.cancel(v.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.toastr.showToast('The proposal was withdrawn.', 'success', 'Withdrawn');
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(null);
        this.toastr.showToast(err.message, 'error', 'Could not withdraw');
      },
    });
  }

  private report(v: Vote): void {
    if (v.status === 'passed') {
      if (v.error) this.toastr.showToast(v.error, 'error', 'Passed, but not carried out');
      else this.toastr.showToast(`"${voteTitle(v)}" passed and was carried out.`, 'success', 'Vote passed');
    } else if (v.status === 'rejected') {
      this.toastr.showToast(`"${voteTitle(v)}" was rejected.`, 'info', 'Vote rejected');
    } else {
      const more = v.needed - v.yes;
      this.toastr.showToast(`Counted. ${more} more "yes" vote${more === 1 ? '' : 's'} needed.`, 'success', 'Vote counted');
    }
  }
}
