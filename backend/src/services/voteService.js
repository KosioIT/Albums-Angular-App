import { db } from '../config/firebase/firebase.js';
import { User } from '../models/User.js';
import {
    BAN_DAYS, banUser, deleteUserAccount, liftSuspension, setRole, suspendUser, unbanUser,
} from './userService.js';

/*
  Admin decisions about a user are voted on, like in a parliament:
    ban, unban, make_admin, remove_admin, delete

  - An admin proposes one, with a reason (and a duration for a ban). It counts as their "yes".
  - The voters are the admins at that moment, except the user it is about. Their list is kept with
    the proposal, so later changes of roles do not move the goalposts.
  - It passes with a majority: more than half of the voters. A tie fails. As soon as enough "no"
    votes make a majority impossible, it fails at once. With only one voter (a single admin) the
    proposal passes right away, as before.
  - Open for 3 days; after that it expires. The proposer can withdraw it.
  - One open proposal per user at a time. Votes are final.
  - For a ban or a deletion the proposer can suspend the user for 24 hours at once (spam can not
    wait three days); the suspension is lifted if the proposal fails, expires or is withdrawn.

  votes/{id}: { action, target, targetName, reason, days, suspend, proposedBy, proposedByName,
                voters: [emails], votes: { email: 'yes' | 'no' }, status, createdAt, expiresAt,
                closedAt, error }
  status: open -> passed | rejected | expired | cancelled  (passed + error when carrying it out failed)
*/

const VOTES = db.collection('votes');
const USERS = db.collection('users');
export const ACTIONS = ['ban', 'unban', 'make_admin', 'remove_admin', 'delete'];
const SUSPENDABLE = ['ban', 'delete'];
export const OPEN_MS = 3 * 24 * 60 * 60 * 1000;

export class VoteError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const needed = (voters) => Math.floor(voters.length / 2) + 1;
const tally = (p) => {
    const values = Object.entries(p.votes || {}).filter(([email]) => p.voters.includes(email)).map(([, v]) => v);
    return { yes: values.filter((v) => v === 'yes').length, no: values.filter((v) => v === 'no').length };
};

// The outcome so far: 'passed', 'rejected' or null (still open)
export function outcome(p) {
    const { yes, no } = tally(p);
    const need = needed(p.voters);
    if (yes >= need) return 'passed';
    if (p.voters.length - no < need) return 'rejected'; // even every remaining vote cannot make it
    return null;
}

// Why this action cannot be proposed for this user now (null = it can)
function whyNot(action, user, proposerId) {
    if (user.id === proposerId) return 'You cannot propose this about yourself.';
    const ban = user.activeBan();
    switch (action) {
        case 'ban':
            if (user.role === 'admin') return 'Admins cannot be banned: propose removing their admin rights first.';
            if (ban && !ban.suspension) return 'This user is already banned.';
            return null;
        case 'unban':
            return ban && !ban.suspension ? null : 'This user is not banned.';
        case 'make_admin':
            if (user.role === 'admin') return 'This user is already an admin.';
            return ban ? 'Banned users cannot become admins.' : null;
        case 'remove_admin':
            return user.role === 'admin' ? null : 'This user is not an admin.';
        case 'delete':
            return user.role === 'admin' ? 'Admins cannot be deleted: propose removing their admin rights first.' : null;
        default:
            return 'Unknown action.';
    }
}

async function loadUser(email) {
    const snap = await USERS.doc(email).get();
    return snap.exists ? new User(snap.data(), snap.id) : null;
}

async function adminEmails() {
    const snap = await USERS.where('role', '==', 'admin').get();
    return snap.docs.map((d) => d.id);
}

// What the client gets: the proposal plus the count and what the asking admin can do
function view(id, p, me) {
    const { yes, no } = tally(p);
    return {
        id,
        action: p.action,
        target: p.target,
        targetName: p.targetName,
        reason: p.reason,
        days: p.days ?? null,
        suspend: !!p.suspend,
        proposedBy: p.proposedBy,
        proposedByName: p.proposedByName,
        voters: p.voters,
        votes: p.votes,
        yes,
        no,
        needed: needed(p.voters),
        status: p.status,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        closedAt: p.closedAt ?? null,
        error: p.error ?? null,
        myVote: p.votes?.[me] ?? null,
        canVote: p.status === 'open' && p.voters.includes(me) && !p.votes?.[me],
        canCancel: p.status === 'open' && p.proposedBy === me,
    };
}

// Carries out a passed proposal; returns an error message or null
async function carryOut(id, p) {
    try {
        const user = await loadUser(p.target);
        if (!user) return p.action === 'delete' ? null : 'The user no longer exists.';
        // The situation may have changed while people voted
        const problem = whyNot(p.action, user, p.proposedBy);
        if (problem) return problem;

        switch (p.action) {
            case 'ban':
                await banUser(p.target, { reason: p.reason, days: p.days ?? null, by: p.proposedBy, voteId: id });
                break;
            case 'unban':
                await unbanUser(p.target);
                break;
            case 'make_admin':
                await setRole(p.target, 'admin');
                break;
            case 'remove_admin':
                await setRole(p.target, 'user');
                break;
            case 'delete':
                await deleteUserAccount(p.target);
                break;
        }
        return null;
    } catch (err) {
        console.error(`Vote ${id} could not be carried out:`, err);
        return 'It could not be carried out. Please try again.';
    }
}

// After a proposal closed: carry it out, or lift the suspension it started
async function settle(id, p) {
    if (p.status === 'passed') {
        const error = await carryOut(id, p);
        if (error) {
            await VOTES.doc(id).update({ error });
            if (p.suspend) await liftSuspension(p.target, id);
        }
        return error;
    }
    if (p.suspend) await liftSuspension(p.target, id);
    return null;
}

// Closes proposals whose time is up (checked whenever the votes are read)
async function expireOld() {
    const now = new Date().toISOString();
    const open = await VOTES.where('status', '==', 'open').get();
    for (const doc of open.docs.filter((d) => d.data().expiresAt <= now)) {
        const closed = await db.runTransaction(async (tx) => {
            const p = (await tx.get(doc.ref)).data();
            if (p.status !== 'open') return null;
            tx.update(doc.ref, { status: 'expired', closedAt: now });
            return { ...p, status: 'expired' };
        });
        if (closed) await settle(doc.id, closed);
    }
}

// { open: [...], closed: [... the latest 30] } for the admin "Votes" page
export async function listVotes(me) {
    await expireOld();
    const all = (await VOTES.get()).docs.map((d) => view(d.id, d.data(), me));
    return {
        open: all.filter((v) => v.status === 'open').sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
        closed: all
            .filter((v) => v.status !== 'open')
            .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''))
            .slice(0, 30),
    };
}

// How many open proposals wait for this admin's vote (the badge in the menu)
export async function waitingFor(me) {
    await expireOld();
    const open = await VOTES.where('status', '==', 'open').get();
    return open.docs.filter((d) => view(d.id, d.data(), me).canVote).length;
}

export async function propose(admin, { action, target, reason, days = null, suspend = false } = {}) {
    if (!ACTIONS.includes(action)) throw new VoteError(400, 'Unknown action.');
    const text = typeof reason === 'string' ? reason.trim().replace(/\s+/g, ' ') : '';
    if (text.length < 3 || text.length > 300) throw new VoteError(400, 'Give a reason (3 to 300 characters).');
    if (action === 'ban' && days !== null && !BAN_DAYS.includes(days)) {
        throw new VoteError(400, 'Ban for 1, 7 or 30 days, or permanently.');
    }
    const email = String(target || '').trim().toLowerCase();
    const user = await loadUser(email);
    if (!user) throw new VoteError(404, 'User not found!');
    const problem = whyNot(action, user, admin.id);
    if (problem) throw new VoteError(400, problem);

    await expireOld();
    const pending = await VOTES.where('target', '==', email).get();
    if (pending.docs.some((d) => d.data().status === 'open')) {
        throw new VoteError(409, 'There is already an open vote about this user. Vote on it or wait for it to end.');
    }

    const voters = (await adminEmails()).filter((e) => e !== email);
    if (!voters.includes(admin.id)) voters.push(admin.id);
    const now = new Date();
    const p = {
        action,
        target: email,
        targetName: user.username,
        reason: text,
        days: action === 'ban' ? days : null,
        suspend: false,
        proposedBy: admin.id,
        proposedByName: admin.username,
        voters,
        votes: { [admin.id]: 'yes' },
        status: 'open',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + OPEN_MS).toISOString(),
    };
    // A single voter decides alone; otherwise it waits for the others
    const result = outcome(p);
    if (result) {
        p.status = result;
        p.closedAt = now.toISOString();
    } else if (suspend && SUSPENDABLE.includes(action) && !user.activeBan()) {
        // a banned user cannot sign in anyway, and a suspension would replace (and then lift) the ban
        p.suspend = true;
    }

    const ref = VOTES.doc();
    await ref.set(p);
    if (p.suspend) {
        await suspendUser(email, { reason: text, by: admin.id, voteId: ref.id });
    }
    if (p.status !== 'open') {
        const error = await settle(ref.id, p);
        if (error) p.error = error;
    }
    return view(ref.id, p, admin.id);
}

export async function castVote(admin, id, vote) {
    if (vote !== 'yes' && vote !== 'no') throw new VoteError(400, 'Vote "yes" or "no".');
    const ref = VOTES.doc(String(id));

    // In a transaction: two admins voting at once cannot both close (and carry out) the proposal
    const p = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new VoteError(404, 'Vote not found!');
        const current = snap.data();
        if (current.status !== 'open') throw new VoteError(409, 'This vote has already ended.');
        if (current.expiresAt <= new Date().toISOString()) throw new VoteError(409, 'This vote has expired.');
        if (!current.voters.includes(admin.id)) throw new VoteError(403, 'You are not one of the voters on this.');
        if (current.votes?.[admin.id]) throw new VoteError(409, 'You have already voted.');

        const next = { ...current, votes: { ...current.votes, [admin.id]: vote } };
        const result = outcome(next);
        // the whole map: a dotted path would split the email at its dots
        const change = { votes: next.votes };
        if (result) {
            next.status = result;
            next.closedAt = new Date().toISOString();
            Object.assign(change, { status: result, closedAt: next.closedAt });
        }
        tx.update(ref, change);
        return next;
    });

    if (p.status !== 'open') {
        const error = await settle(id, p);
        if (error) p.error = error;
    }
    return view(id, p, admin.id);
}

export async function cancelVote(admin, id) {
    const ref = VOTES.doc(String(id));
    const p = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new VoteError(404, 'Vote not found!');
        const current = snap.data();
        if (current.status !== 'open') throw new VoteError(409, 'This vote has already ended.');
        if (current.proposedBy !== admin.id) throw new VoteError(403, 'Only the admin who proposed it can withdraw it.');
        const closedAt = new Date().toISOString();
        tx.update(ref, { status: 'cancelled', closedAt });
        return { ...current, status: 'cancelled', closedAt };
    });
    await settle(id, p);
    return view(id, p, admin.id);
}
