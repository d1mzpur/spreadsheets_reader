// import http from "node:http";
// import { readFileSync } from "node:fs";
// import { readFile } from "node:fs/promises";
// import { extname, join, normalize } from "node:path";
// import { fileURLToPath } from "node:url";

// const __dirname = fileURLToPath(new URL(".", import.meta.url));
// const publicDir = join(__dirname, "public");

// function loadEnvFile() {
//   try {
//     const env = readFileSync(join(__dirname, ".env"), "utf8");
//     for (const line of env.split(/\r?\n/)) {
//       const cleanLine = line.trim();
//       if (!cleanLine || cleanLine.startsWith("#")) continue;

//       const separatorIndex = cleanLine.indexOf("=");
//       if (separatorIndex === -1) continue;

//       const key = cleanLine.slice(0, separatorIndex).trim();
//       const rawValue = cleanLine.slice(separatorIndex + 1).trim();
//       const value = rawValue.replace(/^["']|["']$/g, "");

//       if (key && process.env[key] === undefined) {
//         process.env[key] = value;
//       }
//     }
//   } catch {
//     // .env is optional.
//   }
// }

// loadEnvFile();

// const PORT = Number(process.env.PORT || 3002);
// const SHEET_ID =
//   process.env.SHEET_ID || "1Q1MI6DL50D3eDB3GxvbygwYaBB_k7aeB_dEZgy8bi6s";
// const SHEET_GID = process.env.SHEET_GID || "329640749";

// const mimeTypes = {
//   ".html": "text/html; charset=utf-8",
//   ".css": "text/css; charset=utf-8",
//   ".js": "application/javascript; charset=utf-8",
//   ".json": "application/json; charset=utf-8",
//   ".svg": "image/svg+xml",
//   ".png": "image/png",
//   ".jpg": "image/jpeg",
//   ".jpeg": "image/jpeg"
// };

// let sheetCache = null;
// let sheetCacheAt = 0;
// const cacheMs = 60 * 1000;

// function sendJson(res, statusCode, payload) {
//   res.writeHead(statusCode, {
//     "Content-Type": "application/json; charset=utf-8",
//     "Cache-Control": "no-store"
//   });
//   res.end(JSON.stringify(payload));
// }

// function parseCsv(csv) {
//   const rows = [];
//   let row = [];
//   let value = "";
//   let inQuotes = false;

//   for (let i = 0; i < csv.length; i += 1) {
//     const char = csv[i];
//     const next = csv[i + 1];

//     if (char === '"') {
//       if (inQuotes && next === '"') {
//         value += '"';
//         i += 1;
//       } else {
//         inQuotes = !inQuotes;
//       }
//       continue;
//     }

//     if (char === "," && !inQuotes) {
//       row.push(value);
//       value = "";
//       continue;
//     }

//     if ((char === "\n" || char === "\r") && !inQuotes) {
//       if (char === "\r" && next === "\n") i += 1;
//       row.push(value);
//       rows.push(row);
//       row = [];
//       value = "";
//       continue;
//     }

//     value += char;
//   }

//   if (value.length > 0 || row.length > 0) {
//     row.push(value);
//     rows.push(row);
//   }

//   return rows.filter((items) => items.some((item) => item.trim() !== ""));
// }

// function normalizeHeaders(headers) {
//   const counts = new Map();

//   return headers.map((header, index) => {
//     const clean = header.trim() || `Kolom ${index + 1}`;
//     const count = counts.get(clean) || 0;
//     counts.set(clean, count + 1);
//     return count === 0 ? clean : `${clean} (${count + 1})`;
//   });
// }

// async function fetchSheetData() {
//   if (sheetCache && Date.now() - sheetCacheAt < cacheMs) return sheetCache;

//   const url = new URL(
//     `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export`
//   );
//   url.searchParams.set("format", "csv");
//   url.searchParams.set("gid", SHEET_GID);

//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error(`Google Sheets mengembalikan status ${response.status}`);
//   }

//   const csv = await response.text();
//   const parsedRows = parseCsv(csv);
//   const headers = normalizeHeaders(parsedRows[0] || []);
//   const rows = parsedRows.slice(1).map((items, index) => {
//     const record = {};
//     headers.forEach((header, columnIndex) => {
//       record[header] = (items[columnIndex] || "").trim();
//     });

//     return {
//       id: index + 1,
//       values: record
//     };
//   });

//   sheetCache = {
//     source: {
//       sheetId: SHEET_ID,
//       gid: SHEET_GID,
//       fetchedAt: new Date().toISOString()
//     },
//     headers,
//     rows
//   };
//   sheetCacheAt = Date.now();
//   return sheetCache;
// }

// async function serveStatic(req, res) {
//   const rawPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
//   const relativePath = rawPath === "/" ? "/index.html" : rawPath;
//   const filePath = normalize(join(publicDir, relativePath));

//   if (!filePath.startsWith(publicDir)) {
//     res.writeHead(403);
//     res.end("Forbidden");
//     return;
//   }

//   try {
//     const body = await readFile(filePath);
//     const contentType = mimeTypes[extname(filePath)] || "application/octet-stream";
//     res.writeHead(200, { "Content-Type": contentType });
//     res.end(body);
//   } catch {
//     res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
//     res.end("File tidak ditemukan");
//   }
// }

// const server = http.createServer(async (req, res) => {
//   try {
//     const url = new URL(req.url, `http://${req.headers.host}`);

//     if (url.pathname === "/api/sheet") {
//       const data = await fetchSheetData();
//       sendJson(res, 200, data);
//       return;
//     }

//     if (url.pathname === "/api/health") {
//       sendJson(res, 200, { ok: true });
//       return;
//     }

//     await serveStatic(req, res);
//   } catch (error) {
//     sendJson(res, 500, {
//       error: "Gagal memuat data",
//       detail: error.message
//     });
//   }
// });

// server.on("error", (error) => {
//   if (error.code === "EADDRINUSE") {
//     console.error(
//       `Port ${PORT} sedang dipakai. Jalankan dengan PORT lain, contoh: PORT=3003 npm run dev`
//     );
//     process.exit(1);
//   }

//   throw error;
// });

// server.listen(PORT, () => {
//   console.log(`Pembaca Excel berjalan di http://localhost:${PORT}`);
// });



import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");

const PORT = Number(process.env.PORT || 3003);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(payload));
}

function sanitizeFilename(value) {
  return String(value || "file")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "file";
}

function getDriveFileId(fileUrl) {
  try {
    const parsed = new URL(fileUrl);

    if (parsed.hostname.includes("drive.google.com")) {
      return (
        parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
        parsed.searchParams.get("id")
      );
    }
  } catch {
    return null;
  }

  return null;
}

function toDriveDownloadUrl(fileId, confirmToken = "") {
  const url = new URL("https://drive.google.com/uc");

  url.searchParams.set("export", "download");
  url.searchParams.set("id", fileId);

  if (confirmToken) {
    url.searchParams.set("confirm", confirmToken);
  }

  return url.toString();
}

function getCookieHeader(response) {
  const setCookie = response.headers.get("set-cookie");

  if (!setCookie) return "";

  return setCookie
    .split(/,(?=[^;,]+=)/)
    .map((cookie) => cookie.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function getDriveConfirmToken(html) {
  const directToken =
    html.match(/[?&]confirm=([0-9A-Za-z_-]+)/)?.[1] ||
    html.match(/confirm=([0-9A-Za-z_-]+)&amp;/)?.[1] ||
    html.match(/name="confirm"\s+value="([^"]+)"/)?.[1];

  if (directToken) return directToken;

  return /download_warning|quota exceeded|virus scan warning/i.test(html)
    ? "t"
    : "";
}

async function fetchDriveFile(fileUrl) {
  const fileId = getDriveFileId(fileUrl);

  if (!fileId) return fetch(fileUrl);

  const firstResponse = await fetch(toDriveDownloadUrl(fileId));
  const contentType = firstResponse.headers.get("content-type") || "";
  const contentDisposition = firstResponse.headers.get("content-disposition");

  if (
    contentDisposition ||
    !contentType.toLowerCase().includes("text/html")
  ) {
    return firstResponse;
  }

  const html = await firstResponse.text();
  const confirmToken = getDriveConfirmToken(html);

  if (!confirmToken) {
    throw new Error(
      "Google Drive tidak mengirim file. Pastikan file bisa diakses publik atau dibagikan ke 'Anyone with the link'."
    );
  }

  const cookie = getCookieHeader(firstResponse);

  return fetch(toDriveDownloadUrl(fileId, confirmToken), {
    headers: cookie ? { Cookie: cookie } : undefined
  });
}

function extensionFromContentType(contentType) {
  const cleanType = contentType.split(";")[0].trim().toLowerCase();
  const extensions = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/zip": ".zip",
    "text/plain": ".txt"
  };

  return extensions[cleanType] || "";
}

function hasFileExtension(filename) {
  return /\.[a-z0-9]{2,5}$/i.test(filename);
}

function normalizeZipPathPart(value) {
  return sanitizeFilename(value)
    .replace(/[. ]+$/g, "")
    .slice(0, 80) || "file";
}

function getFileExtension(contentType) {
  const extension = extensionFromContentType(contentType);

  return extension || ".bin";
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return {
    dosDate,
    dosTime
  };
}

function createZip(entries) {
  const files = [];
  const centralDirectory = [];
  let offset = 0;
  const { dosDate, dosTime } = getDosDateTime();

  entries.forEach((entry) => {
    const name = Buffer.from(entry.path, "utf8");
    const data = entry.data;
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    files.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralDirectory.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  });

  const centralDirectorySize = centralDirectory.reduce(
    (total, item) => total + item.length,
    0
  );
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...files, ...centralDirectory, end]);
}

async function downloadFileBuffer(file) {
  const response = await fetchDriveFile(file.url);

  if (!response.ok || !response.body) {
    throw new Error(`${file.label} mengembalikan status ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  if (contentType.toLowerCase().includes("text/html")) {
    throw new Error(`${file.label} mengembalikan halaman web, bukan file`);
  }

  return {
    data: Buffer.from(await response.arrayBuffer()),
    extension: getFileExtension(contentType)
  };
}

async function proxySelectedDownload(req, res) {
  const body = await readJsonBody(req);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const entries = [];
  const usedPaths = new Set();

  if (rows.length === 0) {
    sendJson(res, 400, {
      error: "Pilih minimal satu row"
    });
    return;
  }

  for (const row of rows) {
    const baseName = normalizeZipPathPart(
      row.baseName || row.name || `Row ${row.id}`
    );
    const files = Array.isArray(row.files) ? row.files : [];

    for (const file of files) {
      if (!file?.url) continue;

      const parsed = new URL(file.url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error(`URL ${file.label || "file"} tidak valid`);
      }

      const downloaded = await downloadFileBuffer({
        label: file.label || "File",
        url: file.url
      });
      const categoryName = normalizeZipPathPart(file.label || "File");
      const suffix = file.order > 1 ? ` ${file.order}` : "";
      const fileName = `${baseName}${suffix}`;
      let path = `${categoryName}/${fileName}${downloaded.extension}`;
      let copy = 2;

      while (usedPaths.has(path)) {
        path = `${categoryName}/${fileName} (${copy})${downloaded.extension}`;
        copy += 1;
      }

      usedPaths.add(path);
      entries.push({
        path,
        data: downloaded.data
      });
    }
  }

  if (entries.length === 0) {
    sendJson(res, 400, {
      error: "Tidak ada link yang bisa didownload"
    });
    return;
  }

  const zip = createZip(entries);
  const filename = "dokumen-selected.zip";
  const encodedFilename = encodeURIComponent(filename);

  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
    "Content-Length": zip.length,
    "Cache-Control": "no-store"
  });

  res.end(zip);
}

async function proxyDownload(reqUrl, res) {
  const fileUrl = reqUrl.searchParams.get("url");
  const requestedFilename = sanitizeFilename(
    reqUrl.searchParams.get("filename")
  );

  if (!fileUrl) {
    sendJson(res, 400, {
      error: "URL file wajib diisi"
    });
    return;
  }

  const parsed = new URL(fileUrl);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    sendJson(res, 400, {
      error: "URL file tidak valid"
    });
    return;
  }

  const response = await fetchDriveFile(fileUrl);

  if (!response.ok || !response.body) {
    throw new Error(`File mengembalikan status ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  if (contentType.toLowerCase().includes("text/html")) {
    throw new Error(
      "Google Drive mengembalikan halaman web, bukan file. Cek permission file atau coba buka link Drive langsung."
    );
  }

  const extension =
    hasFileExtension(requestedFilename) ? "" : extensionFromContentType(contentType);
  const filename = `${requestedFilename}${extension}`;
  const encodedFilename = encodeURIComponent(filename);

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="download${extension}"; filename*=UTF-8''${encodedFilename}`,
    "Cache-Control": "no-store"
  });

  Readable.fromWeb(response.body).pipe(res);
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;

      row.push(value);
      rows.push(row);

      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((items) =>
    items.some((item) => item.trim() !== "")
  );
}

function normalizeHeaders(headers) {
  const counts = new Map();

  return headers.map((header, index) => {
    const clean = header.trim() || `Kolom ${index + 1}`;

    const count = counts.get(clean) || 0;

    counts.set(clean, count + 1);

    return count === 0 ? clean : `${clean} (${count + 1})`;
  });
}

function extractSheetInfo(sheetUrl) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);

  if (!match) {
    throw new Error("Spreadsheet ID tidak ditemukan");
  }

  const sheetId = match[1];

  let gid = "0";

  try {
    const url = new URL(sheetUrl);

    gid =
      url.searchParams.get("gid") ||
      url.hash.replace("#gid=", "") ||
      "0";
  } catch {}

  return {
    sheetId,
    gid
  };
}

async function fetchSheetData(sheetUrl) {
  const { sheetId, gid } = extractSheetInfo(sheetUrl);

  const exportUrl = new URL(
    `https://docs.google.com/spreadsheets/d/${sheetId}/export`
  );

  exportUrl.searchParams.set("format", "csv");
  exportUrl.searchParams.set("gid", gid);

  const response = await fetch(exportUrl);

  if (!response.ok) {
    throw new Error(
      `Google Sheets mengembalikan status ${response.status}`
    );
  }

  const csv = await response.text();

  const parsedRows = parseCsv(csv);

  const headers = normalizeHeaders(parsedRows[0] || []);

  const rows = parsedRows.slice(1).map((items, index) => {
    const record = {};

    headers.forEach((header, columnIndex) => {
      record[header] = (items[columnIndex] || "").trim();
    });

    return {
      id: index + 1,
      values: record
    };
  });

  return {
    source: {
      sheetId,
      gid,
      fetchedAt: new Date().toISOString()
    },
    headers,
    rows
  };
}

async function serveStatic(req, res) {
  const rawPath = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname
  );

  const relativePath =
    rawPath === "/" ? "/index.html" : rawPath;

  const filePath = normalize(join(publicDir, relativePath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);

    const contentType =
      mimeTypes[extname(filePath)] ||
      "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType
    });

    res.end(body);
  } catch {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("File tidak ditemukan");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    if (url.pathname === "/api/sheet") {
      const sheetUrl = url.searchParams.get("url");

      if (!sheetUrl) {
        sendJson(res, 400, {
          error: "URL spreadsheet wajib diisi"
        });
        return;
      }

      const data = await fetchSheetData(sheetUrl);

      sendJson(res, 200, data);
      return;
    }

    if (url.pathname === "/api/download") {
      await proxyDownload(url, res);
      return;
    }

    if (url.pathname === "/api/download-selected") {
      if (req.method !== "POST") {
        sendJson(res, 405, {
          error: "Method tidak didukung"
        });
        return;
      }

      await proxySelectedDownload(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, {
      error: "Gagal memuat data",
      detail: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `Server berjalan di http://localhost:${PORT}`
  );
});
