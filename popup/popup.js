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

const FAMILY_LABELS = {
  internet: "Internet & routing",
  dns: "DNS",
  cdn: "CDN & edge",
  cloud: "Cloud & hosting",
  dev: "Developer platforms",
  saas: "SaaS, identity & collaboration",
  payments: "Payments",
  ai: "AI & APIs",
  security: "Observability & security reference",
};

const BADGE_CLASS = {
  official: "badge-official",
  academic: "badge-academic",
  "trusted-third": "badge-trusted-third",
  aggregator: "badge-trusted-third",
  custom: "badge-custom",
};

const STORAGE_KEY_CUSTOM = "customLinks";

function badgeLabel(sourceType) {
  switch (sourceType) {
    case "official":
      return "Official";
    case "academic":
      return "Research";
    case "trusted-third":
      return "3rd party";
    case "aggregator":
      return "Aggregator";
    case "custom":
      return "Yours";
    default:
      return sourceType;
  }
}

function newCustomId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `u-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @returns {string | null} */
function normalizeUrl(input) {
  const t = String(input).trim();
  if (!t) return null;
  try {
    const withProto = t.includes("://") ? t : `https://${t}`;
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

function render(root, payload) {
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
    label.textContent = FAMILY_LABELS[familyId] ?? familyId;
    const chev = document.createElement("span");
    chev.className = "chevron";
    chev.setAttribute("aria-hidden", "true");
    summary.append(label, chev);
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "family-body";
    for (const item of items) {
      const row = document.createElement("div");
      row.className = "link-row" + (item.isCustom ? " link-row--custom" : "");

      const badge = document.createElement("span");
      const bClass = BADGE_CLASS[item.sourceType] ?? "";
      badge.className = `badge ${bClass}`.trim();
      badge.textContent = badgeLabel(item.sourceType);
      badge.title = item.sourceType;

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
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => startEditCustom(item));
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-danger";
        delBtn.textContent = "Remove";
        delBtn.addEventListener("click", () => removeCustom(item.customId));
        actions.append(editBtn, delBtn);
        row.appendChild(actions);
      }

      body.appendChild(row);
    }
    details.appendChild(body);
    root.appendChild(details);
  }

  const metaLine = document.getElementById("meta-line");
  if (meta?.lastVerified && metaLine) {
    metaLine.hidden = false;
    metaLine.textContent = `Data snapshot: ${meta.lastVerified}`;
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
    if (!res.ok) throw new Error(`Failed to load links (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data.links)) throw new Error("Invalid links data");
    const custom = await getCustomLinks();
    const merged = buildMergedList(data.links, custom);
    render(root, { links: merged, meta: data.meta });
  } catch (e) {
    renderError(root, e instanceof Error ? e.message : "Could not load directory.");
  }
}

/** @type {boolean} */
let customFormInitialized = false;

function showFormError(msg) {
  const el = document.getElementById("custom-form-error");
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || "";
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
  const toggle = document.getElementById("toggle-custom-form");
  if (toggle) toggle.textContent = "Add";
}

function populateFamilySelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  for (const fid of FAMILY_ORDER) {
    const opt = document.createElement("option");
    opt.value = fid;
    opt.textContent = FAMILY_LABELS[fid] ?? fid;
    selectEl.appendChild(opt);
  }
}

/** @param {{ customId: string, family: string, title: string, url: string }} item */
function startEditCustom(item) {
  const formEl = document.getElementById("custom-form");
  const editIdEl = document.getElementById("custom-edit-id");
  const famEl = document.getElementById("custom-family");
  const titleEl = document.getElementById("custom-title");
  const urlEl = document.getElementById("custom-url");
  const toggle = document.getElementById("toggle-custom-form");
  if (!formEl || !editIdEl || !famEl || !titleEl || !urlEl) return;
  editIdEl.value = item.customId;
  famEl.value = item.family;
  titleEl.value = item.title;
  urlEl.value = item.url;
  formEl.hidden = false;
  showFormError("");
  if (toggle) toggle.textContent = "Hide";
  formEl.scrollIntoView({ block: "nearest" });
  titleEl.focus();
}

async function removeCustom(customId) {
  if (!customId) return;
  const ok = window.confirm("Remove this link from your list?");
  if (!ok) return;
  const list = (await getCustomLinks()).filter((x) => x.id !== customId);
  await setCustomLinks(list);
  await refreshDirectory();
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
      toggle.textContent = "Hide";
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
      showFormError("Please enter a title.");
      return;
    }
    if (!urlNorm) {
      showFormError("Enter a valid http(s) URL.");
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
  initCustomLinksForm();
  await refreshDirectory();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY_CUSTOM]) return;
  refreshDirectory().catch(() => {});
});

load();

document.getElementById("close-panel")?.addEventListener("click", () => {
  window.close();
});
