const usernameInput = document.getElementById("username");
const postsInput = document.getElementById("posts");
const storiesInput = document.getElementById("stories");
const highlightsInput = document.getElementById("highlights");
const maxItemsInput = document.getElementById("maxItems");
const baseFolderInput = document.getElementById("baseFolder");
const fillFromTabBtn = document.getElementById("fillFromTab");
const downloadBtn = document.getElementById("downloadBtn");
const logEl = document.getElementById("log");

function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function localizeUi() {
  document.documentElement.lang = chrome.i18n.getUILanguage().toLowerCase().startsWith("cs") ? "cs" : "en";
  document.getElementById("title").textContent = t("popupTitle");
  document.getElementById("hint").textContent = t("popupHint");
  document.getElementById("usernameLabel").textContent = t("usernameLabel");
  usernameInput.placeholder = t("usernamePlaceholder");
  fillFromTabBtn.textContent = t("fillFromTabButton");
  document.getElementById("downloadWhatLegend").textContent = t("downloadWhatLegend");
  document.getElementById("postsLabel").textContent = t("postsLabel");
  document.getElementById("storiesLabel").textContent = t("storiesLabel");
  document.getElementById("highlightsLabel").textContent = t("highlightsLabel");
  document.getElementById("maxItemsLabel").textContent = t("maxItemsLabel");
  document.getElementById("baseFolderLabel").textContent = t("baseFolderLabel");
  downloadBtn.textContent = t("downloadButton");
}

function log(line) {
  const now = new Date().toLocaleTimeString();
  logEl.textContent += `[${now}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

async function getUsernameFromCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return "";
  try {
    const u = new URL(tab.url);
    if (!u.hostname.includes("instagram.com")) return "";
    const match = u.pathname.match(/^\/([A-Za-z0-9._]+)\/?$/);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

fillFromTabBtn.addEventListener("click", async () => {
  const username = await getUsernameFromCurrentTab();
  if (!username) {
    log(t("logCannotReadUsernameFromTab"));
    return;
  }
  usernameInput.value = username;
  log(t("logUsernameFromTab", username));
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "progress" && msg?.line) {
    log(msg.line);
  }
});

downloadBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim().replace(/^@/, "");
  if (!username) {
    log(t("logEnterUsername"));
    return;
  }

  const includePosts = postsInput.checked;
  const includeStories = storiesInput.checked;
  const includeHighlights = highlightsInput.checked;
  if (!includePosts && !includeStories && !includeHighlights) {
    log(t("logSelectAtLeastOneSection"));
    return;
  }

  const maxItems = Math.max(0, Number(maxItemsInput.value || 0));
  const baseFolder = (baseFolderInput.value || "instagram").trim() || "instagram";
  downloadBtn.disabled = true;
  log(t("logStartDownload", username));

  try {
    const resp = await chrome.runtime.sendMessage({
      type: "downloadProfile",
      payload: {
        username,
        includePosts,
        includeStories,
        includeHighlights,
        maxItems,
        baseFolder
      }
    });

    if (!resp?.ok) {
      throw new Error(resp?.error || "Unknown error");
    }
    log(t("logDone"));
  } catch (err) {
    log(t("logError", err.message || String(err)));
  } finally {
    downloadBtn.disabled = false;
  }
});

localizeUi();
