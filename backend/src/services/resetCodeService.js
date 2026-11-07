import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../config/firebase/firebase.js";

const USERS = db.collection("users");

const RESET_CODE_TTL_MS = 15 * 60 * 1000;   // how long a code is valid
const RESET_CODE_COOLDOWN_MS = 60 * 1000;   // minimum time between two codes for one account
const MAX_RESET_ATTEMPTS = 5;               // wrong guesses allowed per code
const INVALID_CODE = "Invalid or expired reset code!";

// Spread into an update to clear the reset code fields
export const CLEARED_RESET_CODE = {
    resetCode: null,
    resetCodeExpiry: null,
    resetCodeAttempts: 0,
};

// Creates and stores a new code. Returns the plain code (to be emailed),
// or null when a code was already sent less than a minute ago.
export async function issueResetCode(user) {
    const sentAt = user.resetCodeExpiry ? user.resetCodeExpiry - RESET_CODE_TTL_MS : 0;
    if (Date.now() - sentAt < RESET_CODE_COOLDOWN_MS) return null;

    const code = crypto.randomInt(100000, 1000000).toString();

    await USERS.doc(user.id).update({
        resetCode: await bcrypt.hash(code, 10),
        resetCodeExpiry: Date.now() + RESET_CODE_TTL_MS,
        resetCodeAttempts: 0,
    });

    return code;
}

// Returns null when the code is correct, otherwise an error message.
// Every attempt is counted; after MAX_RESET_ATTEMPTS the code is dead.
export async function getResetCodeError(user, code) {
    if (!user) return INVALID_CODE;

    const ref = USERS.doc(user.id);

    const check = await db.runTransaction(async (t) => {
        const data = (await t.get(ref)).data();

        if (!data.resetCode || !data.resetCodeExpiry || Date.now() > data.resetCodeExpiry) {
            return { error: INVALID_CODE };
        }

        const attempts = data.resetCodeAttempts || 0;
        if (attempts >= MAX_RESET_ATTEMPTS) {
            return { error: "Too many attempts! Please request a new code." };
        }

        t.update(ref, { resetCodeAttempts: attempts + 1 });
        return { hash: data.resetCode };
    });

    if (check.error) return check.error;

    const isValid = await bcrypt.compare(code, check.hash);
    return isValid ? null : INVALID_CODE;
}