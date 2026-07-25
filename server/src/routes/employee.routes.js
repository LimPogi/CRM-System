const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { emitToAdmins } = require("../sockets");
const { logActivity } = require("../services/activity.service");
const { upload, filePath } = require("../config/fileStorage");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.fullname, u.email, u.department, u.position, u.avatar_url, u.status, u.created_at,
            COUNT(j.id) FILTER (WHERE j.status <> 'Completed') AS open_jobs,
            COUNT(j.id) FILTER (WHERE j.status = 'Completed') AS completed_jobs
     FROM users u
     LEFT JOIN jobs j ON j.assigned_to = u.id
     WHERE u.role = 'employee'
     GROUP BY u.id
     ORDER BY u.fullname`
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { fullname, email, password, department, position } = req.body;
  if (!fullname || !email || !password) {
    return res.status(400).json({ error: "fullname, email, and password are required" });
  }
  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows.length) return res.status(409).json({ error: "An account with this email already exists" });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (fullname, email, password, role, department, position, status)
     VALUES ($1, $2, $3, 'employee', $4, $5, 'Active')
     RETURNING id, fullname, email, department, position, status`,
    [fullname, email, hash, department || null, position || null]
  );
  await logActivity({
    userId: req.user.id, action: "Created employee", entityType: "employee",
    entityId: rows[0].id, description: `${fullname} added`,
  });
  res.json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fullname, email, department, position } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET
       fullname = COALESCE($1, fullname), email = COALESCE($2, email),
       department = COALESCE($3, department), position = COALESCE($4, position)
     WHERE id = $5 AND role = 'employee'
     RETURNING id, fullname, email, department, position, status`,
    [fullname || null, email || null, department || null, position || null, id]
  );
  if (!rows.length) return res.status(404).json({ error: "Employee not found" });
  await logActivity({ userId: req.user.id, action: "Edited employee", entityType: "employee", entityId: Number(id) });
  res.json(rows[0]);
});

router.post("/:id/avatar", upload.single("file"), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: "No file was uploaded" });
  const { rows } = await pool.query(
    `UPDATE users SET avatar_url = $1 WHERE id = $2 AND role = 'employee' RETURNING id, avatar_url`,
    [req.file.filename, id]
  );
  if (!rows.length) return res.status(404).json({ error: "Employee not found" });
  res.json(rows[0]);
});

router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Active' | 'Inactive'
  if (!["Active", "Inactive"].includes(status)) {
    return res.status(400).json({ error: "status must be 'Active' or 'Inactive'" });
  }
  const { rows } = await pool.query(
    `UPDATE users SET status = $1 WHERE id = $2 AND role = 'employee' RETURNING id, fullname, status`,
    [status, id]
  );
  if (!rows.length) return res.status(404).json({ error: "Employee not found" });
  await logActivity({
    userId: req.user.id, action: "Changed employee status", entityType: "employee",
    entityId: Number(id), description: `${rows[0].fullname} marked ${status}`,
  });
  emitToAdmins("employee-status-changed", rows[0]);
  res.json(rows[0]);
});

// Soft delete — keeps job/customer history intact instead of orphaning rows.
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `UPDATE users SET status = 'Inactive' WHERE id = $1 AND role = 'employee' RETURNING id`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Employee not found" });
  await logActivity({ userId: req.user.id, action: "Deleted employee", entityType: "employee", entityId: Number(id) });
  res.json({ ok: true });
});

module.exports = router;
