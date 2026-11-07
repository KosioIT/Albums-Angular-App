import jwt from "jsonwebtoken";
import { db } from "../config/firebase/firebase.js";
import { User } from "../models/User.js";
import { rotateSession, deleteSession } from "./sessionService.js";

const USERS = db.collection("users");

export const generateAccessToken = (user, sessionId) => {
  return jwt.sign(
    {
      id: user.id,
      sid: sessionId,
      role: user.role, // only for the UI; the server always reads the role from the database
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
  );
}


/* 
  Swaps a refresh token for a new one plus a fresh access token.
  Returns null when the session is invalid (unknown, expired, reused or user deleted).
*/
export async function refreshTokens(refreshToken) {
  const rotated = await rotateSession(refreshToken);
  if (!rotated) return null;

  const doc = await USERS.doc(rotated.userId).get();
  if (!doc.exists) {
    await deleteSession(rotated.sessionId);
    return null;
  }

  const user = new User(doc.data(), doc.id);
  return {
    user,
    refreshToken: rotated.refreshToken,
    accessToken: generateAccessToken(user, rotated.sessionId),
  };
}