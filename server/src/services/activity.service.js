const pool = require("../config/db");

/**
 * Record an entry in activity_logs. Call this from any route that creates
 * or changes a customer, job, file, or employee — it's what powers both
 * the per-customer timeline and the admin's global Activity Logs page.
 */
async function logActivity({ userId = null, action, description, entityType, entityId }) {
  await pool.query(
    `INSERT INTO activity_logs (user_id, action, description, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, description || null, entityType || null, entityId || null]
  );
}

module.exports = { logActivity };
