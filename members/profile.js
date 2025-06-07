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
    console.log('=== DEBUG: Fetching Environment Settings ===');
    const response = await fetch('/api/server-settings');
    console.log('Server settings response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('=== DEBUG: Server settings data ===');
      console.log('Server settings data:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log('=== DEBUG: Processing server settings ===');
        
        if (data.data.baseUrl) {
          const oldApiBaseUrl = apiBaseUrl;
          apiBaseUrl = `${data.data.baseUrl}/api/line`;
          console.log('Updated apiBaseUrl:', oldApiBaseUrl, '->', apiBaseUrl);
        }
        
        if (data.data.appMode) {
          const oldAppMode = appMode;
          appMode = data.data.appMode;
          console.log('Updated appMode:', oldAppMode, '->', appMode);
        }
        
        if (data.data.liffId) {
          const oldLiffId = liffId;
          liffId = data.data.liffId;
          console.log('Updated liffId:', oldLiffId, '->', liffId);
        }
      } else {
        console.log('=== DEBUG: Server settings response invalid ===');
        console.log('data.success:', data.success);
        console.log('data.data:', data.data);
      }
    } else {
      console.error('=== DEBUG: Failed to fetch server settings ===');
      console.error('Failed to fetch server settings:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('=== DEBUG: 環境設定の読み込みエラー ===');
    console.error('環境設定の読み込みエラー:', error);
  }
  
  console.log('=== DEBUG: Final Environment Settings ===');
  console.log('appMode:', appMode, '(type:', typeof appMode, ')');
  console.log('liffId:', liffId, '(type:', typeof liffId, ')');
  console.log('apiBaseUrl:', apiBaseUrl, '(type:', typeof apiBaseUrl, ')');
}

async function initializeLIFF() {
  try {
    showLoading();
    
    console.log('=== 認証初期化開始 ===');
    console.log('Initial appMode:', appMode);
    console.log('Initial liffId:', liffId);
    console.log('現在のURL:', window.location.href);
    console.log('Referrer:', document.referrer);
    
    console.log('=== DEBUG: バイパス条件チェック ===');
    console.log('appMode === "local":', appMode === 'local');
    console.log('liffId === "dummy_liff_id":', liffId === 'dummy_liff_id');
    console.log('バイパス条件 (appMode === "local" || liffId === "dummy_liff_id"):', (appMode === 'local' || liffId === 'dummy_liff_id'));
    
    if (appMode === 'local' || liffId === 'dummy_liff_id') {
      console.log('=== DEBUG: 認証バイパス条件検出 ===');
      console.log('認証バイパス条件検出:', { appMode, liffId });
      
      const bypassReason = appMode === 'local' ? 'ローカルモード' : 'LIFF設定未完了';
      const alertClass = appMode === 'local' ? 'alert-info' : 'alert-warning';
      
      console.log('=== DEBUG: バイパスUI更新開始 ===');
      console.log('bypassReason:', bypassReason);
      console.log('alertClass:', alertClass);
      
      document.getElementById('auth-error').innerHTML = `<div class="alert ${alertClass}">${bypassReason}: 認証をバイパスして動作しています</div>`;
      document.getElementById('auth-error').classList.remove('d-none');
      
      lineUserId = 'U1234567890abcdef';
      userProfile = {
        userId: lineUserId,
        displayName: `テストユーザー（${bypassReason}）`
      };
      
      console.log('=== DEBUG: バイパスモードでユーザー情報取得開始 ===');
      console.log('lineUserId:', lineUserId);
      console.log('userProfile:', userProfile);
      
      await fetchUserInfo();
      hideLoading();
      console.log('=== DEBUG: バイパスモード完了 ===');
      return;
    }
    
    console.log('=== DEBUG: 第2バイパス条件チェック ===');
    console.log('!liffId:', !liffId);
    console.log('liffId === "dummy_liff_id":', liffId === 'dummy_liff_id');
    console.log('第2バイパス条件 (!liffId || liffId === "dummy_liff_id"):', (!liffId || liffId === 'dummy_liff_id'));
    
    if (!liffId || liffId === 'dummy_liff_id') {
      console.log('=== DEBUG: 第2バイパス条件検出 ===');
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
      console.log('=== DEBUG: 第2バイパスモード完了 ===');
      return;
    }
    
    console.log('=== DEBUG: LIFF初期化開始 ===');
    console.log('liffId for init:', liffId);
    console.log('typeof liff:', typeof liff);
    console.log('liff object:', liff);
    
    await liff.init({ liffId });
    
    console.log('=== LINE認証状態チェック (profile.js) ===');
    const isLoggedIn = liff.isLoggedIn();
    console.log('liff.isLoggedIn():', isLoggedIn);
    
    const cachedAuthState = checkAuthenticationState();
    console.log('キャッシュされた認証状態:', cachedAuthState);
    
    if (!isLoggedIn && !cachedAuthState) {
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
    
    if (isLoggedIn) {
      console.log('ログイン済み: 認証状態をキャッシュ');
      setAuthenticationState(true);
    }
    
    console.log('ログイン済み: プロフィール情報を表示');
    
    const isInBypassMode = (appMode === 'local' || liffId === 'dummy_liff_id');
    const isDevelopmentMode = (appMode === 'development');
    
    console.log('=== DEBUG: LINE クライアントチェック ===');
    console.log('liff.isInClient():', liff.isInClient());
    console.log('isInBypassMode:', isInBypassMode);
    console.log('isDevelopmentMode:', isDevelopmentMode);
    console.log('Should skip client check:', (isInBypassMode || isDevelopmentMode));
    
    if (!liff.isInClient() && !isInBypassMode && !isDevelopmentMode) {
      console.log('=== DEBUG: LINEクライアント外アクセス - コンテンツ非表示 ===');
      document.getElementById('auth-error').innerHTML = '<div class="alert alert-warning">この機能はLINEアプリ内でのみご利用いただけます。LINEアプリからアクセスしてください。</div>';
      document.getElementById('auth-error').classList.remove('d-none');
      document.getElementById('main-content').classList.add('d-none');
      hideLoading();
      return;
    }
    
    console.log('=== DEBUG: LINEクライアントチェック通過 - コンテンツ表示継続 ===');
    
    userProfile = await liff.getProfile();
    lineUserId = userProfile.userId;
    
    await fetchUserInfo();
    hideLoading();
  } catch (error) {
    console.error('=== DEBUG: LIFF初期化エラー ===');
    console.error('LIFF初期化エラー:', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack,
      liffId: liffId,
      appMode: appMode,
      errorName: error.name,
      errorCode: error.code
    });
    
    console.log('=== DEBUG: エラー回復モード開始 ===');
    console.log('LIFF初期化失敗: 認証をバイパスしてプロフィール表示');
    document.getElementById('auth-error').innerHTML = '<div class="alert alert-warning">LIFF初期化失敗: 認証をバイパスして動作しています</div>';
    document.getElementById('auth-error').classList.remove('d-none');
    
    lineUserId = 'U1234567890abcdef';
    userProfile = {
      userId: lineUserId,
      displayName: 'テストユーザー（エラー回避）'
    };
    
    console.log('=== DEBUG: エラー回復モードでユーザー情報取得開始 ===');
    try {
      await fetchUserInfo();
      console.log('=== DEBUG: エラー回復モード - ユーザー情報取得成功 ===');
    } catch (fetchError) {
      console.error('=== DEBUG: エラー回復モード - ユーザー情報取得もエラー ===');
      console.error('ユーザー情報取得もエラー:', fetchError);
      showError('認証とユーザー情報取得に失敗しました。管理者にお問い合わせください。');
    }
    
    hideLoading();
    console.log('=== DEBUG: エラー回復モード完了 ===');
  }
}

async function fetchUserInfo() {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (appMode !== 'local' && liffId !== 'dummy_liff_id' && typeof liff !== 'undefined' && liff.getAccessToken) {
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
  
  document.getElementById('user-status').textContent = user.status || 'ACTIVE';
  
  const registrationDate = user.registration_date ? new Date(user.registration_date).toLocaleDateString('ja-JP') : '-';
  document.getElementById('registration-date').textContent = registrationDate;
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
