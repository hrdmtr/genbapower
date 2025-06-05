let liffId = 'dummy_liff_id';
let lineUserId = null;
let userProfile = null;
let appMode = 'local';
let apiBaseUrl = '/api/line';

document.addEventListener('DOMContentLoaded', async () => {
  await fetchEnvironmentSettings();
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
      
      console.log('=== LINE認証状態チェック (profile.js) ===');
      const isLoggedIn = liff.isLoggedIn();
      console.log('liff.isLoggedIn():', isLoggedIn);
      console.log('現在のURL:', window.location.href);
      console.log('Referrer:', document.referrer);
      
      const cachedAuthState = checkAuthenticationState();
      console.log('キャッシュされた認証状態:', cachedAuthState);
      
      if (!isLoggedIn && !cachedAuthState) {
        console.log('未ログイン: メンバートップにリダイレクト');
        if (!document.referrer.includes('/member-top.html')) {
          console.log('直接アクセス: メンバートップページに移動');
          window.location.href = '/member-top.html';
          return;
        }
        const redirectUri = window.location.origin + '/member-top.html';
        console.log('リダイレクト先:', redirectUri);
        liff.login({ redirectUri });
        return;
      }
      
      if (isLoggedIn) {
        console.log('ログイン済み: 認証状態をキャッシュ');
        setAuthenticationState(true);
      }
      
      console.log('ログイン済み: プロフィール情報を表示');
      
      if (!liff.isInClient()) {
        document.getElementById('auth-error').classList.remove('d-none');
        document.getElementById('main-content').classList.add('d-none');
        hideLoading();
        return;
      }
      
      userProfile = await liff.getProfile();
      lineUserId = userProfile.userId;
      
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
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (appMode !== 'local' && liff.getAccessToken) {
      const accessToken = liff.getAccessToken();
      if (accessToken) {
        headers['x-line-access-token'] = accessToken;
        console.log('LINE Access Token added to request headers');
      }
    }
    
    console.log('Fetching user info with headers:', Object.keys(headers));
    console.log('Request URL:', `${apiBaseUrl}/user/${lineUserId}?user_id=${lineUserId}`);
    
    const response = await fetch(`${apiBaseUrl}/user/${lineUserId}?user_id=${lineUserId}`, {
      method: 'GET',
      headers: headers
    });
    
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
  
  let retryCount = 0;
  const maxRetries = 10;
  
  function tryGenerateQR() {
    if (typeof QRCode === 'undefined') {
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`QRCode library not loaded yet, retrying... (${retryCount}/${maxRetries})`);
        setTimeout(tryGenerateQR, 200);
        return;
      } else {
        console.error('QRCode library failed to load after maximum retries');
        qrcodeElement.innerHTML = '<p class="text-muted">QRコードの生成に失敗しました</p>';
        return;
      }
    }
    
    try {
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
          qrcodeElement.innerHTML = '<p class="text-muted">QRコードの生成に失敗しました</p>';
        } else {
          console.log('QRコード生成成功');
        }
      });
    } catch (error) {
      console.error('QRCode generation exception:', error);
      qrcodeElement.innerHTML = '<p class="text-muted">QRコードの生成に失敗しました</p>';
    }
  }
  
  tryGenerateQR();
}

function showError(message) {
  const errorElement = document.getElementById('auth-error');
  errorElement.textContent = message;
  errorElement.classList.remove('d-none');
}

function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function checkAuthenticationState() {
  const authState = sessionStorage.getItem('liff_auth_state');
  const currentTime = Date.now();
  
  if (authState) {
    const { timestamp, isAuthenticated } = JSON.parse(authState);
    if (currentTime - timestamp < 300000 && isAuthenticated) {
      console.log('キャッシュされた認証状態を使用');
      return true;
    }
  }
  
  return false;
}

function setAuthenticationState(isAuthenticated) {
  const authState = {
    timestamp: Date.now(),
    isAuthenticated: isAuthenticated
  };
  sessionStorage.setItem('liff_auth_state', JSON.stringify(authState));
}
