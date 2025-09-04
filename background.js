// Listen whenever the active tab changes
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateActionTitle(tabId);
});

// Also listen when the URL of the active tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    updateActionTitle(tabId);
  }
});

function updateActionTitle(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab || !tab.url) return;

    if (tab.url.includes("youtube.com")) {
      chrome.action.setTitle({ tabId, title: "Capture Frame" });
    } else {
      chrome.action.setTitle({ tabId, title: "Take Screenshot" });
    }
  });
}


chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !tab.url) return;

  // Check if it's YouTube
  if (tab.url.includes("youtube.com")) {
    // Inject script to grab the video frame
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureYouTubeFrame
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }

      const dataUrl = results && results[0] && results[0].result;

      if (dataUrl) {
        const filename = `youtube-frame-${Date.now()}.png`;
        afterCapture(dataUrl,filename,tab.id)
      } else {
        // fallback if no video found
        takeFullTabScreenshot(tab);
      }
    });
  } else {
    // For all other sites → full tab screenshot
    takeFullTabScreenshot(tab);
  }
});

function takeFullTabScreenshot(tab) {
  chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      return;
    }
    const filename = `screenshot-${Date.now()}.png`;
    
    afterCapture(dataUrl,filename,tab.id)
  });
}

// Runs inside YouTube tab
function captureYouTubeFrame() {
  const video = document.querySelector("video");

  if (!video || video.readyState < 2) {
    // No video or not enough data yet
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

function afterCapture(dataUrl,filename,tabId) {
  chrome.storage.sync.get(["download", "copy"], async (settings) => {
    const { download, copy } = settings;
    if (download) {
      chrome.downloads.download({
          url: dataUrl,
          filename: filename
      });
    }
    if (copy) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: copyImageToClipboard,
        args: [dataUrl]
      });
    }
  });
}

async function copyImageToClipboard(dataUrl) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);

    console.log("✅ Image copied to clipboard!");
  } catch (err) {
    console.error("❌ Failed to copy image to clipboard:", err);
  }
}
