// FocusTrack Content Script
// Minimal — just sends visibility changes to background
let hidden = false;

document.addEventListener('visibilitychange', () => {
  chrome.runtime.sendMessage({
    type: hidden ? 'TAB_VISIBLE' : 'TAB_HIDDEN',
    url: window.location.href
  }).catch(() => {});
  hidden = document.hidden;
});
