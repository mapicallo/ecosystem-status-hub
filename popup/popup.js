import {
  STORAGE_KEY_UI_LANG,
  defaultLangFromNavigator,
  isSupportedLang,
  translate,
  badgeKeyForSourceType,
} from "./i18n.js";

const FAMILY_ORDER = [
  "internet",
  "dns",
  "cdn",
  "cloud",
  "dev",
  "saas",
  "payments",
  "ai",
  "security",
];

const BADGE_CLASS = {
  official: "badge-official",
  academic: "badge-academic",
  "trusted-third": "badge-trusted-third",
  aggregator: "badge-trusted-third",
  custom: "badge-custom",
};

const STORAGE_KEY_CUSTOM = "customLinks";

/** @type {{ links: any[]; meta: any } | null} */
let lastPayload = null;

/** @type {"en" | "es"} */
let uiLang = "en";

function t(key, vars) {
  return translate(uiLang, key, vars);
}

function newCustomId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `u-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @returns {string | null} */
function normalizeUrl(input) {
  const raw = String(input).trim();
  if (!raw) return null;
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function groupByFamily(links) {
  const map = new Map();
  for (const link of links) {
    if (!map.has(link.family)) map.set(link.family, []);
    map.get(link.family).push(link);
  }
  return map;
}

function buildMergedList(builtIn, customRecords) {
  const customItems = (Array.isArray(customRecords) ? customRecords : [])
    .filter((c) => c && typeof c.family === "string" && FAMILY_ORDER.includes(c.family))
    .map((c) => ({
      customId: c.id,
      family: c.family,
      title: c.title,
      url: c.url,
      isCustom: true,
      sourceType: "custom",
    }));

  const builtinByFamily = groupByFamily(builtIn);
  const customByFamily = groupByFamily(customItems);
  const flat = [];
  for (const fid of FAMILY_ORDER) {
    flat.push(...(builtinByFamily.get(fid) ?? []));
    flat.push(...(customByFamily.get(fid) ?? []));
  }
  return flat;
}

async function getCustomLinks() {
  const r = await chrome.storage.local.get(STORAGE_KEY_CUSTOM);
  const list = r[STORAGE_KEY_CUSTOM];
  return Array.isArray(list) ? list : [];
}

async function setCustomLinks(list) {
  await chrome.storage.local.set({ [STORAGE_KEY_CUSTOM]: list });
}

async function loadUiLanguage() {
  const r = await chrome.storage.local.get(STORAGE_KEY_UI_LANG);
  const stored = r[STORAGE_KEY_UI_LANG];
  if (isSupportedLang(stored)) {
    uiLang = stored;
    return;
  }
  uiLang = defaultLangFromNavigator();
}

function updateMetaLine(meta) {
  const metaLine = document.getElementById("meta-line");
  if (!metaLine) return;
  if (meta?.lastVerified) {
    metaLine.hidden = false;
    metaLine.textContent = t("meta.snapshot", { date: meta.lastVerified });
  } else {
    metaLine.hidden = true;
    metaLine.textContent = "";
  }
}

function setSearchLive(text) {
  const el = document.getElementById("search-live");
  if (el) el.textContent = text ?? "";
}

/** @param {any} item */
function buildLinkRow(item) {
  const row = document.createElement("div");
  row.className = "link-row" + (item.isCustom ? " link-row--custom" : "");

  const badge = document.createElement("span");
  const bClass = BADGE_CLASS[item.sourceType] ?? "";
  badge.className = `badge ${bClass}`.trim();
  const bKey = badgeKeyForSourceType(item.sourceType);
  badge.textContent = t(bKey);
  badge.title = t(bKey);

  const a = document.createElement("a");
  a.href = item.url;
  a.textContent = item.title;
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  const grow = document.createElement("div");
  grow.className = "link-grow";
  grow.append(badge, a);
  row.appendChild(grow);

  if (item.isCustom && item.customId) {
    const actions = document.createElement("div");
    actions.className = "link-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-ghost";
    editBtn.textContent = t("custom.edit");
    editBtn.addEventListener("click", () => startEditCustom(item));
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-danger";
    delBtn.textContent = t("custom.remove");
    delBtn.addEventListener("click", () => removeCustom(item.customId));
    actions.append(editBtn, delBtn);
    row.appendChild(actions);
  }

  return row;
}

function filterLinks(links, query) {
  const q = String(query).trim().toLowerCase();
  if (!q) return links;
  return links.filter((item) => {
    const fam = t(`family.${item.family}`).toLowerCase();
    return (
      fam.includes(q) ||
      String(item.title).toLowerCase().includes(q) ||
      String(item.url).toLowerCase().includes(q)
    );
  });
}

function renderAccordions(root, payload) {
  const { links, meta } = payload;
  const byFamily = groupByFamily(links);
  root.innerHTML = "";
  root.setAttribute("aria-busy", "false");

  for (const familyId of FAMILY_ORDER) {
    const items = byFamily.get(familyId);
    if (!items?.length) continue;

    const details = document.createElement("details");
    details.className = "family";
    details.open = familyId === "internet";

    const summary = document.createElement("summary");
    summary.className = "family-summary";
    const label = document.createElement("span");
    label.textContent = t(`family.${familyId}`);
    const chev = document.createElement("span");
    chev.className = "chevron";
    chev.setAttribute("aria-hidden", "true");
    summary.append(label, chev);
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "family-body";
    for (const item of items) {
      body.appendChild(buildLinkRow(item));
    }
    details.appendChild(body);
    root.appendChild(details);
  }

  updateMetaLine(meta);
  setSearchLive("");
}

function renderSearchResults(root, filtered, meta) {
  root.innerHTML = "";
  root.setAttribute("aria-busy", "false");

  const status = document.createElement("p");
  status.className = "search-results-meta";
  if (filtered.length === 0) {
    status.textContent = t("search.noResults");
    setSearchLive(t("search.noResults"));
  } else {
    const line = t("search.resultsCount", { n: filtered.length });
    status.textContent = line;
    setSearchLive(line);
  }
  root.appendChild(status);

  for (const item of filtered) {
    const wrap = document.createElement("div");
    wrap.className = "search-hit";
    const fam = document.createElement("div");
    fam.className = "search-hit-family";
    fam.textContent = t(`family.${item.family}`);
    wrap.appendChild(fam);
    wrap.appendChild(buildLinkRow(item));
    root.appendChild(wrap);
  }

  updateMetaLine(meta);
}

function redrawMain() {
  const root = document.getElementById("root");
  if (!root || !lastPayload) return;
  const q = document.getElementById("hub-search")?.value?.trim() ?? "";
  if (q) {
    const filtered = filterLinks(lastPayload.links, q);
    renderSearchResults(root, filtered, lastPayload.meta);
  } else {
    renderAccordions(root, lastPayload);
  }
}

function renderError(root, message) {
  root.innerHTML = "";
  root.setAttribute("aria-busy", "false");
  const p = document.createElement("p");
  p.className = "error";
  p.textContent = message;
  root.appendChild(p);
}

async function refreshDirectory() {
  const root = document.getElementById("root");
  if (!root) return;

  try {
    const dataUrl = chrome.runtime.getURL("data/links.json");
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`LOAD_HTTP:${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.links)) throw new Error("INVALID_DATA");
    const custom = await getCustomLinks();
    const merged = buildMergedList(data.links, custom);
    lastPayload = { links: merged, meta: data.meta };
    redrawMain();
  } catch (e) {
    lastPayload = null;
    let msg = t("error.generic");
    if (e instanceof Error) {
      if (e.message.startsWith("LOAD_HTTP:")) {
        const status = e.message.split(":")[1] ?? "?";
        msg = t("error.loadHttp", { status });
      } else if (e.message === "INVALID_DATA") {
        msg = t("error.invalidData");
      }
    }
    renderError(root, msg);
    setSearchLive("");
  }
}

/** @type {boolean} */
let customFormInitialized = false;

/** @type {boolean} */
let langSelectorInitialized = false;

/** @type {boolean} */
let searchBoxInitialized = false;

function initSearchBox() {
  const input = document.getElementById("hub-search");
  if (!input || searchBoxInitialized) return;
  searchBoxInitialized = true;
  input.addEventListener("input", () => {
    if (lastPayload) redrawMain();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      if (lastPayload) redrawMain();
      input.blur();
    }
  });
}

function showFormError(msg) {
  const el = document.getElementById("custom-form-error");
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || "";
}

function syncToggleCustomButton() {
  const formEl = document.getElementById("custom-form");
  const toggle = document.getElementById("toggle-custom-form");
  if (!formEl || !toggle) return;
  toggle.textContent = formEl.hidden ? t("custom.add") : t("custom.hide");
}

function resetCustomForm() {
  const editIdEl = document.getElementById("custom-edit-id");
  const titleEl = document.getElementById("custom-title");
  const urlEl = document.getElementById("custom-url");
  const formEl = document.getElementById("custom-form");
  if (editIdEl) editIdEl.value = "";
  if (titleEl) titleEl.value = "";
  if (urlEl) urlEl.value = "";
  showFormError("");
  if (formEl) formEl.hidden = true;
  syncToggleCustomButton();
}

function populateFamilySelect(selectEl) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = "";
  for (const fid of FAMILY_ORDER) {
    const opt = document.createElement("option");
    opt.value = fid;
    opt.textContent = t(`family.${fid}`);
    selectEl.appendChild(opt);
  }
  if (current && FAMILY_ORDER.includes(current)) selectEl.value = current;
}

/** @param {{ customId: string, family: string, title: string, url: string }} item */
function startEditCustom(item) {
  const formEl = document.getElementById("custom-form");
  const editIdEl = document.getElementById("custom-edit-id");
  const famEl = document.getElementById("custom-family");
  const titleEl = document.getElementById("custom-title");
  const urlEl = document.getElementById("custom-url");
  if (!formEl || !editIdEl || !famEl || !titleEl || !urlEl) return;
  editIdEl.value = item.customId;
  famEl.value = item.family;
  titleEl.value = item.title;
  urlEl.value = item.url;
  formEl.hidden = false;
  showFormError("");
  const toggle = document.getElementById("toggle-custom-form");
  if (toggle) toggle.textContent = t("custom.hide");
  formEl.scrollIntoView({ block: "nearest" });
  titleEl.focus();
}

async function removeCustom(customId) {
  if (!customId) return;
  const ok = window.confirm(t("custom.confirmRemove"));
  if (!ok) return;
  const list = (await getCustomLinks()).filter((x) => x.id !== customId);
  await setCustomLinks(list);
  await refreshDirectory();
}

function applyStaticI18n() {
  document.title = t("doc.title");

  const tag = document.getElementById("header-tagline");
  if (tag) tag.textContent = t("header.tagline");

  const hint = document.getElementById("window-hint");
  if (hint) hint.textContent = t("header.windowHint");

  const closeBtn = document.getElementById("close-panel");
  if (closeBtn) {
    closeBtn.setAttribute("aria-label", t("header.closeAria"));
    closeBtn.title = t("header.closeTitle");
  }

  const sec = document.getElementById("custom-links-ui");
  if (sec) sec.setAttribute("aria-label", t("custom.sectionAria"));

  const bar = document.getElementById("custom-links-label");
  if (bar) bar.textContent = t("custom.barLabel");

  const searchInput = document.getElementById("hub-search");
  if (searchInput) searchInput.placeholder = t("search.placeholder");

  const searchLab = document.getElementById("search-label");
  if (searchLab) searchLab.textContent = t("search.label");

  const lf = document.getElementById("label-custom-family");
  if (lf) lf.textContent = t("custom.field.section");

  const lt = document.getElementById("label-custom-title");
  if (lt) lt.textContent = t("custom.field.title");

  const lu = document.getElementById("label-custom-url");
  if (lu) lu.textContent = t("custom.field.url");

  const urlIn = document.getElementById("custom-url");
  if (urlIn) urlIn.placeholder = t("custom.placeholder.url");

  const save = document.getElementById("custom-save");
  if (save) save.textContent = t("custom.save");

  const cancel = document.getElementById("custom-cancel");
  if (cancel) cancel.textContent = t("custom.cancel");

  const disc = document.getElementById("footer-disclaimer");
  if (disc) disc.textContent = t("footer.disclaimer");

  const brandFooter = document.getElementById("a4c-brand-footer");
  if (brandFooter) brandFooter.setAttribute("aria-label", t("brand.footerAria"));

  const byPrefix = document.getElementById("a4c-brand-by-prefix");
  if (byPrefix) byPrefix.textContent = t("brand.byPrefix");

  const langSel = document.getElementById("ui-lang");
  if (langSel) langSel.setAttribute("aria-label", t("lang.label"));

  syncToggleCustomButton();
}

function initLangSelector() {
  const sel = document.getElementById("ui-lang");
  if (!sel || langSelectorInitialized) return;
  langSelectorInitialized = true;
  sel.value = uiLang;
  sel.addEventListener("change", async () => {
    const v = sel.value;
    if (!isSupportedLang(v)) return;
    uiLang = v;
    await chrome.storage.local.set({ [STORAGE_KEY_UI_LANG]: uiLang });
    document.documentElement.lang = uiLang;
    applyStaticI18n();
    populateFamilySelect(document.getElementById("custom-family"));
    setExtensionVersionLabel();
    await refreshDirectory();
  });
}

function setExtensionVersionLabel() {
  const el = document.getElementById("extension-version");
  if (!el || typeof chrome === "undefined" || !chrome.runtime?.getManifest) return;
  try {
    const v = chrome.runtime.getManifest().version;
    if (v) {
      el.textContent = t("footer.version", { v });
      el.title = t("footer.versionTitle");
    }
  } catch {
    /* ignore */
  }
}

function initCustomLinksForm() {
  if (customFormInitialized) return;
  const ui = document.getElementById("custom-links-ui");
  if (!ui) return;
  customFormInitialized = true;

  const select = document.getElementById("custom-family");
  populateFamilySelect(select);

  const formEl = document.getElementById("custom-form");
  const toggle = document.getElementById("toggle-custom-form");
  const saveBtn = document.getElementById("custom-save");
  const cancelBtn = document.getElementById("custom-cancel");

  toggle?.addEventListener("click", () => {
    if (!formEl) return;
    if (formEl.hidden) {
      document.getElementById("custom-edit-id").value = "";
      document.getElementById("custom-title").value = "";
      document.getElementById("custom-url").value = "";
      showFormError("");
      formEl.hidden = false;
      if (toggle) toggle.textContent = t("custom.hide");
      document.getElementById("custom-title")?.focus();
    } else {
      resetCustomForm();
    }
  });

  cancelBtn?.addEventListener("click", () => resetCustomForm());

  saveBtn?.addEventListener("click", async () => {
    const editIdEl = document.getElementById("custom-edit-id");
    const famEl = document.getElementById("custom-family");
    const titleEl = document.getElementById("custom-title");
    const urlEl = document.getElementById("custom-url");
    if (!famEl || !titleEl || !urlEl || !editIdEl) return;

    const title = titleEl.value.trim();
    const urlNorm = normalizeUrl(urlEl.value);
    if (!title) {
      showFormError(t("custom.err.title"));
      return;
    }
    if (!urlNorm) {
      showFormError(t("custom.err.url"));
      return;
    }
    showFormError("");

    const editId = editIdEl.value.trim();
    const list = await getCustomLinks();
    const record = {
      id: editId || newCustomId(),
      family: famEl.value,
      title,
      url: urlNorm,
    };

    const idx = list.findIndex((x) => x.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);

    await setCustomLinks(list);
    resetCustomForm();
    await refreshDirectory();
  });
}

async function load() {
  await loadUiLanguage();
  document.documentElement.lang = uiLang;

  initLangSelector();
  initSearchBox();
  applyStaticI18n();
  setExtensionVersionLabel();
  initCustomLinksForm();
  await refreshDirectory();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  const langChange = changes[STORAGE_KEY_UI_LANG];
  if (langChange) {
    const nv = langChange.newValue;
    if (isSupportedLang(nv)) {
      uiLang = nv;
      document.documentElement.lang = uiLang;
      const sel = document.getElementById("ui-lang");
      if (sel) sel.value = uiLang;
      applyStaticI18n();
      populateFamilySelect(document.getElementById("custom-family"));
      setExtensionVersionLabel();
      refreshDirectory().catch(() => {});
    }
  }

  if (changes[STORAGE_KEY_CUSTOM]) {
    refreshDirectory().catch(() => {});
  }
});

load();

document.getElementById("close-panel")?.addEventListener("click", () => {
  window.close();
});
