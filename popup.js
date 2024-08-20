let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  updateScreenTimeStats();
  setupTabNavigation();
});

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      showTab(tabName);
    });
  });
}

function showTab(tabName) {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-tab') === tabName) {
      button.classList.add('active');
    }
  });

  tabPanes.forEach(pane => {
    pane.classList.remove('active');
    if (pane.id === `${tabName}-tab`) {
      pane.classList.add('active');
    }
  });
}

function updateScreenTimeStats() {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(today);
  const monthStart = getMonthStart(today);

  chrome.storage.local.get(['screenTime'], result => {
    const screenTime = result.screenTime || {};
    const todayData = screenTime[today] || {};
    const weekData = aggregateData(screenTime, weekStart, today);
    const monthData = aggregateData(screenTime, monthStart, today);

    updateTotalTime(todayData, 'today');
    updateTotalTime(weekData, 'week');
    updateTotalTime(monthData, 'month');
    updateWebsiteList(todayData, 'today');
    updateWebsiteList(weekData, 'week');
    updateWebsiteList(monthData, 'month');
    updateUsageChart(todayData, 'daily-chart');
    updateUsageChart(weekData, 'weekly-chart');
    updateUsageChart(monthData, 'monthly-chart');
  });
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

function getMonthStart(date) {
  return date.substring(0, 7) + '-01';
}

function aggregateData(screenTime, startDate, endDate) {
  const aggregatedData = {};
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateString = current.toISOString().split('T')[0];
    const dayData = screenTime[dateString] || {};

    for (const [url, time] of Object.entries(dayData)) {
      if (!aggregatedData[url]) {
        aggregatedData[url] = 0;
      }
      aggregatedData[url] += time;
    }

    current.setDate(current.getDate() + 1);
  }

  return aggregatedData;
}

function updateTotalTime(data, period) {
  const totalTime = Object.values(data).reduce((sum, time) => sum + time, 0);
  const hours = Math.floor(totalTime / 3600000);
  const minutes = Math.floor((totalTime % 3600000) / 60000);

  document.getElementById(`total-time-${period}`).textContent = `${hours}h ${minutes}m`;
}

function updateWebsiteList(data, period) {
  const websiteList = document.getElementById(`website-list-${period}`);
  websiteList.innerHTML = '';

  Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .forEach(([url, time]) => {
      const minutes = Math.round(time / 60000);
      const listItem = document.createElement('div');
      listItem.className = 'website-item';
      listItem.innerHTML = `
        <span class="website-url">${url}</span>
        <span class="website-time">${minutes} min</span>
      `;
      websiteList.appendChild(listItem);
    });
}

function updateUsageChart(data, chartId) {
  const ctx = document.getElementById(chartId);
  
  if (!ctx) {
    console.error(`Canvas with id ${chartId} not found`);
    return;
  }

  const chartData = {
    labels: Object.keys(data),
    datasets: [{
      data: Object.values(data),
      backgroundColor: generateColors(Object.keys(data).length)
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    }
  };

  if (charts[chartId]) {
    charts[chartId].data = chartData;
    charts[chartId].update();
  } else {
    charts[chartId] = new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: chartOptions
    });
  }
}

function generateColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 137.508) % 360; // Use golden angle approximation
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
}

document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});