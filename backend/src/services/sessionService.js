import crypto from "crypto";
import { db } from "../config/firebase/firebase.js";

const SESSIONS = db.collection("sessions");

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 10;

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const newSecret = () => crypto.randomBytes(48).toString("base64url");
const isValidId = (id) => /^[A-Za-z0-9]+$/.test(String(id || ""));

function safeEqual(a, b) {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Keeps at most MAX_SESSIONS per user (oldest by last use are removed)
async function trimSessions(userId) {
    const snap = await SESSIONS.where("userId", "==", userId).get();
    if (snap.size <= MAX_SESSIONS) return;

    const oldest = snap.docs
        .sort((a, b) => a.data().lastUsedAt.localeCompare(b.data().lastUsedAt))
        .slice(0, snap.size - MAX_SESSIONS);
    await Promise.all(oldest.map((d) => d.ref.delete()));
}

export async function createSession(userId, userAgent = "") {
    const secret = newSecret();
    const ref = SESSIONS.doc();
    const now = new Date().toISOString();

    await ref.set({
        userId,
        tokenHash: sha256(secret), // only the hash is stored
        userAgent: String(userAgent).slice(0, 200),
        createdAt: now,
        lastUsedAt: now,
        expiresAt: Date.now() + REFRESH_TTL_MS,
    });

    await trimSessions(userId);
    return { sessionId: ref.id, refreshToken: `${ref.id}.${secret}` };
}

export async function getSession(sessionId) {
    if (!isValidId(sessionId)) return null;
    const snap = await SESSIONS.doc(sessionId).get();
    return snap.exists ? snap.data() : null;
}

// Validates the refresh token and swaps it for a new one.
// Returns null when the token is unknown, expired or was already used (possible theft).
export async function rotateSession(refreshToken) {
    const [sessionId, secret] = String(refreshToken || "").split(".");
    if (!isValidId(sessionId) || !secret) return null;

    const ref = SESSIONS.doc(sessionId);
    const nextSecret = newSecret();

    return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) return null;
        const session = snap.data();

        if (Date.now() > session.expiresAt) {
            t.delete(ref);
            return null;
        }

        if (!safeEqual(sha256(secret), session.tokenHash)) {
            t.delete(ref); // an old token was presented again: kill the whole session
            return null;
        }

        t.update(ref, {
            tokenHash: sha256(nextSecret),
            lastUsedAt: new Date().toISOString(),
            expiresAt: Date.now() + REFRESH_TTL_MS,
        });

        return { userId: session.userId, sessionId, refreshToken: `${sessionId}.${nextSecret}` };
    });
}

export async function deleteSession(sessionId) {
    if (isValidId(sessionId)) await SESSIONS.doc(sessionId).delete();
}

export async function revokeAllSessions(userId) {
    const snap = await SESSIONS.where("userId", "==", userId).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}

export async function listUserSessions(userId, currentSessionId) {
    const snap = await SESSIONS.where("userId", "==", userId).get();
    return snap.docs
        .map((d) => {
            const s = d.data();
            return {
                id: d.id,
                userAgent: s.userAgent,
                createdAt: s.createdAt,
                lastUsedAt: s.lastUsedAt,
                current: d.id === currentSessionId,
            };
        })
        .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
}

// Returns false when the session does not exist or belongs to someone else
export async function revokeUserSession(userId, sessionId) {
    const session = await getSession(sessionId);
    if (!session || session.userId !== userId) return false;
    await deleteSession(sessionId);
    return true;
}