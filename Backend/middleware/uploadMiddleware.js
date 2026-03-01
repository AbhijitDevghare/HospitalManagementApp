const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// ─── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE      = 5 * 1024 * 1024;          // 5 MB per file
const MAX_FILES          = 10;                         // Max images per upload
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const UPLOAD_DIR         = path.join(__dirname, "..", "uploads", "rooms");

// ─── Ensure upload directory exists ──────────────────────────────────────────
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Disk storage configuration ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/\s+/g, "-")      // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-]/g, "") // Strip non-alphanumeric characters
      .toLowerCase();
    const unique   = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${baseName}-${unique}${ext}`);
  },
});

// ─── File type filter ─────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."), {
        statusCode: 415,
      }),
      false
    );
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files:    MAX_FILES,
  },
});

// ─── Middleware: single room image ────────────────────────────────────────────
const uploadSingleRoomImage = upload.single("image");

// ─── Middleware: multiple room images ─────────────────────────────────────────
const uploadMultipleRoomImages = upload.array("images", MAX_FILES);

// ─── Multer error handler wrapper ─────────────────────────────────────────────
const handleUploadError = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE:  `File too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
        LIMIT_FILE_COUNT: `Too many files. Maximum allowed is ${MAX_FILES} images.`,
        LIMIT_UNEXPECTED_FILE: "Unexpected field name in file upload.",
      };
      return res.status(400).json({
        success: false,
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    // Custom fileFilter error or other errors
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  });
};

// ─── Exported ready-to-use middleware ─────────────────────────────────────────
const uploadSingle   = handleUploadError(uploadSingleRoomImage);
const uploadMultiple = handleUploadError(uploadMultipleRoomImages);

module.exports = {
  uploadSingle,
  uploadMultiple,
  UPLOAD_DIR,
};
