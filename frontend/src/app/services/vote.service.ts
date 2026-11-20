import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';
import { Vote, VoteProposal } from '../models/vote';
import { AuthService } from './auth.service';

// Admin votes on banning, unbanning, admin rights and deleting users
@Injectable({ providedIn: 'root' })
export class VoteService {
  private auth = inject(AuthService);

  // Open votes this admin has not voted on yet (the badge in the Admin menu)
  readonly waiting = signal(0);

  list(): Observable<{ open: Vote[]; closed: Vote[] }> {
    return apiRequest<{ open: Vote[]; closed: Vote[] }>(api.get('/votes')).pipe(
      tap(({ open }) => this.waiting.set(open.filter((v) => v.canVote).length)),
    );
  }

  refreshWaiting(): void {
    if (!this.auth.isAdmin()) {
      this.waiting.set(0);
      return;
    }
    apiRequest<{ count: number }>(api.get('/votes/waiting')).subscribe({
      next: ({ count }) => this.waiting.set(count),
      error: () => {}, // only a badge
    });
  }

  propose(proposal: VoteProposal): Observable<Vote> {
    return apiRequest<Vote>(api.post('/votes', proposal, { timeout: 60 * 1000 })).pipe(tap(() => this.refreshWaiting()));
  }

  vote(id: string, vote: 'yes' | 'no'): Observable<Vote> {
    return apiRequest<Vote>(api.post(`/votes/${id}/vote`, { vote }, { timeout: 60 * 1000 })).pipe(
      tap(() => this.refreshWaiting()),
    );
  }

  cancel(id: string): Observable<Vote> {
    return apiRequest<Vote>(api.post(`/votes/${id}/cancel`)).pipe(tap(() => this.refreshWaiting()));
  }
}
