import * as votes from '../services/voteService.js';

// Admin votes on banning, unbanning, admin rights and deleting users (see voteService)
const handle = (work) => async (req, res) => {
    try {
        return res.json({ success: true, data: await work(req) });
    } catch (err) {
        if (err instanceof votes.VoteError) return res.status(err.status).json({ success: false, message: err.message });
        console.error('Votes error:', err);
        return res.status(500).json({ success: false, message: 'Server error!' });
    }
};

// GET /api/votes -> { open, closed }
export const list = handle((req) => votes.listVotes(req.user.id));
// GET /api/votes/waiting -> { count } open votes this admin has not voted on yet
export const waiting = handle(async (req) => ({ count: await votes.waitingFor(req.user.id) }));
// POST /api/votes { action, target, reason, days?, suspend? }
export const propose = handle((req) => votes.propose(req.user, req.body ?? {}));
// POST /api/votes/:id/vote { vote: "yes" | "no" }
export const vote = handle((req) => votes.castVote(req.user, req.params.id, req.body?.vote));
// POST /api/votes/:id/cancel (the proposer)
export const cancel = handle((req) => votes.cancelVote(req.user, req.params.id));
