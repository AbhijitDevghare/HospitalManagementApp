const path = require("path");
const fs   = require("fs");
const config = require("../config/env");

// ─── 1. Generate a safe, unique filename ──────────────────────────────────────
const generateFileName = (originalName) => {
  const ext  = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return `${base}-${unique}${ext}`;
};

// ─── 2. Build the public URL path for an uploaded file ────────────────────────
const getFileUrl = (filename) => `/${config.UPLOAD_PATH}/${filename}`;

// ─── 3. Resolve the absolute filesystem path for an uploaded file ─────────────
const getAbsoluteFilePath = (filename) =>
  path.resolve(process.cwd(), config.UPLOAD_PATH, filename);

// ─── 4. Safely delete a file (no-throw) ──────────────────────────────────────
const deleteFile = (filePath) => {
  try {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      return { deleted: true, path: resolved };
    }
    return { deleted: false, reason: "File not found." };
  } catch (err) {
    return { deleted: false, reason: err.message };
  }
};

// ─── 5. Delete multiple files safely ─────────────────────────────────────────
const deleteFiles = (filePaths = []) => filePaths.map(deleteFile);

// ─── 6. Extract filename from a URL path ─────────────────────────────────────
const extractFilename = (urlPath) => path.basename(urlPath);

// ─── 7. Check if a file extension is an allowed image type ───────────────────
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const isAllowedImageType  = (filename) =>
  ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase());

// ─── 8. Ensure a directory exists (creates recursively if needed) ─────────────
const ensureDir = (dirPath) => {
  const resolved = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
  return resolved;
};

// ─── 9. Get file size in human-readable form ──────────────────────────────────
const formatFileSize = (bytes) => {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── 10. Map multer file objects to storable image records ────────────────────
const mapUploadedFiles = (files = []) =>
  files.map((file) => ({
    url:      getFileUrl(file.filename),
    altText:  file.originalname,
    size:     file.size,
    mimeType: file.mimetype,
  }));

module.exports = {
  generateFileName,
  getFileUrl,
  getAbsoluteFilePath,
  deleteFile,
  deleteFiles,
  extractFilename,
  isAllowedImageType,
  ensureDir,
  formatFileSize,
  mapUploadedFiles,
};
