const { v4: uuidv4 } = require("uuid");

// ─── ANSI colour helpers (TTY only) ──────────────────────────────────────────
const isTTY    = process.stdout.isTTY;
const c        = (code, str) => (isTTY ? `\x1b[${code}m${str}\x1b[0m` : str);
const bold     = (s) => c("1",  s);
const grey     = (s) => c("90", s);
const green    = (s) => c("32", s);
const yellow   = (s) => c("33", s);
const red      = (s) => c("31", s);
const magenta  = (s) => c("35", s);
const cyan     = (s) => c("36", s);

// ─── Colour-code HTTP status ──────────────────────────────────────────────────
const colorStatus = (status) => {
  if (status >= 500) return red(status);
  if (status >= 400) return yellow(status);
  if (status >= 300) return cyan(status);
  return green(status);
};

// ─── Colour-code HTTP method ──────────────────────────────────────────────────
const colorMethod = (method) => {
  const map = { GET: green, POST: magenta, PUT: yellow, PATCH: yellow, DELETE: red };
  return (map[method] || bold)(method.padEnd(6));
};

// ─── Logger middleware ────────────────────────────────────────────────────────
const logger = (req, res, next) => {
  const requestId = uuidv4().slice(0, 8);        // Short unique ID per request
  const startTime = Date.now();

  // Attach requestId so controllers/services can reference it in their own logs
  req.requestId = requestId;

  // Override res.end to capture final status and timing
  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    const duration   = Date.now() - startTime;
    const status     = res.statusCode;
    const timestamp  = new Date().toISOString();

    const line = [
      grey(`[${timestamp}]`),
      grey(`[${requestId}]`),
      colorMethod(req.method),
      bold(req.originalUrl),
      "→",
      colorStatus(status),
      grey(`${duration}ms`),
      req.ip ? grey(`(${req.ip})`) : "",
    ]
      .filter(Boolean)
      .join(" ");

    console.log(line);

    // Warn on slow responses (> 1 second)
    if (duration > 1000) {
      console.warn(
        yellow(`  ⚠ Slow response: ${req.method} ${req.originalUrl} took ${duration}ms`)
      );
    }

    return originalEnd(...args);
  };

  next();
};

// ─── Morgan-style combined format string (for file logging integrations) ──────
const morganFormat =
  ':remote-addr - :method :url HTTP/:http-version :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

module.exports = { logger, morganFormat };
