import bcrypt from "bcrypt";
import { db } from "../config/firebase/firebase.js";
import { getUserBy } from "../services/userService.js";
import { generateToken } from "../services/authService.js";
import { sendCodeViaEmail } from "../utils/email/sendCodeViaEmail.js";
import { User } from "../models/User.js";

const USERS = db.collection("users");

/* ----- AUTH FUNCTIONS ----- */

//Register logic same as createUser in userController.js, but with password hashing

export async function loginUser(req, res) {
  const { email, password } = req.body;

  try {
    const user = await getUserBy("email", email);

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ success: false, message: "Wrong password! Please try again." });
    }

    // Generate 7-day token
    const token = generateToken(user);

    // Save the token in Firestore
    user.setToken(token);
    await USERS.doc(user.id).update(user.toFirestore());

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not login!" });
  }
}

export async function logoutUser(req, res) {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized!" });
    }

    user.setToken(null);
    await USERS.doc(user.id).update({
      token: null,
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: "Logged out successfully!" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Could not logout!" });
  }
}

export async function requestResetCode(req, res) {
  const { email } = req.body;
  try {
    const user = await getUserBy("email", email); // Ensure the user exists
    const userId = user.id;

    // Generate a 6-digit reset code and hash it
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(resetCode, 10);

    // Save the hash code to Firestore with an expiry time of 15 minutes
    await USERS.doc(userId).update({
      resetCode: hashedCode,
      resetCodeExpiry: Date.now() + 15 * 60 * 1000,
    });

    //Save code to instance
    user.setResetCode(hashedCode);

    await sendCodeViaEmail(email, resetCode);

    return res.json({ success: true, message: "Reset code sent to email!" });
  } catch (err) {
    console.error("Request reset code error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not request reset code!" });
  }
}

export async function checkResetCode(req, res) {
  const { email, code } = req.body;
  try {
    const user = await getUserBy("email", email); // Ensure the user exists
    const isValid = await bcrypt.compare(code, user.resetCode);
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid reset code!", data: { isValid: false } });
    }
    return res
      .status(200)
      .json({ success: true, message: "Reset code is valid", data: { isValid: true } });
  } catch (err) {
    console.error("Check reset code error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
}

export async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  try {
    const user = await getUserBy("email", email);

    const isValid = await bcrypt.compare(code, user.resetCode);
    if (!isValid || Date.now() > user.resetCodeExpiry) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset code!" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //Reset the password and clear the reset code (and expiry) from Firestore
    await USERS.doc(user.id).update({
      password: hashedPassword,
      resetCode: null,
      resetCodeExpiry: null,
    });

    //Clear the reset code from the user instance
    user.setResetCode(null);

    const token = generateToken(user);

    return res.status(200).json({
      message: "Password has been reset successfully!",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
}

export async function name(req, res) {
  try {
    await checkResetCode(req, res);
  } catch (err) {

  }
}
