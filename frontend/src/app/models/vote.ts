// Admin votes on users (GET /api/votes); see voteService in the backend

export type VoteAction = 'ban' | 'unban' | 'make_admin' | 'remove_admin' | 'delete';
export type VoteStatus = 'open' | 'passed' | 'rejected' | 'expired' | 'cancelled';

export interface Vote {
  id: string;
  action: VoteAction;
  target: string; // email
  targetName: string;
  reason: string;
  days: 1 | 7 | 30 | null; // ban only; null = permanent
  suspend: boolean; // the user is suspended for 24 hours while the vote runs
  proposedBy: string;
  proposedByName: string;
  voters: string[]; // emails of the admins who vote
  votes: Record<string, 'yes' | 'no'>;
  yes: number;
  no: number;
  needed: number; // "yes" votes to pass: more than half of all the admins
  admins: number; // all the admins when it was proposed (the one it is about included)
  status: VoteStatus;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
  error: string | null; // passed, but it could not be carried out
  myVote: 'yes' | 'no' | null;
  canVote: boolean;
  canCancel: boolean;
}

export interface VoteProposal {
  action: VoteAction;
  target: string;
  reason: string;
  days?: 1 | 7 | 30 | null;
  suspend?: boolean;
}

// "Ban dave for 7 days", "Make bob an admin"
export function voteTitle(v: Pick<Vote, 'action' | 'targetName' | 'days'>): string {
  switch (v.action) {
    case 'ban':
      return `Ban ${v.targetName} ${v.days ? `for ${v.days} day${v.days === 1 ? '' : 's'}` : 'permanently'}`;
    case 'unban':
      return `Lift the ban on ${v.targetName}`;
    case 'make_admin':
      return `Make ${v.targetName} an admin`;
    case 'remove_admin':
      return `Remove ${v.targetName}'s admin rights`;
    case 'delete':
      return `Delete ${v.targetName}'s account`;
  }
}

export const STATUS_LABELS: Record<VoteStatus, string> = {
  open: 'Open',
  passed: 'Passed',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Withdrawn',
};
