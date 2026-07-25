const pool = require("../config/db");
const { emitToUser } = require("../sockets");

/**
 * Create a notification for a user and push it over their socket room in
 * the same step, so "Employee receives notification" (per the spec's
 * realtime flow) works whether or not they're online right now — it's
 * waiting in /api/notifications either way.
 */
async function notify(userId, title, body) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, title, body) VALUES ($1, $2, $3) RETURNING *`,
    [userId, title, body || null]
  );
  emitToUser(userId, "notification", rows[0]);
  return rows[0];
}

module.exports = { notify };
