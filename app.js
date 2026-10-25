/**
 * Simba 生活日記 — 輕量互動：用 localStorage 新增日記／外出紀錄
 */
(function () {
  const STORAGE_KEY = "simba-life-entries-v1";

  const form = document.getElementById("entry-form");
  const journalList = document.getElementById("journal-list");
  const outingList = document.getElementById("outing-list");
  const statusEl = document.getElementById("form-status");
  const dateInput = document.getElementById("entry-date");
  const placeRow = document.querySelector(".outing-only");
  const placeInput = document.getElementById("entry-place");
  const clearBtn = document.getElementById("clear-saved");

  if (!form || !journalList || !outingList) return;

  /** 預設今天日期 */
  function todayISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  if (dateInput && !dateInput.value) {
    dateInput.value = todayISO();
  }

  /** 星期幾（繁中） */
  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

  function formatDisplayDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
    const [y, m, day] = parts;
    const dt = new Date(y, m - 1, day);
    const wd = WEEKDAYS[dt.getDay()];
    return `${y}年${m}月${day}日 · 週${wd}`;
  }

  function formatShortDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
    const [y, m, day] = parts;
    return `${y}年${m}月${day}日`;
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function setStatus(msg, ok) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("ok", Boolean(ok));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function createJournalCard(entry) {
    const article = document.createElement("article");
    article.className = "timeline-card user-entry";
    article.dataset.kind = "journal";
    article.dataset.id = entry.id;
    article.innerHTML = `
      <div class="card-badge">我的紀錄</div>
      <time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatDisplayDate(entry.date))}</time>
      <h3>${escapeHtml(entry.title)}</h3>
      <p>${escapeHtml(entry.note)}</p>
    `;
    return article;
  }

  function createOutingCard(entry) {
    const article = document.createElement("article");
    article.className = "outing-card user-entry";
    article.dataset.kind = "outing";
    article.dataset.id = entry.id;
    const place = entry.place ? escapeHtml(entry.place) : "未填地點";
    article.innerHTML = `
      <div class="card-badge">我的紀錄</div>
      <div class="outing-visual" aria-hidden="true">
        <div class="photo-placeholder outing-placeholder">
          <span class="placeholder-icon">🌿</span>
        </div>
      </div>
      <div class="outing-body">
        <time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatShortDate(entry.date))}</time>
        <h3>${escapeHtml(entry.title)}</h3>
        <p class="place">📍 ${place}</p>
        <p>${escapeHtml(entry.note)}</p>
      </div>
    `;
    return article;
  }

  function removeRenderedUserEntries() {
    document.querySelectorAll(".user-entry").forEach((el) => el.remove());
  }

  function renderEntries() {
    removeRenderedUserEntries();
    const entries = loadEntries().slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    entries.forEach((entry) => {
      if (entry.kind === "outing") {
        outingList.prepend(createOutingCard(entry));
      } else {
        journalList.prepend(createJournalCard(entry));
      }
    });
  }

  function syncKindUI() {
    const kind = form.querySelector('input[name="kind"]:checked')?.value || "journal";
    const isOuting = kind === "outing";
    if (placeRow) placeRow.hidden = !isOuting;
    if (placeInput) {
      placeInput.required = isOuting;
      if (!isOuting) placeInput.value = "";
    }
  }

  form.querySelectorAll('input[name="kind"]').forEach((radio) => {
    radio.addEventListener("change", syncKindUI);
  });
  syncKindUI();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const kind = form.querySelector('input[name="kind"]:checked')?.value || "journal";
    const date = dateInput.value.trim();
    const title = form.querySelector("#entry-title").value.trim();
    const note = form.querySelector("#entry-note").value.trim();
    const place = placeInput ? placeInput.value.trim() : "";

    if (!date || !title || !note) {
      setStatus("請填寫日期、標題與內容。", false);
      return;
    }
    if (kind === "outing" && !place) {
      setStatus("外出紀錄請填寫地點。", false);
      return;
    }

    const entry = {
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      date,
      title,
      note,
      place: kind === "outing" ? place : "",
      createdAt: new Date().toISOString(),
    };

    const entries = loadEntries();
    entries.push(entry);
    saveEntries(entries);
    renderEntries();

    form.reset();
    if (dateInput) dateInput.value = todayISO();
    syncKindUI();
    setStatus(kind === "outing" ? "已加入外出紀錄 ✓" : "已加入生活日記 ✓", true);

    const target = kind === "outing" ? document.getElementById("outings") : document.getElementById("journal");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const entries = loadEntries();
      if (!entries.length) {
        setStatus("目前沒有你自行新增的紀錄。", false);
        return;
      }
      if (!window.confirm("確定清除所有「我的紀錄」？靜態預設內容不會被刪除。")) return;
      localStorage.removeItem(STORAGE_KEY);
      renderEntries();
      setStatus("已清除你新增的紀錄。", true);
    });
  }

  renderEntries();
})();
