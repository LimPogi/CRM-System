const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const { q, entityType, limit = 100 } = req.query;
  const { rows } = await pool.query(
    `SELECT a.*, u.fullname AS actor_name FROM activity_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE ($1::text IS NULL OR a.action ILIKE '%' || $1 || '%' OR a.description ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR a.entity_type = $2)
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [q || null, entityType || null, limit]
  );
  res.json(rows);
});

module.exports = router;
