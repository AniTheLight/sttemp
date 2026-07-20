const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = process.cwd();
const WRITTEN_GLAZE_ROOT = path.join(ROOT, "images", "written_glaze");
const PEOPLE_ROOTS = {
  boys: path.join(WRITTEN_GLAZE_ROOT, "boys"),
  girlies: path.join(WRITTEN_GLAZE_ROOT, "girlies")
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

const MAX_JSON_BODY_BYTES = 8 * 1024 * 1024;

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, { "Content-Type": MIME_TYPES[".json"] });
  res.end(body);
}

function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function sanitizePersonName(person) {
  return String(person || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveGroup(groupValue) {
  const key = String(groupValue || "").trim().toLowerCase();
  if (key === "boys" || key === "girlies") return key;
  return null;
}

function getPersonPathIfExists(groupKey, person) {
  const root = PEOPLE_ROOTS[groupKey];
  if (!root) return null;
  const candidate = path.join(root, person);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    return candidate;
  }
  return null;
}

function resolvePersonSubmissionPath(person) {
  const boyPath = getPersonPathIfExists("boys", person);
  const girlyPath = getPersonPathIfExists("girlies", person);

  if (boyPath && girlyPath) {
    return {
      error: `Name '${person}' exists in both boys and girlies. Use a unique person folder name.`
    };
  }

  if (boyPath) return { group: "boys", personPath: boyPath };
  if (girlyPath) return { group: "girlies", personPath: girlyPath };

  // Backward-compatible fallback for unknown names.
  return {
    group: "girlies",
    personPath: path.join(PEOPLE_ROOTS.girlies, person)
  };
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getNextSubmissionIndex(personPath) {
  if (!fs.existsSync(personPath)) return 1;

  const entries = fs.readdirSync(personPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(png|svg)$/i.test(name));

  const maxIndex = entries.reduce((acc, name) => {
    const value = parseNumericPrefix(name);
    if (!Number.isFinite(value)) return acc;
    return Math.max(acc, value);
  }, 0);

  return maxIndex + 1;
}

function decodeImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/png|image\/svg\+xml);base64,([a-zA-Z0-9+/=\r\n]+)$/);
  if (!match) {
    return null;
  }

  const mime = match[1].toLowerCase();
  const base64 = match[2].replace(/\s+/g, "");
  const ext = mime === "image/png" ? "png" : "svg";

  return {
    ext,
    bytes: Buffer.from(base64, "base64")
  };
}

function appendMessage(personPath, message, from) {
  const trimmed = String(message || "").trim();
  if (!trimmed) return;
  const sender = String(from || "").trim();

  const filePath = path.join(personPath, "messages.json");
  let list = [];

  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && Array.isArray(parsed.messages)) {
        list = parsed.messages;
      }
    } catch (error) {
      list = [];
    }
  }

  list.push({ text: trimmed, from: sender || "Anonymous" });
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || "application/octet-stream";
  const stream = fs.createReadStream(filePath);

  stream.on("error", () => {
    sendJson(res, 500, { error: "Failed to read file." });
  });

  res.writeHead(200, { "Content-Type": type });
  stream.pipe(res);
}

function parseNumericPrefix(fileName) {
  const base = path.parse(fileName).name;
  const match = base.match(/^\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function compareSubmissionFiles(a, b) {
  const numA = parseNumericPrefix(a);
  const numB = parseNumericPrefix(b);

  if (numA !== numB) return numA - numB;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function readPngDimensions(filePath) {
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(24);
  try {
    fs.readSync(fd, buffer, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }

  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readSvgDimensions(filePath) {
  const svg = fs.readFileSync(filePath, "utf8");
  const widthMatch = svg.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i);
  const heightMatch = svg.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i);

  if (widthMatch && heightMatch) {
    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }

  const viewBoxMatch = svg.match(/\bviewBox\s*=\s*["']\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    const width = Number(viewBoxMatch[3]);
    const height = Number(viewBoxMatch[4]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }

  return null;
}

function getAspectRatio(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  let dimensions = null;
  if (ext === ".png") {
    dimensions = readPngDimensions(filePath);
  } else if (ext === ".svg") {
    dimensions = readSvgDimensions(filePath);
  }

  if (!dimensions) return "1 / 1";
  return `${dimensions.width} / ${dimensions.height}`;
}

function getPersonMessages(personPath) {
  const jsonPath = path.join(personPath, "messages.json");
  if (fs.existsSync(jsonPath) && fs.statSync(jsonPath).isFile()) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => {
            if (typeof value === "string") {
              return { text: value, from: "" };
            }

            if (value && typeof value === "object") {
              const text = String(value.text || value.message || "").trim();
              if (!text) return null;
              return {
                text,
                from: String(value.from || "").trim()
              };
            }

            return null;
          })
          .filter(Boolean);
      }
      if (parsed && Array.isArray(parsed.messages)) {
        return parsed.messages
          .map((value) => {
            if (typeof value === "string") {
              return { text: value, from: "" };
            }

            if (value && typeof value === "object") {
              const text = String(value.text || value.message || "").trim();
              if (!text) return null;
              return {
                text,
                from: String(value.from || "").trim()
              };
            }

            return null;
          })
          .filter(Boolean);
      }
    } catch (error) {
      return [];
    }
  }

  const txtPath = path.join(personPath, "messages.txt");
  if (fs.existsSync(txtPath) && fs.statSync(txtPath).isFile()) {
    const content = fs.readFileSync(txtPath, "utf8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, from: "" }));
  }

  return [];
}

function getSubmissionPeople(groupKey) {
  const groupRoot = PEOPLE_ROOTS[groupKey];
  if (!groupRoot || !fs.existsSync(groupRoot)) {
    return [];
  }

  const personDirs = fs.readdirSync(groupRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return personDirs.map((person) => {
    const personPath = path.join(groupRoot, person);
    const files = fs.readdirSync(personPath, { withFileTypes: true })
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name)
      .filter((name) => /\.(png|svg)$/i.test(name))
      .sort(compareSubmissionFiles);

    const assets = files.map((fileName) => {
      const absolutePath = path.join(personPath, fileName);
      const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join("/");
      return {
        backgroundSrc: `/${relativePath}`,
        aspectRatio: getAspectRatio(absolutePath)
      };
    });

    return {
      person,
      group: groupKey,
      assets,
      messages: getPersonMessages(personPath)
    };
  });
}

function resolveStaticPath(urlPath) {
  const normalized = path.normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, "");
  const absolutePath = path.resolve(ROOT, normalized);

  if (!absolutePath.startsWith(ROOT + path.sep) && absolutePath !== ROOT) {
    return null;
  }

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    return absolutePath;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (reqUrl.pathname === "/api/glaze-submit" && req.method === "POST") {
    readRequestBody(req, MAX_JSON_BODY_BYTES)
      .then((rawBody) => {
        let parsed;
        try {
          parsed = JSON.parse(rawBody || "{}");
        } catch (error) {
          sendJson(res, 400, { error: "Invalid JSON body." });
          return;
        }

        const person = sanitizePersonName(parsed.person);
        if (!person) {
          sendJson(res, 400, { error: "A valid person name is required." });
          return;
        }

        const pathResolution = resolvePersonSubmissionPath(person);
        if (pathResolution.error) {
          sendJson(res, 409, { error: pathResolution.error });
          return;
        }

        const { group, personPath } = pathResolution;
        ensureDirectory(personPath);

        const created = { person, group, messageSaved: false, imageSaved: null };
        const from = String(parsed.from || "").trim();

        const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
        if (message) {
          appendMessage(personPath, message, from);
          created.messageSaved = true;
        }

        const hasImage = typeof parsed.imageDataUrl === "string" && parsed.imageDataUrl.trim().length > 0;
        if (hasImage) {
          const decoded = decodeImageDataUrl(parsed.imageDataUrl);
          if (!decoded) {
            sendJson(res, 400, { error: "Only PNG or SVG images are supported." });
            return;
          }

          const nextIndex = getNextSubmissionIndex(personPath);
          const filename = `${nextIndex}.${decoded.ext}`;
          const filePath = path.join(personPath, filename);
          fs.writeFileSync(filePath, decoded.bytes);

          const relativePath = path.relative(ROOT, filePath).split(path.sep).join("/");
          created.imageSaved = `/${relativePath}`;
        }

        if (!created.messageSaved && !created.imageSaved) {
          sendJson(res, 400, { error: "Submit a message, an image, or both." });
          return;
        }

        sendJson(res, 201, {
          ok: true,
          created
        });
      })
      .catch((error) => {
        sendJson(res, 500, {
          error: "Failed to process submission.",
          detail: error.message
        });
      });
    return;
  }

  if (reqUrl.pathname === "/api/glaze-submissions") {
    try {
      const requestedGroup = resolveGroup(reqUrl.searchParams.get("group")) || "boys";
      const people = getSubmissionPeople(requestedGroup);
      return sendJson(res, 200, {
        generatedAt: new Date().toISOString(),
        group: requestedGroup,
        people
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to scan submissions folder.",
        detail: error.message
      });
    }
  }

  let requestPath = reqUrl.pathname;
  if (requestPath === "/") requestPath = "/index.html";

  const resolved = resolveStaticPath(requestPath);
  if (!resolved) {
    return sendJson(res, 404, { error: "Not found." });
  }

  return sendFile(res, resolved);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
