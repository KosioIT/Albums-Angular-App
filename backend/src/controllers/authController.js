import bcrypt from "bcrypt";

import { db } from "../config/firebase/firebase.js";
import { getUserBy } from "../services/userService.js";
import { issueResetCode, getResetCodeError, CLEARED_RESET_CODE } from "../services/resetCodeService.js";
import { generateAccessToken, refreshTokens } from "../services/authService.js";
import { createSession, deleteSession, deleteSessionByToken, revokeAllSessions, listUserSessions, revokeUserSession } from "../services/sessionService.js";
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from "../utils/refreshCookie.js";
import { sendCodeViaEmail } from "../utils/email/sendCodeViaEmail.js";
import { sendPasswordChangedEmail } from "../utils/email/sendPasswordChangedEmail.js";

const USERS = db.collection("users");


/* ------- LOGIN / LOGOUT ------- */

export async function loginUser(req, res) {
  const { email, password } = req.body;

  try {
    const user = await getUserBy("email", email);

    const match = user ? await bcrypt.compare(password, user.password) : false;
    if (!match) {
      return res
        .status(400)
        .json({ success: false, message: "Wrong email or password!" });
    }

    // Logging in again replaces this browser's session instead of piling up a second one
    await deleteSessionByToken(readRefreshCookie(req));

    const { sessionId, refreshToken } = await createSession(user.id, req.get("user-agent"));
    setRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      message: `Logged in successfully! Welcome back, ${user.username}!`,
      token: generateAccessToken(user, sessionId),
      user: user.toBasic(),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Could not login!" });
  }
}

export async function logoutUser(req, res) {
  try {
    await deleteSession(req.auth.sid);
    clearRefreshCookie(res);
    return res.status(200).json({ success: true, message: "Logged out successfully!" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Could not logout!" });
  }
}

/* ------- PASSWORD RESET ------- */

export async function requestResetCode(req, res) {
  const { email } = req.body;
  const genericResponse = () =>
    res.json({ success: true, message: "If this email is registered, a reset code has been sent." });

  try {
    const user = await getUserBy("email", email);
    if (!user) return genericResponse();

    const code = await issueResetCode(user); // null during the cooldown
    if (code) {
      sendCodeViaEmail(email, code).catch((err) => {
        console.error("Send reset code email error:", err);
      });
    }

    return genericResponse();
  } catch (err) {
    console.error("Request reset code error:", err);
    return res.status(500).json({ success: false, message: "Could not request reset code!" });
  }
}

export async function checkResetCode(req, res) {
  const { email, code } = req.body;
  try {
    const user = await getUserBy("email", email);
    const error = await getResetCodeError(user, code);

    if (error) {
      return res.status(400).json({ success: false, message: error, data: { isValid: false } });
    }
    return res.status(200).json({ success: true, message: "Reset code is valid", data: { isValid: true } });
  } catch (err) {
    console.error("Check reset code error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
}

export async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  try {
    const user = await getUserBy("email", email);
    const error = await getResetCodeError(user, code);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    await USERS.doc(user.id).update({
      password: await bcrypt.hash(newPassword, 10),
      ...CLEARED_RESET_CODE,
      updated_at: new Date().toISOString(),
    });

    await revokeAllSessions(user.id); // every old session dies; the user is logged in again below

    // Notify the owner; a failed email must not fail the reset, so errors are only logged
    sendPasswordChangedEmail(user.email, user.username).catch((err) => {
      console.error("Password changed email error:", err);
    });

    const { sessionId, refreshToken } = await createSession(user.id, req.get("user-agent"));
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully!",
      token: generateAccessToken(user, sessionId),
      user: user.toBasic(),
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
}

/* ------- SESSION MANAGEMENT ------- */

// Current session info for the authenticated user
export function getMe(req, res) {
  return res.json({
    success: true,
    loggedIn: true,
    user: req.user.toBasic(),
    tokenExpiresAt: new Date(req.auth.exp * 1000).toISOString(),
  });
}

// Issues a new access token using the refresh token from the cookie
export async function refreshSession(req, res) {
  try {
    const result = await refreshTokens(readRefreshCookie(req));

    if (!result) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: "Session expired!" });
    }

    setRefreshCookie(res, result.refreshToken);
    return res.json({
      success: true,
      token: result.accessToken,
      user: result.user.toBasic(),
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ success: false, message: "Could not refresh session!" });
  }
}

// Logs out from all devices
export async function logoutAll(req, res) {
  try {
    await revokeAllSessions(req.user.id);
    clearRefreshCookie(res);
    return res.json({ success: true, message: "Logged out from all devices!" });
  } catch (err) {
    console.error("Logout all error:", err);
    return res.status(500).json({ success: false, message: "Could not logout!" });
  }
}

export async function getSessions(req, res) {
  try {
    const data = await listUserSessions(req.user.id, req.auth.sid);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("List sessions error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch sessions!" });
  }
}

// Revokes one session, if it belongs to the authenticated user
export async function revokeSession(req, res) {
  try {
    const ok = await revokeUserSession(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Session not found!" });
    return res.json({ success: true, message: "Session revoked!" });
  } catch (err) {
    console.error("Revoke session error:", err);
    return res.status(500).json({ success: false, message: "Could not revoke session!" });
  }
}