const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../repositories/db');
const config = require('../config');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }

  sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async register({ fullName, email, password }) {
    if (!fullName || !email || !password) {
      throw new Error('Full name, email, and password are required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.findOne('users', u => u.email === cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = db.create('users', {
      id: `usr_${uuidv4().substring(0, 8)}`,
      fullName: fullName.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'PASSENGER',
      pointsBalance: 50, // Starting bonus
      isDemoAccount: false
    });

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.findOne('users', u => u.email === cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  getUserById(id) {
    const user = db.findById('users', id);
    if (!user) return null;
    return this.sanitizeUser(user);
  }
}

module.exports = new AuthService();
