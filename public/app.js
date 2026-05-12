// const tableHead = document.querySelector("#tableHead");
// const tableBody = document.querySelector("#tableBody");
// const detailTitle = document.querySelector("#detailTitle");
// const detailContent = document.querySelector("#detailContent");
// const statusBar = document.querySelector("#statusBar");
// const searchInput = document.querySelector("#searchInput");
// const refreshButton = document.querySelector("#refreshButton");

// let sheetData = { headers: [], rows: [] };
// let selectedId = null;

// function escapeHtml(value) {
//   return String(value)
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#039;");
// }

// function extractUrls(value) {
//   const matches = String(value || "").match(/https?:\/\/[^\s,;]+/g) || [];
//   return matches.map((url) => url.replace(/[)\].]+$/, ""));
// }

// function toDownloadUrl(url) {
//   try {
//     const parsed = new URL(url);
//     if (parsed.hostname.includes("drive.google.com")) {
//       const fileId =
//         parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
//         parsed.searchParams.get("id");

//       if (fileId) {
//         return `https://drive.google.com/uc?export=download&id=${fileId}`;
//       }
//     }
//   } catch {
//     return url;
//   }

//   return url;
// }

// function valueToHtml(value) {
//   const urls = extractUrls(value);
//   if (urls.length === 0) return escapeHtml(value || "-");

//   const textWithoutUrls = urls.reduce(
//     (text, url) => text.replace(url, "").trim(),
//     String(value)
//   );

//   const links = urls
//     .map((url, index) => {
//       const safeUrl = escapeHtml(url);
//       const downloadUrl = escapeHtml(toDownloadUrl(url));
//       return `
//         <a class="link-chip" href="${safeUrl}" target="_blank" rel="noreferrer">Buka ${index + 1}</a>
//         <a class="link-chip" href="${downloadUrl}" target="_blank" rel="noreferrer" download>Download ${index + 1}</a>
//       `;
//     })
//     .join("");

//   return `
//     ${textWithoutUrls ? `<div>${escapeHtml(textWithoutUrls)}</div>` : ""}
//     <div class="link-list">${links}</div>
//   `;
// }

// function getPrimaryTitle(row) {
//   const values = row.values;
//   return (
//     values.NAMA ||
//     values["NAMA YANG TERCANTUM DI IJAZAH SLTA SEDERAJAT"] ||
//     `Row ${row.id}`
//   );
// }

// function rowMatches(row, query) {
//   if (!query) return true;
//   return Object.values(row.values).join(" ").toLowerCase().includes(query);
// }

// function renderTable() {
//   const query = searchInput.value.trim().toLowerCase();
//   const visibleRows = sheetData.rows.filter((row) => rowMatches(row, query));

//   tableHead.innerHTML = `
//     <tr>
//       <th>No</th>
//       ${sheetData.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
//     </tr>
//   `;

//   tableBody.innerHTML = visibleRows
//     .map((row) => {
//       const cells = sheetData.headers
//         .map((header) => `<td title="${escapeHtml(row.values[header] || "")}">${escapeHtml(row.values[header] || "")}</td>`)
//         .join("");

//       return `
//         <tr data-row-id="${row.id}" class="${row.id === selectedId ? "active" : ""}">
//           <td>${row.id}</td>
//           ${cells}
//         </tr>
//       `;
//     })
//     .join("");

//   if (visibleRows.length === 0) {
//     tableBody.innerHTML = `
//       <tr>
//         <td colspan="${sheetData.headers.length + 1}">Data tidak ditemukan</td>
//       </tr>
//     `;
//   }

//   statusBar.textContent = `${visibleRows.length} dari ${sheetData.rows.length} row ditampilkan.`;
// }

// function renderDetail(row) {
//   selectedId = row.id;
//   detailTitle.textContent = getPrimaryTitle(row);
//   detailContent.innerHTML = sheetData.headers
//     .map((header) => {
//       const value = row.values[header] || "";
//       return `
//         <div class="field">
//           <div class="field-name">${escapeHtml(header)}</div>
//           <div class="field-value">${valueToHtml(value)}</div>
//         </div>
//       `;
//     })
//     .join("");

//   renderTable();
// }

// async function loadSheet() {
//   statusBar.classList.remove("error");
//   statusBar.textContent = "Memuat data spreadsheet...";
//   refreshButton.disabled = true;

//   try {
//     const response = await fetch("/api/sheet");
//     const payload = await response.json();

//     if (!response.ok) {
//       throw new Error(payload.detail || payload.error || "Gagal memuat data");
//     }

//     sheetData = payload;
//     selectedId = null;
//     renderTable();
//     detailTitle.textContent = "Pilih salah satu row";
//     detailContent.innerHTML =
//       '<p class="empty-state">Klik baris pada tabel untuk melihat seluruh data mahasiswa.</p>';
//   } catch (error) {
//     statusBar.classList.add("error");
//     statusBar.textContent = error.message;
//     tableHead.innerHTML = "";
//     tableBody.innerHTML = "";
//   } finally {
//     refreshButton.disabled = false;
//   }
// }

// tableBody.addEventListener("click", (event) => {
//   const rowElement = event.target.closest("tr[data-row-id]");
//   if (!rowElement) return;

//   const rowId = Number(rowElement.dataset.rowId);
//   const row = sheetData.rows.find((item) => item.id === rowId);
//   if (row) renderDetail(row);
// });

// searchInput.addEventListener("input", renderTable);
// refreshButton.addEventListener("click", loadSheet);

// loadSheet();


const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const statusBar = document.getElementById("statusBar");

async function loadSheet() {
  try {
    const params = new URLSearchParams(
      window.location.search
    );

    const sheetUrl = params.get("url");

    if (!sheetUrl) {
      statusBar.textContent =
        "Tambahkan parameter ?url=LINK_GOOGLE_SHEET";
      return;
    }

    statusBar.textContent = "Memuat spreadsheet...";

    const response = await fetch(
      `/api/sheet?url=${encodeURIComponent(sheetUrl)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gagal memuat");
    }

    renderTable(data);

    statusBar.textContent =
      "Spreadsheet berhasil dimuat";
  } catch (error) {
    statusBar.textContent = error.message;
  }
}

function renderTable(data) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const trHead = document.createElement("tr");

  data.headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    trHead.appendChild(th);
  });

  tableHead.appendChild(trHead);

  data.rows.forEach((row) => {
    const tr = document.createElement("tr");

    data.headers.forEach((header) => {
      const td = document.createElement("td");
      td.textContent = row.values[header] || "";
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

loadSheet();