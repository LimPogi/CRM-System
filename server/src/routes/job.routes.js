const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { emitToAdmins, emitToUser } = require("../sockets");
const { logActivity } = require("../services/activity.service");
const { notify } = require("../services/notification.service");

const router = express.Router();
router.use(requireAuth);

// Kanban columns, in order.
const VALID_STATUSES = ["To Do", "In Progress", "Review", "Completed"];
// Employees can drag freely between the open columns, but a Completed job
// is closed — only an admin can reopen it (via PUT /:id).
const VALID_TRANSITIONS = {
  "To Do": ["In Progress"],
  "In Progress": ["To Do", "Review"],
  Review: ["In Progress", "Completed"],
  Completed: [],
};

function jobCode(id) {
  return `JOB-${1000 + Number(id)}`;
}
function withCode(row) {
  return row && { ...row, code: jobCode(row.id) };
}

// Employees see their assigned tasks; admins see everything. ?status= filters.
router.get("/", async (req, res) => {
  const { status } = req.query;
  const isAdmin = req.user.role === "admin";
  const { rows } = await pool.query(
    `SELECT j.*, c.firstname AS customer_firstname, c.lastname AS customer_lastname,
            c.company AS customer_company, u.fullname AS assigned_name,
            COALESCE(
              (SELECT json_agg(json_build_object('id', n.id, 'note', n.note, 'created_at', n.created_at) ORDER BY n.created_at)
               FROM notes n WHERE n.job_id = j.id),
              '[]'
            ) AS notes
     FROM jobs j
     JOIN customers c ON c.id = j.customer_id
     LEFT JOIN users u ON u.id = j.assigned_to
     WHERE ($1::int IS NULL OR j.assigned_to = $1)
       AND ($2::text IS NULL OR j.status = $2)
     ORDER BY j.deadline ASC NULLS LAST, j.created_at DESC`,
    [isAdmin ? null : req.user.id, status || null]
  );
  res.json(rows.map(withCode));
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const jobRes = await pool.query(
    `SELECT j.*, c.firstname AS customer_firstname, c.lastname AS customer_lastname,
            c.company AS customer_company, u.fullname AS assigned_name
     FROM jobs j JOIN customers c ON c.id = j.customer_id LEFT JOIN users u ON u.id = j.assigned_to
     WHERE j.id = $1`,
    [id]
  );
  if (!jobRes.rows.length) return res.status(404).json({ error: "Job not found" });
  const job = jobRes.rows[0];
  if (req.user.role !== "admin" && job.assigned_to !== req.user.id) {
    return res.status(403).json({ error: "This job isn't assigned to you" });
  }

  const notesRes = await pool.query(
    `SELECT n.*, u.fullname FROM notes n JOIN users u ON u.id = n.user_id WHERE job_id = $1 ORDER BY n.created_at`,
    [id]
  );
  const filesRes = await pool.query(`SELECT * FROM files WHERE job_id = $1 ORDER BY created_at DESC`, [id]);
  res.json({ ...withCode(job), notes: notesRes.rows, files: filesRes.rows });
});

router.post("/", requireAdmin, async (req, res) => {
  const { title, description, customerId, assignedTo, priority, deadline } = req.body;
  if (!title || !customerId) return res.status(400).json({ error: "title and customerId are required" });

  const { rows } = await pool.query(
    `INSERT INTO jobs (title, description, customer_id, assigned_to, assigned_by, priority, deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, description || null, customerId, assignedTo || null, req.user.id, priority || "Medium", deadline || null]
  );
  const job = withCode(rows[0]);

  await logActivity({ userId: req.user.id, action: "Job created", entityType: "job", entityId: job.id, description: title });
  if (assignedTo) {
    await logActivity({ userId: req.user.id, action: "Job assigned", entityType: "job", entityId: job.id, description: `Assigned to user #${assignedTo}` });
    await notify(assignedTo, "New job assigned", `${job.code} — ${title}${deadline ? `, due ${deadline}` : ""}`);
    emitToUser(assignedTo, "job-assigned", job);
  }
  emitToAdmins("job-created", job);
  res.json(job);
});

// Employees move their own jobs through the Kanban columns (drag-and-drop
// calls this same endpoint); admins can set any status directly.
router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const current = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
  if (!current.rows.length) return res.status(404).json({ error: "Job not found" });
  const job = current.rows[0];

  if (req.user.role !== "admin") {
    if (job.assigned_to !== req.user.id) return res.status(403).json({ error: "This job isn't assigned to you" });
    if (job.status === status) return res.status(400).json({ error: `This job is already in "${status}"` });
    if (job.status === "Completed") return res.status(400).json({ error: "This job is completed and closed. Ask an admin to reopen it." });
    if (!VALID_TRANSITIONS[job.status].includes(status)) {
      return res.status(400).json({ error: `Can't move a job from "${job.status}" to "${status}" directly` });
    }
  }

  const progress = status === "Completed" ? 100 : status === "To Do" ? 0 : job.progress;
  const { rows } = await pool.query(`UPDATE jobs SET status = $1, progress = $2 WHERE id = $3 RETURNING *`, [status, progress, id]);
  const updated = withCode(rows[0]);

  await logActivity({ userId: req.user.id, action: "Status changed", entityType: "job", entityId: updated.id, description: `Status changed to ${status}` });
  emitToAdmins("job-status-changed", updated);
  res.json(updated);
});

router.put("/:id/progress", async (req, res) => {
  const { id } = req.params;
  const { progress } = req.body;
  if (typeof progress !== "number" || progress < 0 || progress > 100) {
    return res.status(400).json({ error: "progress must be a number between 0 and 100" });
  }
  const job = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
  if (!job.rows.length) return res.status(404).json({ error: "Job not found" });
  if (req.user.role !== "admin" && job.rows[0].assigned_to !== req.user.id) {
    return res.status(403).json({ error: "This job isn't assigned to you" });
  }
  const { rows } = await pool.query(`UPDATE jobs SET progress = $1 WHERE id = $2 RETURNING *`, [progress, id]);
  res.json(withCode(rows[0]));
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, assignedTo, priority, deadline, status } = req.body;
  const before = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
  if (!before.rows.length) return res.status(404).json({ error: "Job not found" });

  const { rows } = await pool.query(
    `UPDATE jobs SET
       title = COALESCE($1, title), description = COALESCE($2, description),
       assigned_to = COALESCE($3, assigned_to), priority = COALESCE($4, priority),
       deadline = COALESCE($5, deadline), status = COALESCE($6, status)
     WHERE id = $7 RETURNING *`,
    [title || null, description || null, assignedTo || null, priority || null, deadline || null, status || null, id]
  );
  const updated = withCode(rows[0]);

  if (assignedTo && assignedTo !== before.rows[0].assigned_to) {
    await logActivity({ userId: req.user.id, action: "Job assigned", entityType: "job", entityId: updated.id, description: `Assigned to user #${assignedTo}` });
    await notify(assignedTo, "New job assigned", `${updated.code} — ${updated.title}`);
    emitToUser(assignedTo, "job-assigned", updated);
  }
  emitToAdmins("job-updated", updated);
  res.json(updated);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(`DELETE FROM jobs WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) return res.status(404).json({ error: "Job not found" });
  res.json({ ok: true });
});

router.post("/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  if (!note || !note.trim()) return res.status(400).json({ error: "Write a note before adding it" });

  const job = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
  if (!job.rows.length) return res.status(404).json({ error: "Job not found" });
  if (req.user.role !== "admin" && job.rows[0].assigned_to !== req.user.id) {
    return res.status(403).json({ error: "This job isn't assigned to you" });
  }

  const { rows } = await pool.query(
    `INSERT INTO notes (job_id, user_id, note) VALUES ($1, $2, $3) RETURNING *`,
    [id, req.user.id, note.trim()]
  );
  await logActivity({ userId: req.user.id, action: "Note added", entityType: "job", entityId: Number(id), description: note.trim().slice(0, 140) });
  emitToAdmins("job-note-added", { jobId: Number(id), note: rows[0] });
  res.json(rows[0]);
});

module.exports = router;
