const IG_APP_ID = "936619743392459";
const UPDATE_REPO_OWNER = "davidksana282-blip";
const UPDATE_REPO_NAME = "instagram-downloader---instagram-stahovani";

function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function sendProgress(line) {
  chrome.runtime.sendMessage({ type: "progress", line }).catch(() => {});
}

function safeName(input) {
  return String(input || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function compareVersions(a, b) {
  const pa = String(a || "").replace(/^v/i, "").split(".").map((x) => Number.parseInt(x, 10) || 0);
  const pb = String(b || "").replace(/^v/i, "").split(".").map((x) => Number.parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

async function checkGithubUpdate() {
  if (!UPDATE_REPO_OWNER || !UPDATE_REPO_NAME) {
    throw new Error(t("errUpdateRepoNotConfigured"));
  }

  const url = `https://api.github.com/repos/${encodeURIComponent(UPDATE_REPO_OWNER)}/${encodeURIComponent(UPDATE_REPO_NAME)}/releases/latest`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!resp.ok) {
    throw new Error(t("errUpdateHttp", String(resp.status)));
  }

  const json = await resp.json();
  const latestVersion = String(json?.tag_name || "").replace(/^v/i, "");
  if (!latestVersion) {
    throw new Error(t("errUpdateNoTagName"));
  }

  const currentVersion = String(chrome.runtime.getManifest().version || "").replace(/^v/i, "");
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
  return {
    updateAvailable,
    currentVersion,
    latestVersion,
    updateUrl: json?.html_url || `https://github.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/releases`
  };
}

async function igFetchJson(url) {
  const resp = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-IG-App-ID": IG_APP_ID,
      "X-Requested-With": "XMLHttpRequest"
    }
  });

  if (!resp.ok) {
    throw new Error(t("errHttpForUrl", [String(resp.status), url]));
  }
  return resp.json();
}

async function resolveUser(username) {
  const endpoint = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const data = await igFetchJson(endpoint);
  const user = data?.data?.user;
  if (!user?.id) {
    throw new Error(t("errCannotLoadProfile"));
  }
  return user;
}

function pushMediaFromItem(item, collection, sourceLabel) {
  if (!item) return;

  const taken = item.taken_at || item.device_timestamp || Math.floor(Date.now() / 1000);

  const pushOne = (url, ext, idx) => {
    if (!url) return;
    collection.push({
      url,
      ext,
      taken,
      sourceLabel,
      id: item.id || item.pk || `item_${taken}_${idx}`
    });
  };

  const isVideo = Boolean(item.video_versions?.length || item.video_url);
  if (item.carousel_media?.length) {
    item.carousel_media.forEach((cm, idx) => {
      if (cm.video_versions?.length) {
        pushOne(cm.video_versions[0].url, "mp4", idx);
      } else if (cm.image_versions2?.candidates?.length) {
        pushOne(cm.image_versions2.candidates[0].url, "jpg", idx);
      }
    });
    return;
  }

  if (isVideo) {
    pushOne(item.video_versions?.[0]?.url || item.video_url, "mp4", 0);
    return;
  }

  if (item.image_versions2?.candidates?.length) {
    pushOne(item.image_versions2.candidates[0].url, "jpg", 0);
  }
}

async function collectPosts(userId, maxItems) {
  const media = [];
  let maxId = null;
  let page = 0;

  while (true) {
    page += 1;
    const qs = new URLSearchParams({ count: "33" });
    if (maxId) qs.set("max_id", String(maxId));
    const url = `https://www.instagram.com/api/v1/feed/user/${encodeURIComponent(userId)}/?${qs.toString()}`;
    const data = await igFetchJson(url);
    const items = data?.items || [];

    sendProgress(t("progressPostsPage", [String(page), String(items.length)]));
    for (const item of items) {
      pushMediaFromItem(item, media, "posts");
      if (maxItems > 0 && media.length >= maxItems) {
        return media.slice(0, maxItems);
      }
    }

    const hasMore = Boolean(data?.more_available);
    maxId = data?.next_max_id || null;
    if (!hasMore || !maxId) break;
  }

  return media;
}

async function collectStories(userId) {
  const media = [];
  const url = `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(userId)}`;
  const data = await igFetchJson(url);
  const reels = data?.reels || {};
  const reel = reels[userId];
  const items = reel?.items || [];
  items.forEach((item) => pushMediaFromItem(item, media, "stories"));
  return media;
}

async function collectHighlightMediaFromDefs(defs) {
  const media = [];
  for (const hl of defs || []) {
    const reelId = `highlight:${hl.id}`;
    const mediaUrl = `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(reelId)}`;
    try {
      const reelResp = await igFetchJson(mediaUrl);
      const reel = reelResp?.reels?.[reelId];
      const items = reel?.items || [];
      items.forEach((item) => pushMediaFromItem(item, media, `highlight_${safeName(hl.title || hl.id)}`));
    } catch (err) {
      sendProgress(t("progressHighlightFailed", [String(hl.id), err.message || String(err)]));
    }
  }
  return media;
}

function normalizeHighlightDefs(rawDefs) {
  const map = new Map();
  for (const hl of rawDefs || []) {
    if (!hl?.id) continue;
    const id = String(hl.id);
    if (!map.has(id)) {
      map.set(id, {
        id,
        title: hl.title || hl.name || id
      });
    }
  }
  return Array.from(map.values());
}

async function extractHighlightDefsFromOpenTab(username) {
  const tabs = await chrome.tabs.query({});
  const wanted = String(username || "").toLowerCase();
  const candidate = tabs.find((tab) => {
    if (!tab?.id || !tab?.url) return false;
    try {
      const u = new URL(tab.url);
      if (!u.hostname.includes("instagram.com")) return false;
      const seg = (u.pathname.match(/^\/([^/?#]+)/)?.[1] || "").toLowerCase();
      return seg === wanted;
    } catch {
      return false;
    }
  });

  if (!candidate?.id) {
    sendProgress(t("progressDomFallbackTabNotFound"));
    return [];
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: candidate.id },
    func: () => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/stories/highlights/"]'));
      return anchors
        .map((a) => {
          const href = a.getAttribute("href") || "";
          const id = href.match(/\/stories\/highlights\/(\d+)/)?.[1];
          const imgAlt = a.querySelector("img")?.getAttribute("alt") || "";
          const txt = (a.textContent || "").trim();
          return {
            id: id || null,
            title: imgAlt || txt || null
          };
        })
        .filter((x) => x.id);
    }
  });

  return normalizeHighlightDefs(results?.[0]?.result || []);
}

async function collectHighlights(userId) {
  const highlightMap = new Map();

  const addHighlights = (arr, source) => {
    for (const hl of arr || []) {
      if (!hl?.id) continue;
      if (!highlightMap.has(String(hl.id))) {
        highlightMap.set(String(hl.id), {
          id: String(hl.id),
          title: hl.title || hl.name || hl.id,
          source
        });
      }
    }
  };

  // Fallback path: try tray endpoints when web_profile_info does not expose highlights.
  const trayEndpoints = [
    `https://www.instagram.com/api/v1/highlights/${encodeURIComponent(userId)}/highlights_tray/`,
    `https://www.instagram.com/api/v1/users/${encodeURIComponent(userId)}/highlights_tray/`
  ];

  for (const trayUrl of trayEndpoints) {
    try {
      const tray = await igFetchJson(trayUrl);
      addHighlights(tray?.tray, "tray");
      if (highlightMap.size > 0) break;
    } catch (err) {
      sendProgress(t("progressHighlightsTrayFailed", err.message || String(err)));
    }
  }

  const highlights = Array.from(highlightMap.values());
  sendProgress(t("progressHighlightsSetsResolved", String(highlights.length)));
  return collectHighlightMediaFromDefs(highlights);
}

async function downloadMedia(username, mediaList, section, baseFolder) {
  let ok = 0;
  let fail = 0;
  const seen = new Set();

  for (let i = 0; i < mediaList.length; i += 1) {
    const m = mediaList[i];
    if (!m?.url || seen.has(m.url)) continue;
    seen.add(m.url);

    const date = new Date((m.taken || 0) * 1000);
    const ts = Number.isFinite(date.getTime()) ? date.toISOString().replace(/[:.]/g, "-") : String(Date.now());
    const base = `${String(i + 1).padStart(5, "0")}_${ts}`;
    const file = `${base}.${m.ext || "bin"}`;
    const sourceFolder = m.sourceLabel && m.sourceLabel !== section ? `/${safeName(m.sourceLabel)}` : "";
    const root = safeName(baseFolder || "instagram");
    const filename = `${root}/${safeName(username)}/${section}${sourceFolder}/${file}`;

    try {
      await chrome.downloads.download({
        url: m.url,
        filename,
        conflictAction: "uniquify",
        saveAs: false
      });
      ok += 1;
      sendProgress(t("progressDownloaded", [String(ok + fail), String(mediaList.length), section]));
    } catch {
      fail += 1;
    }
  }

  return { ok, fail };
}

async function runProfileDownload(options) {
  const { username, includePosts, includeStories, includeHighlights, maxItems, baseFolder } = options;
  sendProgress(t("progressResolvingUser", username));
  const user = await resolveUser(username);
  const userId = user.id;
  sendProgress(t("progressUserResolved", [user.username, String(userId)]));

  const stats = [];
  if (includePosts) {
    sendProgress(t("progressCollectingPosts"));
    const posts = await collectPosts(userId, maxItems || 0);
    sendProgress(t("progressPostsFound", String(posts.length)));
    const res = await downloadMedia(user.username, posts, "posts", baseFolder);
    stats.push(`posts: ${res.ok} ok, ${res.fail} fail`);
  }

  if (includeStories) {
    sendProgress(t("progressCollectingStories"));
    const stories = await collectStories(userId);
    sendProgress(t("progressStoriesFound", String(stories.length)));
    const res = await downloadMedia(user.username, stories, "stories", baseFolder);
    stats.push(`stories: ${res.ok} ok, ${res.fail} fail`);
  }

  if (includeHighlights) {
    sendProgress(t("progressCollectingHighlights"));
    const profileHighlightEdges = user?.edge_highlight_reels?.edges || [];
    sendProgress(t("progressHighlightsInProfileInfo", String(profileHighlightEdges.length)));

    const collectFromUser = async () => {
      const defs = normalizeHighlightDefs(profileHighlightEdges.map((edge) => edge?.node));
      return collectHighlightMediaFromDefs(defs);
    };

    let highlights = [];
    if (profileHighlightEdges.length > 0) {
      highlights = await collectFromUser();
    }
    if (highlights.length === 0) {
      sendProgress(t("progressHighlightsTryingTrayFallback"));
      highlights = await collectHighlights(userId);
    }
    if (highlights.length === 0) {
      sendProgress(t("progressHighlightsTryingDomFallback"));
      const domDefs = await extractHighlightDefsFromOpenTab(user.username);
      sendProgress(t("progressDomFallbackIds", String(domDefs.length)));
      if (domDefs.length > 0) {
        highlights = await collectHighlightMediaFromDefs(domDefs);
      }
    }

    sendProgress(t("progressHighlightsFound", String(highlights.length)));
    const res = await downloadMedia(user.username, highlights, "highlights", baseFolder);
    stats.push(`highlights: ${res.ok} ok, ${res.fail} fail`);
  }

  sendProgress(t("progressDone", stats.join(" | ")));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "openDownloaderPopup") {
    (async () => {
      try {
        const username = String(msg?.payload?.username || "").replace(/^@/, "").trim();
        const url = chrome.runtime.getURL(`popup.html${username ? `?username=${encodeURIComponent(username)}` : ""}`);
        await chrome.windows.create({
          url,
          type: "popup",
          width: 420,
          height: 760
        });
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg?.type === "checkForUpdates") {
    (async () => {
      try {
        const result = await checkGithubUpdate();
        sendResponse({ ok: true, ...result });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg?.type !== "downloadProfile") return false;

  (async () => {
    try {
      await runProfileDownload(msg.payload || {});
      sendResponse({ ok: true });
    } catch (err) {
      sendProgress(t("logError", err.message || String(err)));
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();

  return true;
});
