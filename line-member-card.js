
let liffId = 'dummy_liff_id'; // 実際のLIFF IDに置き換える
let lineUserId = null;
let userProfile = null;
let appMode = 'local'; // 'local' または 'development'
let apiBaseUrl = '/api/line'; // APIのベースURL
let transactions = [];
let transactionPage = 0;
let transactionLimit = 10;
let hasMoreTransactions = true;
let balanceChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await fetchEnvironmentSettings();
  
  setupEventListeners();
  
  initializeLIFF();
});

async function fetchEnvironmentSettings() {
  try {
    const response = await fetch('/api/server-settings');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        if (data.data.baseUrl) {
          apiBaseUrl = `${data.data.baseUrl}/api/line`;
        }
        
        if (data.data.appMode) {
          appMode = data.data.appMode;
        }
        
        if (data.data.liffId) {
          liffId = data.data.liffId;
        }
      }
    }
  } catch (error) {
    console.error('環境設定の読み込みエラー:', error);
  }
}

function setupEventListeners() {
  document.getElementById('scan-qr-btn').addEventListener('click', startQRScanner);
  document.getElementById('cancel-scan-btn').addEventListener('click', stopQRScanner);
  document.getElementById('charge-next-btn').addEventListener('click', validateTicket);
  document.getElementById('back-to-step1-btn').addEventListener('click', backToStep1);
  document.getElementById('confirm-charge-btn').addEventListener('click', executeCharge);
  document.getElementById('back-to-home-btn').addEventListener('click', resetChargeFlow);
  
  document.getElementById('history-tab').addEventListener('click', () => {
    if (transactions.length === 0) {
      loadTransactions();
    }
  });
  
  document.getElementById('load-more-btn').addEventListener('click', loadMoreTransactions);
}

async function initializeLIFF() {
  try {
    showLoading();
    
    if (appMode === 'local') {
      console.log('ローカルモード: LIFF認証をバイパスします');
      document.getElementById('auth-error').classList.remove('d-none');
      
      lineUserId = 'U1234567890abcdef';
      userProfile = {
        userId: lineUserId,
        displayName: 'テストユーザー'
      };
      
      await fetchUserInfo();
      hideLoading();
    } else {
      await liff.init({ liffId });
      
      console.log('=== LINE認証状態チェック (line-member-card.js) ===');
      const isLoggedIn = liff.isLoggedIn();
      console.log('liff.isLoggedIn():', isLoggedIn);
      console.log('現在のURL:', window.location.href);
      console.log('Referrer:', document.referrer);
      
      if (!isLoggedIn) {
        console.log('未ログイン: ログインページにリダイレクト');
        
        if (!document.referrer.includes('/login.html') && !document.referrer.includes('liff.line.me')) {
          console.log('直接アクセス: ログインページに移動');
          window.location.href = '/login.html';
          return;
        }
        
        const redirectUri = window.location.origin + '/member-top.html';
        console.log('リダイレクト先:', redirectUri);
        liff.login({ redirectUri });
        return;
      }
      
      if (isLoggedIn) {
        console.log('ログイン済み: 実際のLIFF認証状態を使用');
      }
      
      if (!liff.isInClient()) {
        document.getElementById('auth-error').classList.remove('d-none');
        document.getElementById('main-content').classList.add('d-none');
        hideLoading();
        return;
      }
      
      userProfile = await liff.getProfile();
      lineUserId = userProfile.userId;
      console.log('LINE プロフィール取得成功 (line-member-card):', {
        userId: lineUserId,
        displayName: userProfile.displayName
      });
      
      try {
        const debugResponse = await fetch('/api/debug/line-user-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lineUserId: lineUserId,
            displayName: userProfile.displayName,
            source: 'line-member-card.js'
          })
        });
        console.log('DEBUG POST送信成功:', await debugResponse.json());
      } catch (debugError) {
        console.error('DEBUG POST送信失敗:', debugError);
      }
      
      await fetchUserInfo();
      hideLoading();
    }
  } catch (error) {
    console.error('LIFF初期化エラー:', error);
    document.getElementById('auth-error').classList.remove('d-none');
    document.getElementById('auth-error').textContent = `エラーが発生しました: ${error.message}`;
    hideLoading();
  }
}

async function fetchUserInfo() {
  try {
    const response = await fetch(`${apiBaseUrl}/user/${lineUserId}?user_id=${lineUserId}`);
    
    if (!response.ok) {
      throw new Error('ユーザー情報の取得に失敗しました');
    }
    
    const data = await response.json();
    
    if (data.success) {
      displayUserInfo(data.data);
      
      generateQRCode(lineUserId);
    } else {
      throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    showError(error.message);
  }
}

function displayUserInfo(user) {
  document.getElementById('display-name').textContent = user.display_name;
  document.getElementById('member-id').textContent = user.user_id;
  document.getElementById('point-balance').textContent = user.point_balance;
  
  const rankBadge = document.getElementById('rank-badge');
  rankBadge.textContent = user.member_rank.toUpperCase();
  rankBadge.className = 'rank-badge';
  
  switch (user.member_rank) {
    case 'bronze':
      rankBadge.classList.add('rank-bronze');
      break;
    case 'silver':
      rankBadge.classList.add('rank-silver');
      break;
    case 'gold':
      rankBadge.classList.add('rank-gold');
      break;
  }
}

function generateQRCode(userId) {
  const qrcodeElement = document.getElementById('qrcode');
  qrcodeElement.innerHTML = '';
  
  QRCode.toCanvas(qrcodeElement, userId, {
    width: 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  }, function(error) {
    if (error) {
      console.error('QRコード生成エラー:', error);
    }
  });
}

async function startQRScanner() {
  try {
    document.getElementById('charge-step-1').classList.add('d-none');
    document.getElementById('qr-scanner').classList.remove('d-none');
    
    const constraints = {
      video: {
        facingMode: 'environment'
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoElement = document.getElementById('camera-view');
    videoElement.srcObject = stream;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let scanning = true;
    
    const scanQRCode = () => {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && scanning) {
        canvas.height = videoElement.videoHeight;
        canvas.width = videoElement.videoWidth;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        
        if (appMode === 'local') {
          setTimeout(() => {
            if (scanning) {
              stopQRScanner();
              document.getElementById('ticket-id').value = 'TICKET123456789';
              document.getElementById('passcode').value = '123456';
            }
          }, 5000);
        }
        
        requestAnimationFrame(scanQRCode);
      } else if (scanning) {
        requestAnimationFrame(scanQRCode);
      }
    };
    
    scanQRCode();
  } catch (error) {
    console.error('カメラアクセスエラー:', error);
    stopQRScanner();
    showError('カメラへのアクセスができませんでした');
  }
}

function stopQRScanner() {
  const videoElement = document.getElementById('camera-view');
  if (videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    videoElement.srcObject = null;
  }
  
  document.getElementById('qr-scanner').classList.add('d-none');
  document.getElementById('charge-step-1').classList.remove('d-none');
}

async function validateTicket() {
  const ticketId = document.getElementById('ticket-id').value.trim();
  const passcode = document.getElementById('passcode').value.trim();
  
  if (!ticketId || !passcode) {
    showError('チケットIDと認証コードを入力してください');
    return;
  }
  
  try {
    showLoading();
    
    if (appMode === 'local' && ticketId === 'TICKET123456789' && passcode === '123456') {
      document.getElementById('confirm-ticket-id').textContent = ticketId;
      document.getElementById('confirm-amount').textContent = '1,000';
      
      document.getElementById('charge-step-1').classList.add('d-none');
      document.getElementById('charge-step-2').classList.remove('d-none');
      hideLoading();
      return;
    }
    
    
    setTimeout(() => {
      document.getElementById('confirm-ticket-id').textContent = ticketId;
      document.getElementById('confirm-amount').textContent = '1,000';
      
      document.getElementById('charge-step-1').classList.add('d-none');
      document.getElementById('charge-step-2').classList.remove('d-none');
      hideLoading();
    }, 1000);
  } catch (error) {
    console.error('チケット検証エラー:', error);
    showError(error.message);
    hideLoading();
  }
}

async function executeCharge() {
  const ticketId = document.getElementById('ticket-id').value.trim();
  const passcode = document.getElementById('passcode').value.trim();
  
  try {
    showLoading();
    
    const response = await fetch(`${apiBaseUrl}/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: lineUserId,
        ticket_id: ticketId,
        passcode: passcode
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      document.getElementById('complete-amount').textContent = data.charged_amount.toLocaleString();
      document.getElementById('new-balance').textContent = data.new_balance.toLocaleString();
      
      document.getElementById('point-balance').textContent = data.new_balance;
      
      const currentRank = document.getElementById('rank-badge').textContent.toLowerCase();
      if (data.new_rank !== currentRank) {
        document.getElementById('rank-up-message').classList.remove('d-none');
        document.getElementById('new-rank').textContent = data.new_rank.toUpperCase();
        
        const rankBadge = document.getElementById('rank-badge');
        rankBadge.textContent = data.new_rank.toUpperCase();
        rankBadge.className = 'rank-badge';
        
        switch (data.new_rank) {
          case 'bronze':
            rankBadge.classList.add('rank-bronze');
            break;
          case 'silver':
            rankBadge.classList.add('rank-silver');
            break;
          case 'gold':
            rankBadge.classList.add('rank-gold');
            break;
        }
      } else {
        document.getElementById('rank-up-message').classList.add('d-none');
      }
      
      document.getElementById('charge-step-2').classList.add('d-none');
      document.getElementById('charge-step-3').classList.remove('d-none');
      
      transactions = [];
      transactionPage = 0;
      hasMoreTransactions = true;
    } else {
      throw new Error(data.message || 'チャージに失敗しました');
    }
    
    hideLoading();
  } catch (error) {
    console.error('チャージ実行エラー:', error);
    showError(error.message);
    backToStep1();
    hideLoading();
  }
}

function resetChargeFlow() {
  document.getElementById('ticket-id').value = '';
  document.getElementById('passcode').value = '';
  document.getElementById('charge-error').classList.add('d-none');
  document.getElementById('charge-step-3').classList.add('d-none');
  document.getElementById('charge-step-1').classList.remove('d-none');
}

function backToStep1() {
  document.getElementById('charge-step-2').classList.add('d-none');
  document.getElementById('charge-step-1').classList.remove('d-none');
}

async function loadTransactions() {
  try {
    document.getElementById('loading-transactions').classList.remove('d-none');
    
    const response = await fetch(`${apiBaseUrl}/transactions/${lineUserId}?limit=${transactionLimit}&offset=${transactionPage * transactionLimit}&user_id=${lineUserId}`);
    
    if (!response.ok) {
      throw new Error('取引履歴の取得に失敗しました');
    }
    
    const data = await response.json();
    
    if (data.success) {
      transactions = [...transactions, ...data.transactions];
      
      displayTransactions(data.transactions);
      
      hasMoreTransactions = transactions.length < data.total;
      document.getElementById('load-more-container').classList.toggle('d-none', !hasMoreTransactions);
      
      updateBalanceChart();
      
      transactionPage++;
    } else {
      throw new Error(data.message || '取引履歴の取得に失敗しました');
    }
    
    document.getElementById('loading-transactions').classList.add('d-none');
  } catch (error) {
    console.error('取引履歴取得エラー:', error);
    document.getElementById('loading-transactions').classList.add('d-none');
    document.getElementById('transaction-list').innerHTML += `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill"></i> ${error.message}
      </div>
    `;
  }
}

function loadMoreTransactions() {
  if (hasMoreTransactions) {
    loadTransactions();
  }
}

function displayTransactions(newTransactions) {
  if (newTransactions.length === 0 && transactions.length === 0) {
    document.getElementById('transaction-list').innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle-fill"></i> 取引履歴はありません
      </div>
    `;
    return;
  }
  
  if (transactions.length === newTransactions.length) {
    document.getElementById('transaction-list').innerHTML = '';
  }
  
  const transactionList = document.getElementById('transaction-list');
  
  newTransactions.forEach(transaction => {
    const date = new Date(transaction.created_at);
    const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    let transactionClass = 'transaction-item';
    let icon = '';
    let amountText = '';
    
    switch (transaction.type) {
      case 'charge':
        transactionClass += ' transaction-charge';
        icon = '<i class="bi bi-plus-circle-fill text-success"></i>';
        amountText = `<span class="text-success">+${transaction.amount.toLocaleString()} pt</span>`;
        break;
      case 'use':
        transactionClass += ' transaction-use';
        icon = '<i class="bi bi-dash-circle-fill text-danger"></i>';
        amountText = `<span class="text-danger">-${transaction.amount.toLocaleString()} pt</span>`;
        break;
      case 'expire':
        transactionClass += ' transaction-expire';
        icon = '<i class="bi bi-x-circle-fill text-secondary"></i>';
        amountText = `<span class="text-secondary">-${transaction.amount.toLocaleString()} pt</span>`;
        break;
    }
    
    const transactionItem = document.createElement('div');
    transactionItem.className = transactionClass;
    transactionItem.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          ${icon} ${transaction.description}
          <div class="text-muted small">${formattedDate}</div>
        </div>
        <div class="text-end">
          ${amountText}
          <div class="text-muted small">残高: ${transaction.balance_after.toLocaleString()} pt</div>
        </div>
      </div>
    `;
    
    transactionList.appendChild(transactionItem);
  });
}

function updateBalanceChart() {
  if (transactions.length === 0) return;
  
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  const labels = sortedTransactions.map(t => {
    const date = new Date(t.created_at);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  });
  
  const balances = sortedTransactions.map(t => t.balance_after);
  
  if (balanceChart) {
    balanceChart.destroy();
  }
  
  const ctx = document.getElementById('balance-chart').getContext('2d');
  balanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'ポイント残高',
        data: balances,
        borderColor: '#06c755',
        backgroundColor: 'rgba(6, 199, 85, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `残高: ${context.raw.toLocaleString()} pt`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString() + ' pt';
            }
          }
        }
      }
    }
  });
}

function showError(message) {
  const errorElement = document.getElementById('charge-error');
  errorElement.textContent = message;
  errorElement.classList.remove('d-none');
}

function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}
