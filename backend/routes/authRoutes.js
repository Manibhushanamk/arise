import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/userModel.js';
import config from '../config.js';

const router = express.Router();
const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign({ userId: user._id, name: user.name, email: user.email }, config.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide all fields.');
    }
    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long.');
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User with this email already exists.');
    }
    const user = await User.create({ name, email, password });
    if (user) {
      res.status(201).json({ token: generateToken(user), name: user.name });
    } else {
      res.status(400);
      throw new Error('Invalid user data.');
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({ token: generateToken(user), name: user.name });
        } else {
            res.status(401);
            throw new Error('Invalid email or password.');
        }
    } catch (error) {
        next(error);
    }
});

// @desc    Authenticate with Google
// @route   POST /api/auth/google
router.post('/google', async (req, res, next) => {
    try {
        const { token: googleToken } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: googleToken,
            audience: config.GOOGLE_CLIENT_ID,
        });
        const { name, email, sub } = ticket.getPayload();
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ name, email, googleId: sub });
        }
        res.json({ token: generateToken(user), name: user.name });
    } catch (error) {
        next(error);
    }
});

export default router;