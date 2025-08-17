import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { validationResult } from 'express-validator';

export async function userExists(email){
  return User.findOne({ email });
}

export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password } = req.body;
  if (await userExists(email)) return res.status(400).json({ message: 'User already exists' });

  const user = await User.create({ username, email, password });
  res.status(201).json({
    _id: user.id,
    username: user.username,
    email: user.email,
    token: generateToken(user.id)
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: 'User with this email not found!' });
  }

  const isMatch = await user.matchPassword(password);

  if (isMatch) {
    res.json({
      _id: user.id,
      username: user.username,
      email: user.email,
      token: generateToken(user.id)
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials!' });
  }
};

