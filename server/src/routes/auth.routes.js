const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/db");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, fullname: user.fullname },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1 AND status = 'Active'`, [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  res.json({
    token: signToken(user),
    user: { id: user.id, fullname: user.fullname, email: user.email, role: user.role, status: user.status },
  });
});

// Lets a client/company owner create their own admin account. Set
// ADMIN_SIGNUP_CODE in .env to require a shared setup code once you have
// at least one admin — leave it unset for open first-time signup.
router.post("/register-admin", async (req, res) => {
  const { fullname, email, password, setupCode } = req.body;
  if (!fullname || !email || !password) {
    return res.status(400).json({ error: "fullname, email, and password are required" });
  }
  if (process.env.ADMIN_SIGNUP_CODE && setupCode !== process.env.ADMIN_SIGNUP_CODE) {
    return res.status(403).json({ error: "Invalid setup code" });
  }

  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows.length) return res.status(409).json({ error: "An account with this email already exists" });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (fullname, email, password, role, status)
     VALUES ($1, $2, $3, 'admin', 'Active')
     RETURNING id, fullname, email, role, status`,
    [fullname, email, hash]
  );
  const user = rows[0];
  res.json({ token: signToken(user), user });
});

// No email provider is wired up, so this doesn't actually send mail yet.
// It generates and stores a reset token the same way a real flow would;
// swap in an email service (Resend, SES, etc.) where noted below to send
// the link instead of returning it. In development, the token is returned
// directly so the flow is testable end to end.
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  // Always respond the same way whether or not the email exists, so this
  // endpoint can't be used to discover which emails have accounts.
  const generic = { ok: true, message: "If that email has an account, a reset link has been sent." };
  if (!rows.length) return res.json(generic);

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await pool.query(`UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3`, [token, expires, rows[0].id]);

  // TODO: send `token` via email here instead of returning it.
  const devToken = process.env.NODE_ENV === "production" ? undefined : token;
  res.json({ ...generic, devToken });
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "token and newPassword are required" });

  const { rows } = await pool.query(
    `SELECT * FROM users WHERE reset_token = $1 AND reset_expires > now()`,
    [token]
  );
  if (!rows.length) return res.status(400).json({ error: "This reset link is invalid or has expired" });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2`,
    [hash, rows[0].id]
  );
  res.json({ ok: true });
});

router.post("/logout", (req, res) => res.json({ ok: true }));

module.exports = router;
