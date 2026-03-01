const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const config = require("./env");

// ─── Resolve and ensure upload directory exists ────────────────────────────────
const UPLOAD_DIR = path.resolve(process.cwd(), config.UPLOAD_PATH);
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

// ─── Disk storage ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),

  filename: (_req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const base     = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const unique   = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

// ─── File filter ──────────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Unsupported file type "${file.mimetype}". Allowed: JPEG, PNG, WebP.`
    );
    err.statusCode = 415;
    cb(err, false);
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files:    config.MAX_FILE_COUNT,
  },
});

// ─── Export configured presets ─────────────────────────────────────────────────
module.exports = {
  upload,
  UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
  uploadSingle:   upload.single("image"),
  uploadMultiple: upload.array("images", config.MAX_FILE_COUNT),
};
