const BTN_ID = "ig-downloader-inline-btn";
const RESERVED_PATHS = new Set([
  "accounts",
  "explore",
  "reels",
  "direct",
  "stories",
  "p",
  "tv",
  "about",
  "developer",
  "api",
  "legal",
  "privacy",
  "terms"
]);

function getProfileUsernameFromPath() {
  const path = window.location.pathname || "/";
  const match = path.match(/^\/([A-Za-z0-9._]+)\/?$/);
  if (!match?.[1]) return "";
  const username = match[1];
  if (RESERVED_PATHS.has(username.toLowerCase())) return "";
  return username;
}

function t(key) {
  try {
    return chrome.i18n.getMessage(key) || key;
  } catch {
    return key;
  }
}

function findHeaderActionRow() {
  const header = document.querySelector("header");
  if (!header) return null;

  // Instagram frequently changes classnames; anchor to the "Follow/Message" button row.
  const button = Array.from(header.querySelectorAll("button")).find((el) => {
    const txt = (el.textContent || "").trim().toLowerCase();
    return txt.length > 0;
  });
  return button?.parentElement || header;
}

function createButton() {
  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.textContent = t("inPageButtonLabel");
  btn.style.marginLeft = "8px";
  btn.style.padding = "7px 12px";
  btn.style.border = "1px solid rgba(0,0,0,0.15)";
  btn.style.borderRadius = "8px";
  btn.style.background = "#0095f6";
  btn.style.color = "#fff";
  btn.style.fontWeight = "600";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";

  return btn;
}

function removeExistingButton() {
  const existing = document.getElementById(BTN_ID);
  if (existing) existing.remove();
}

function syncInlineButton() {
  const username = getProfileUsernameFromPath();
  const existing = document.getElementById(BTN_ID);

  if (!username) {
    if (existing) existing.remove();
    return;
  }

  const mountPoint = findHeaderActionRow();
  if (!mountPoint) return;

  let btn = existing;
  if (!btn) {
    btn = createButton();
    mountPoint.appendChild(btn);
  } else if (btn.parentElement !== mountPoint) {
    mountPoint.appendChild(btn);
  }

  if (btn.dataset.username !== username) {
    btn.dataset.username = username;
    btn.onclick = () => {
      chrome.runtime.sendMessage({
        type: "openDownloaderPopup",
        payload: { username }
      });
    };
  }
}

let scheduled = false;
function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    syncInlineButton();
  }, 120);
}

const observer = new MutationObserver(() => {
  scheduleSync();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
syncInlineButton();

window.addEventListener("popstate", scheduleSync);
window.addEventListener("hashchange", scheduleSync);
window.addEventListener("beforeunload", () => {
  observer.disconnect();
  removeExistingButton();
});
