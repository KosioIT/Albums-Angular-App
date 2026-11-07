import { REFRESH_TTL_MS } from "../services/sessionService.js";

export const REFRESH_COOKIE = "refreshToken";

function cookieOptions() {
  const sameSite = process.env.COOKIE_SAMESITE || "strict";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/api/auth", // sent only to the auth endpoints
  };
}

export const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(), maxAge: REFRESH_TTL_MS });

export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieOptions());

export const readRefreshCookie = (req) => req.cookies?.[REFRESH_COOKIE];