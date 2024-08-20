document.addEventListener('DOMContentLoaded', loadSettings);

function loadSettings() {
  chrome.storage.sync.get(['settings'], result => {
    const settings = result.settings || {};
    document.getElementById('daily-limit').value = settings.dailyLimit || '';
    document.getElementById('theme').value = settings.theme || 'light';
    document.getElementById('font-size').value = settings.fontSize || 'medium';
    
    if (settings.websiteLimits) {
      for (const [website, limit] of Object.entries(settings.websiteLimits)) {
        addWebsiteLimitElement(website, limit);
      }
    }
    
    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);
  });
}

document.getElementById('add-website-limit').addEventListener('click', () => {
  addWebsiteLimitElement();
});

function addWebsiteLimitElement(website = '', limit = '') {
  const container = document.createElement('div');
  container.innerHTML = `
    <input type="text" class="website-url" placeholder="Website URL" value="${website}">
    <input type="number" class="website-limit" placeholder="Limit (minutes)" value="${limit}">
    <button class="remove-limit">Remove</button>
  `;
  container.querySelector('.remove-limit').addEventListener('click', () => {
    container.remove();
  });
  document.getElementById('website-limits').appendChild(container);
}

document.getElementById('save-settings').addEventListener('click', saveSettings);

function saveSettings() {
  const settings = {
    dailyLimit: parseInt(document.getElementById('daily-limit').value, 10),
    theme: document.getElementById('theme').value,
    fontSize: document.getElementById('font-size').value,
    websiteLimits: {}
  };

  document.querySelectorAll('#website-limits > div').forEach(div => {
    const url = div.querySelector('.website-url').value;
    const limit = parseInt(div.querySelector('.website-limit').value, 10);
    if (url && !isNaN(limit)) {
      settings.websiteLimits[url] = limit;
    }
  });

  chrome.storage.sync.set({ settings }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving settings:', chrome.runtime.lastError);
      alert('Failed to save settings. Please try again.');
    } else {
      alert('Settings saved successfully!');
      applyTheme(settings.theme);
      applyFontSize(settings.fontSize);
    }
  });
}

document.getElementById('theme').addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

document.getElementById('font-size').addEventListener('change', (e) => {
  applyFontSize(e.target.value);
});

function applyTheme(theme) {
  document.body.classList.remove('light-mode', 'dark-mode');
  document.body.classList.add(theme + '-mode');
}

function applyFontSize(size) {
  document.body.style.fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
}