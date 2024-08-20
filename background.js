let currentTabId = null;
let currentTabUrl = null;
let startTime = null;

chrome.tabs.onActivated.addListener(activeInfo => {
  updateCurrentTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTabId && changeInfo.url) {
    updateCurrentTab(tabId);
  }
});

function updateCurrentTab(tabId) {
  chrome.tabs.get(tabId, tab => {
    const newUrl = new URL(tab.url).hostname;
    const now = Date.now();

    if (currentTabUrl) {
      updateTimeSpent(currentTabUrl, now - startTime);
    }

    currentTabId = tabId;
    currentTabUrl = newUrl;
    startTime = now;
  });
}

async function updateTimeSpent(url, duration) {
  try {
    const result = await safeStorageGet(['screenTime']);
    const screenTime = result.screenTime || {};
    const today = new Date().toISOString().split('T')[0];

    if (!screenTime[today]) {
      screenTime[today] = {};
    }

    if (!screenTime[today][url]) {
      screenTime[today][url] = 0;
    }

    screenTime[today][url] += duration;

    await safeStorageSet({ screenTime });
  } catch (error) {
    console.error('Error updating screen time:', error);
  }
}

// Set up alarms for notifications
chrome.alarms.create('checkScreenTimeLimit', { periodInMinutes: 5 });
chrome.alarms.create('breakReminder', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'checkScreenTimeLimit') {
    checkScreenTimeLimit();
  } else if (alarm.name === 'breakReminder') {
    showNotification('Take a Break', 'You have been using your computer for an hour. Consider taking a short break.');
  }
});

function checkScreenTimeLimit() {
  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.sync.get(['settings'], settingsResult => {
    const settings = settingsResult.settings || {};
    const dailyLimit = settings.dailyLimit;
    const websiteLimits = settings.websiteLimits || {};

    chrome.storage.local.get(['screenTime'], screenTimeResult => {
      const screenTime = screenTimeResult.screenTime || {};
      const todayData = screenTime[today] || {};

      // Check daily limit
      const totalTime = Object.values(todayData).reduce((sum, time) => sum + time, 0);
      if (dailyLimit && totalTime >= dailyLimit * 60000) {
        showNotification('Daily Limit Reached', 'You have reached your daily screen time limit.');
      }

      // Check website-specific limits
      for (const [url, limit] of Object.entries(websiteLimits)) {
        if (todayData[url] && todayData[url] >= limit * 60000) {
          showNotification('Website Limit Reached', `You have reached your screen time limit for ${url}.`);
        }
      }
    });
  });
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: title,
    message: message
  });
}

function safeStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

function safeStorageSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}