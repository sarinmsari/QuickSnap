document.addEventListener("DOMContentLoaded", async () => {
  const downloadCheckbox = document.getElementById("download");
  const copyCheckbox = document.getElementById("copy");
  const saveButton = document.getElementById("save");

  // Load saved settings
  chrome.storage.sync.get(["download", "copy"], (data) => {
    downloadCheckbox.checked = data.download ?? true; // default enabled
    copyCheckbox.checked = data.copy ?? true; // default enabled
  });

  // Save settings
  saveButton.addEventListener("click", () => {
    chrome.storage.sync.set({
      download: downloadCheckbox.checked,
      copy: copyCheckbox.checked
    }, () => {
      alert("Settings saved!");
    });
  });
});
