const PANEL_PATH = "panel/panel.html";
const STORAGE_KEY = "hubPanelWindowId";

/** In-memory fallback if storage APIs are unavailable (should not happen with manifest permissions). */
let memoryPanelWindowId = null;

function sessionArea() {
  return chrome.storage?.session;
}

async function getStoredWindowId() {
  const area = sessionArea();
  if (!area) {
    return memoryPanelWindowId;
  }
  try {
    const s = await area.get(STORAGE_KEY);
    return s[STORAGE_KEY] ?? null;
  } catch (e) {
    console.warn("[Ecosystem Status Hub] session get failed", e);
    return memoryPanelWindowId;
  }
}

async function setStoredWindowId(id) {
  memoryPanelWindowId = id;
  const area = sessionArea();
  if (!area) {
    console.warn("[Ecosystem Status Hub] chrome.storage.session missing; using memory only");
    return;
  }
  try {
    if (id == null) {
      await area.remove(STORAGE_KEY);
    } else {
      await area.set({ [STORAGE_KEY]: id });
    }
  } catch (e) {
    console.warn("[Ecosystem Status Hub] session set failed", e);
  }
}

async function focusOrOpenPanel() {
  const existingId = await getStoredWindowId();
  if (existingId != null) {
    try {
      await chrome.windows.get(existingId);
      await chrome.windows.update(existingId, {
        focused: true,
        drawAttention: true,
        state: "normal",
      });
      return;
    } catch {
      await setStoredWindowId(null);
    }
  }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL(PANEL_PATH),
    type: "popup",
    width: 440,
    height: 720,
    focused: true,
  });

  if (win?.id != null) {
    await setStoredWindowId(win.id);
  }
}

chrome.action.onClicked.addListener(() => {
  focusOrOpenPanel().catch((err) => {
    console.error("[Ecosystem Status Hub]", err);
  });
});

chrome.windows.onRemoved.addListener((windowId) => {
  getStoredWindowId()
    .then((id) => {
      if (id === windowId) {
        return setStoredWindowId(null);
      }
    })
    .catch((err) => console.error("[Ecosystem Status Hub] onRemoved", err));
});
