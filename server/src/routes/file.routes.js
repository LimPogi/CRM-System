const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { upload, filePath } = require("../config/fileStorage");
const { emitToAdmins } = require("../sockets");
const { logActivity } = require("../services/activity.service");

const router = express.Router();
router.use(requireAuth);

// List files for a customer and/or job.
router.get("/", async (req, res) => {
  const { customerId, jobId } = req.query;
  const { rows } = await pool.query(
    `SELECT f.*, u.fullname AS uploaded_by_name FROM files f
     LEFT JOIN users u ON u.id = f.uploaded_by
     WHERE ($1::int IS NULL OR f.customer_id = $1) AND ($2::int IS NULL OR f.job_id = $2)
     ORDER BY f.created_at DESC`,
    [customerId || null, jobId || null]
  );
  res.json(rows);
});

// Accepts PDF, Word, Excel, images, ZIP, video — anything Multer receives;
// there's no type allowlist here since the spec lists a broad set of formats.
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file was uploaded" });
  const { customerId, jobId } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO files (customer_id, job_id, filename, filepath, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [customerId || null, jobId || null, req.file.originalname, req.file.filename, req.file.size, req.user.id]
  );
  const file = rows[0];

  const entityType = jobId ? "job" : customerId ? "customer" : null;
  const entityId = jobId ? Number(jobId) : customerId ? Number(customerId) : null;
  if (entityType) {
    await logActivity({ userId: req.user.id, action: "File uploaded", entityType, entityId, description: file.filename });
  }
  emitToAdmins("file-uploaded", file);
  res.json(file);
});

router.get("/:id/download", async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(`SELECT * FROM files WHERE id = $1`, [id]);
  if (!rows.length) return res.status(404).json({ error: "File not found" });
  res.download(filePath(rows[0].filepath), rows[0].filename);
});

// Avatars are visible to any logged-in user (not just admins) so employee
// pictures render in customer/job lists — unlike customer/job documents,
// which stay behind the admin-or-assigned-employee check above.
router.get("/employee/:userId/avatar", async (req, res) => {
  const { userId } = req.params;
  const { rows } = await pool.query(`SELECT avatar_url FROM users WHERE id = $1`, [userId]);
  if (!rows.length || !rows[0].avatar_url) return res.status(404).json({ error: "No avatar set" });
  res.sendFile(filePath(rows[0].avatar_url));
});

module.exports = router;
