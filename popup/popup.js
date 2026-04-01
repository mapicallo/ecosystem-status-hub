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
};

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
    default:
      return sourceType;
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
      row.className = "link-row";
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
      row.append(badge, a);
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

async function load() {
  const root = document.getElementById("root");
  if (!root) return;

  try {
    const url = chrome.runtime.getURL("data/links.json");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load links (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data.links)) throw new Error("Invalid links data");
    render(root, { links: data.links, meta: data.meta });
  } catch (e) {
    renderError(root, e instanceof Error ? e.message : "Could not load directory.");
  }
}

load();

document.getElementById("close-panel")?.addEventListener("click", () => {
  window.close();
});
