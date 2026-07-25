const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ---------------------------------------------------------------------
// Local-disk storage by default so the project runs with zero external
// setup. To use Supabase Storage / Cloudinary / S3 instead:
//   1. Swap `storage` below for multer.memoryStorage() (so you get a
//      buffer instead of a disk path).
//   2. In routes/file.routes.js, after multer runs, upload req.file.buffer
//      to your provider's SDK and store the returned URL/key as
//      `stored_name` instead of req.file.filename.
//   3. Add a matching `download` function here that streams from that
//      provider instead of `res.sendFile`.
// Nothing else in the app needs to change — routes only call the
// functions exported from this file.
// ---------------------------------------------------------------------

const UPLOAD_DIR = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

function filePath(storedName) {
  return path.join(UPLOAD_DIR, storedName);
}

module.exports = { upload, filePath, UPLOAD_DIR };
