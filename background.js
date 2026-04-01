const PANEL_PATH = "panel/panel.html";
const STORAGE_KEY = "hubPanelWindowId";

async function getStoredWindowId() {
  const s = await chrome.storage.session.get(STORAGE_KEY);
  return s[STORAGE_KEY] ?? null;
}

async function setStoredWindowId(id) {
  if (id == null) {
    await chrome.storage.session.remove(STORAGE_KEY);
  } else {
    await chrome.storage.session.set({ [STORAGE_KEY]: id });
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
