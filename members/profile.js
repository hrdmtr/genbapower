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
    console.log('=== Fetching Environment Settings ===');
    const response = await fetch('/api/server-settings');
    console.log('Server settings response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Server settings data:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        if (data.data.baseUrl) {
          apiBaseUrl = `${data.data.baseUrl}/api/line`;
          console.log('Updated apiBaseUrl:', apiBaseUrl);
        }
        
        if (data.data.appMode) {
          appMode = data.data.appMode;
          console.log('Updated appMode:', appMode);
        }
        
        if (data.data.liffId) {
          liffId = data.data.liffId;
          console.log('Updated liffId:', liffId);
        }
      }
    } else {
      console.error('Failed to fetch server settings:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('環境設定の読み込みエラー:', error);
  }
  
  console.log('=== Final Environment Settings ===');
  console.log('appMode:', appMode);
  console.log('liffId:', liffId);
  console.log('apiBaseUrl:', apiBaseUrl);
}

async function initializeLIFF() {
  try {
    showLoading();
    
    console.log('=== 認証初期化開始 ===');
    console.log('Initial appMode:', appMode);
    console.log('Initial liffId:', liffId);
    console.log('現在のURL:', window.location.href);
    console.log('Referrer:', document.referrer);
    
    if (appMode === 'local' || appMode === 'development' || liffId === 'dummy_liff_id') {
      console.log('認証バイパス条件検出:', { appMode, liffId });
      
      const bypassReason = appMode === 'local' ? 'ローカルモード' : (appMode === 'development' ? 'デベロップメントモード' : 'LIFF設定未完了');
      const alertClass = appMode === 'local' ? 'alert-info' : (appMode === 'development' ? 'alert-info' : 'alert-warning');
      
      document.getElementById('auth-error').innerHTML = `<div class="alert ${alertClass}">${bypassReason}: 認証をバイパスして動作しています</div>`;
      document.getElementById('auth-error').classList.remove('d-none');
      
      lineUserId = 'U1234567890abcdef';
      userProfile = {
        userId: lineUserId,
        displayName: `テストユーザー（${bypassReason}）`
      };
      
      await fetchUserInfo();
      hideLoading();
      return;
    }
    
    if (!liffId || liffId === 'dummy_liff_id') {
      console.log('無効なLIFF_ID: 認証をバイパス');
      document.getElementById('auth-error').innerHTML = '<div class="alert alert-warning">LIFF設定エラー: 認証をバイパスして動作しています</div>';
      document.getElementById('auth-error').classList.remove('d-none');
      
      lineUserId = 'U1234567890abcdef';
      userProfile = {
        userId: lineUserId,
        displayName: 'テストユーザー（LIFF設定エラー）'
      };
      await fetchUserInfo();
      hideLoading();
      return;
    }
    
    await liff.init({ liffId });
    
    console.log('=== LINE認証状態チェック (profile.js) ===');
    const isLoggedIn = liff.isLoggedIn();
    console.log('liff.isLoggedIn():', isLoggedIn);
    
    if (!isLoggedIn) {
      console.log('未ログイン: ログインページにリダイレクト');
      
      if (!document.referrer.includes('/member-top.html') && !document.referrer.includes('/login.html') && !document.referrer.includes('liff.line.me')) {
        console.log('直接アクセス: ログインページに移動');
        window.location.href = '/login.html';
        return;
      }
      
      if (document.referrer.includes('/member-top.html')) {
        console.log('メンバートップから: メンバートップに戻る');
        window.location.href = '/member-top.html';
        return;
      }
      
      const redirectUri = window.location.origin + '/member-top.html';
      console.log('リダイレクト先:', redirectUri);
      liff.login({ redirectUri });
      return;
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
  } catch (error) {
    console.error('LIFF初期化エラー:', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack,
      liffId: liffId,
      appMode: appMode
    });
    
    console.log('LIFF初期化失敗: 認証をバイパスしてプロフィール表示');
    document.getElementById('auth-error').innerHTML = '<div class="alert alert-warning">LIFF初期化失敗: 認証をバイパスして動作しています</div>';
    document.getElementById('auth-error').classList.remove('d-none');
    
    lineUserId = 'U1234567890abcdef';
    userProfile = {
      userId: lineUserId,
      displayName: 'テストユーザー（エラー回避）'
    };
    
    try {
      await fetchUserInfo();
    } catch (fetchError) {
      console.error('ユーザー情報取得もエラー:', fetchError);
      showError('認証とユーザー情報取得に失敗しました。管理者にお問い合わせください。');
    }
    
    hideLoading();
  }
}

async function fetchUserInfo() {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (appMode !== 'local' && appMode !== 'development' && liffId !== 'dummy_liff_id' && typeof liff !== 'undefined' && liff.getAccessToken) {
      try {
        const accessToken = liff.getAccessToken();
        if (accessToken) {
          headers['x-line-access-token'] = accessToken;
          console.log('LINE Access Token added to request headers');
        }
      } catch (liffError) {
        console.log('LIFF Access Token取得エラー (バイパスモードで続行):', liffError.message);
      }
    } else {
      console.log('認証バイパスモード: LINE Access Tokenをスキップ');
    }
    
    console.log('Fetching user info with headers:', Object.keys(headers));
    console.log('Request URL:', `${apiBaseUrl}/user/${lineUserId}?user_id=${lineUserId}`);
    
    const response = await fetch(`${apiBaseUrl}/user/${lineUserId}?user_id=${lineUserId}`, {
      method: 'GET',
      headers: headers
    });
    
    console.log('📡 APIレスポンス受信:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      console.error('❌ API Response Error:', response.status, response.statusText);
      throw new Error('ユーザー情報の取得に失敗しました');
    }
    
    const data = await response.json();
    console.log('📥 受信したAPIレスポンス:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ APIレスポンス成功 - ユーザー情報を表示');
      console.log('✅ 表示するユーザーデータ:', JSON.stringify(data.data, null, 2));
      displayUserInfo(data.data);
      generateQRCode(lineUserId);
    } else {
      console.error('❌ APIレスポンス失敗:', data.message);
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
        setTimeout(tryGenerateQR, 500);
        return;
      } else {
        console.error('QRCode library failed to load after maximum retries');
        qrcodeElement.innerHTML = '<div class="alert alert-warning"><small>QRコードライブラリの読み込み中...</small></div>';
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
  errorElement.innerHTML = `<div class="alert alert-info">${message}</div>`;
  errorElement.classList.remove('d-none');
}

function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}
