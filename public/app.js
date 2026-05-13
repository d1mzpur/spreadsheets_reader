const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const detailTitle = document.getElementById("detailTitle");
const detailContent = document.getElementById("detailContent");
const workspace = document.getElementById("workspace");
const statusBar = document.getElementById("statusBar");
const searchInput = document.getElementById("searchInput");
const clearSearchButton = document.getElementById("clearSearchButton");
const sheetUrlInput = document.getElementById("sheetUrlInput");
const sheetForm = document.getElementById("sheetForm");
const refreshButton = document.getElementById("refreshButton");
const linkPreviewPanel = document.getElementById("linkPreviewPanel");
const linkPreviewTitle = document.getElementById("linkPreviewTitle");
const linkPreviewFrame = document.getElementById("linkPreviewFrame");
const closePreviewButton = document.getElementById("closePreviewButton");

let sheetData = {
  headers: [],
  rows: []
};
let selectedId = null;
const hiddenDetailHeaders = new Set([
  "scan ktp",
  "scan ijazah sma/sederajat",
  "pas foto",
  "lembar biodata wisudawan"
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractUrls(value) {
  const matches = String(value || "").match(/https?:\/\/[^\s,;]+/g) || [];
  return matches.map((url) => url.replace(/[)\].]+$/, ""));
}

function toPreviewUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("drive.google.com")) {
      const fileId =
        parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
        parsed.searchParams.get("id");

      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
  } catch {
    return url;
  }

  return url;
}

function valueToHtml(value) {
  const urls = extractUrls(value);
  if (urls.length === 0) return escapeHtml(value || "-");

  const textWithoutUrls = urls.reduce(
    (text, url) => text.replace(url, "").trim(),
    String(value)
  );

  return textWithoutUrls ? escapeHtml(textWithoutUrls) : "-";
}

function getRowLinks(row) {
  const links = [];
  const seen = new Set();

  sheetData.headers.forEach((header) => {
    extractUrls(row.values[header]).forEach((url) => {
      if (seen.has(url)) return;

      seen.add(url);
      links.push({
        header,
        url
      });
    });
  });

  return links;
}

function renderRowLinks(row) {
  const links = getRowLinks(row);
  if (links.length === 0) return "";
  const openButtons = links
    .map((link, index) => {
      const label = link.header || `Link ${index + 1}`;

      return `
        <button class="link-chip" type="button" data-open-url="${escapeHtml(link.url)}">
          Buka ${escapeHtml(label)}
        </button>
      `;
    })
    .join("");

  const downloadLinks = links
    .map((link, index) => {
      const label = link.header || `Link ${index + 1}`;
      const filename = getDownloadFilename(row, link, index);

      return `
        <a
          class="link-chip"
          href="${escapeHtml(toDownloadProxyUrl(link.url, filename))}"
          data-download-link
          download
        >
          Download ${escapeHtml(label)}
        </a>
      `;
    })
    .join("");

  return `
    <section class="link-summary">
      <div class="link-summary-head">
        <div>
          <p class="eyebrow">Link Row</p>
          <h3>${links.length} link ditemukan</h3>
        </div>
        <button class="link-chip" type="button" data-download-all>Download Semua</button>
      </div>
      <div class="link-action-grid">
        <div class="link-action-panel">
          <div class="link-action-title">Buka Preview</div>
          <div class="link-list">${openButtons}</div>
        </div>
        <div class="link-action-panel">
          <div class="link-action-title">Download File</div>
          <div class="link-list">${downloadLinks}</div>
        </div>
      </div>
    </section>
  `;
}

function getPrimaryTitle(row) {
  const values = row.values;

  return (
    values.NAMA ||
    values.Nama ||
    values["NAMA YANG TERCANTUM DI IJAZAH SLTA SEDERAJAT"] ||
    `Row ${row.id}`
  );
}

function toFilename(value) {
  return String(value || "file")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function getDownloadFilename(row, link, index) {
  const rowName = getPrimaryTitle(row);
  const linkName = link.header || `Link ${index + 1}`;

  return toFilename(`${rowName} - ${linkName}`);
}

function toDownloadProxyUrl(url, filename) {
  const params = new URLSearchParams({
    url,
    filename
  });

  return `/api/download?${params.toString()}`;
}

function renderImportantName(row) {
  const header = "NAMA YANG TERCANTUM DI IJAZAH SLTA SEDERAJAT";
  const value = row.values[header] || "";

  if (!value) return "";

  return `
    <section class="important-name-box">
      <p class="eyebrow">Harus Diperhatikan</p>
      <h3>${escapeHtml(header)}</h3>
      <div>${escapeHtml(value)}</div>
    </section>
  `;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function shouldShowDetailField(header) {
  return !hiddenDetailHeaders.has(normalizeSearchText(header));
}

function rowMatches(row, query) {
  if (!query) return true;

  const searchableText = [
    row.id,
    ...Object.keys(row.values),
    ...Object.values(row.values)
  ].join(" ");

  return normalizeSearchText(searchableText).includes(query);
}

function applySearch() {
  renderTable();
}

function clearSearch() {
  searchInput.value = "";
  searchInput.focus();
  applySearch();
}

function renderTable() {
  const query = normalizeSearchText(searchInput.value);
  const visibleRows = sheetData.rows.filter((row) => rowMatches(row, query));

  tableHead.innerHTML = `
    <tr>
      <th>No</th>
      ${sheetData.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
    </tr>
  `;

  tableBody.innerHTML = visibleRows
    .map((row) => {
      const cells = sheetData.headers
        .map((header) => {
          const value = row.values[header] || "";
          return `<td title="${escapeHtml(value)}">${escapeHtml(value)}</td>`;
        })
        .join("");

      return `
        <tr data-row-id="${row.id}" class="${row.id === selectedId ? "active" : ""}" tabindex="0">
          <td>${row.id}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  if (visibleRows.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${sheetData.headers.length + 1}">Data tidak ditemukan</td>
      </tr>
    `;
  }

  statusBar.classList.remove("error");
  statusBar.textContent = `${visibleRows.length} dari ${sheetData.rows.length} row ditampilkan.`;
}

function renderDetail(row) {
  selectedId = row.id;
  closePreview();
  detailTitle.textContent = getPrimaryTitle(row);
  detailContent.innerHTML = `
    ${renderImportantName(row)}
    ${renderRowLinks(row)}
    ${sheetData.headers
      .filter(shouldShowDetailField)
      .map((header) => {
        const value = row.values[header] || "";

        return `
          <div class="field">
            <div class="field-name">${escapeHtml(header)}</div>
            <div class="field-value">${valueToHtml(value)}</div>
          </div>
        `;
      })
      .join("")}
  `;

  renderTable();
}

function resetDetail() {
  selectedId = null;
  detailTitle.textContent = "Pilih salah satu row";
  detailContent.innerHTML =
    '<p class="empty-state">Klik baris pada tabel untuk melihat seluruh data mahasiswa.</p>';
  closePreview();
}

function setSheetUrlParam(sheetUrl) {
  const url = new URL(window.location.href);
  url.searchParams.set("url", sheetUrl);
  window.history.replaceState({}, "", url);
}

async function loadSheet() {
  const sheetUrl = sheetUrlInput.value.trim();

  if (!sheetUrl) {
    statusBar.classList.add("error");
    statusBar.textContent = "Masukkan URL Google Sheet terlebih dahulu.";
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";
    resetDetail();
    return;
  }

  statusBar.classList.remove("error");
  statusBar.textContent = "Memuat spreadsheet...";
  refreshButton.disabled = true;

  try {
    const response = await fetch(`/api/sheet?url=${encodeURIComponent(sheetUrl)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || "Gagal memuat spreadsheet");
    }

    sheetData = data;
    searchInput.value = "";
    setSheetUrlParam(sheetUrl);
    resetDetail();
    renderTable();
  } catch (error) {
    sheetData = {
      headers: [],
      rows: []
    };
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";
    resetDetail();
    statusBar.classList.add("error");
    statusBar.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
}

function selectRow(rowElement) {
  const rowId = Number(rowElement.dataset.rowId);
  const row = sheetData.rows.find((item) => item.id === rowId);

  if (row) renderDetail(row);
}

function openPreview(url, label) {
  linkPreviewTitle.textContent = label || "Preview Link";
  linkPreviewFrame.src = toPreviewUrl(url);
  linkPreviewPanel.hidden = false;
  workspace.classList.add("preview-open");
}

function closePreview() {
  linkPreviewPanel.hidden = true;
  linkPreviewFrame.src = "about:blank";
  workspace.classList.remove("preview-open");
}

tableBody.addEventListener("click", (event) => {
  const rowElement = event.target.closest("tr[data-row-id]");
  if (!rowElement) return;
  selectRow(rowElement);
});

detailContent.addEventListener("click", (event) => {
  const downloadAllButton = event.target.closest("[data-download-all]");
  if (downloadAllButton) {
    event.preventDefault();
    detailContent.querySelectorAll("[data-download-link]").forEach((link, index) => {
      window.setTimeout(() => link.click(), index * 250);
    });
    return;
  }

  const openButton = event.target.closest("[data-open-url]");
  if (!openButton) return;

  openPreview(openButton.dataset.openUrl, openButton.textContent.trim());
});

tableBody.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const rowElement = event.target.closest("tr[data-row-id]");
  if (!rowElement) return;

  event.preventDefault();
  selectRow(rowElement);
});

searchInput.addEventListener("input", applySearch);
searchInput.addEventListener("search", applySearch);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.preventDefault();
});
clearSearchButton.addEventListener("click", clearSearch);
sheetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadSheet();
});

closePreviewButton.addEventListener("click", closePreview);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !linkPreviewPanel.hidden) closePreview();
});

const params = new URLSearchParams(window.location.search);
sheetUrlInput.value = params.get("url") || "";
loadSheet();
