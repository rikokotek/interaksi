let myAnalyticsChart = null;

async function renderAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    
    const labels = Object.keys(data).sort(); // Sort dates chronologically
    
    if (labels.length === 0) {
      document.getElementById('analyticsChart').parentElement.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);">Belum ada data analitik. Mulai live untuk mencatat statistik harian!</div>';
      return;
    }
    
    const diamondsData = [];
    const donateData = [];
    
    labels.forEach(date => {
      const d = data[date];
      diamondsData.push(d.diamonds || 0);
      const totalDonate = (d.saweria || 0) + (d.sociabuzz || 0) + (d.trakteer || 0);
      donateData.push(totalDonate);
    });
    
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;
    
    if (myAnalyticsChart) {
      myAnalyticsChart.destroy();
    }
    
    myAnalyticsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(l => {
          const date = new Date(l);
          return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }),
        datasets: [
          {
            label: 'Diamonds TikTok',
            data: diamondsData,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.2)',
            yAxisID: 'y',
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#a855f7',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#a855f7'
          },
          {
            label: 'Donasi External (Rp)',
            data: donateData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            yAxisID: 'y1',
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#10b981'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          tooltip: {
            backgroundColor: 'rgba(28,28,30,0.9)',
            titleColor: '#fff',
            bodyColor: '#e5e5ea',
            borderColor: '#3a3a3c',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('id-ID').format(context.parsed.y);
                }
                return label;
              }
            }
          },
          legend: {
            labels: { 
              color: '#ebebf5',
              font: { family: "'Inter', sans-serif", size: 12 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: '#8e8e93', font: { family: "'Inter', sans-serif" } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Diamonds', color: '#a855f7', font: { size: 11, weight: 'bold' } },
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: '#8e8e93', callback: function(value) { return new Intl.NumberFormat('id-ID').format(value); } }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Rupiah (Rp)', color: '#10b981', font: { size: 11, weight: 'bold' } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#8e8e93', callback: function(value) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
              return value;
            } }
          }
        }
      }
    });
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

window.renderAnalytics = renderAnalytics;
