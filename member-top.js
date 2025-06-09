let liffId = 'dummy_liff_id';
let lineUserId = null;
let userProfile = null;
let appMode = 'local';
let apiBaseUrl = '/api/users';

document.addEventListener('DOMContentLoaded', () => {
  fetchEnvironmentSettings();
  initializeLIFF();
});

async function fetchEnvironmentSettings() {
  try {
    const response = await fetch('/api/server-settings');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        if (data.data.baseUrl) {
          apiBaseUrl = `${data.data.baseUrl}/api/users`;
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
      
      console.log('=== LINE認証状態チェック (member-top.js) ===');
      const isLoggedIn = liff.isLoggedIn();
      console.log('liff.isLoggedIn():', isLoggedIn);
      console.log('現在のURL:', window.location.href);
      console.log('Referrer:', document.referrer);
      
      const cachedAuthState = checkAuthenticationState();
      console.log('キャッシュされた認証状態:', cachedAuthState);
      
      if (!isLoggedIn && !cachedAuthState) {
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
        console.log('ログイン済み: 認証状態をキャッシュ');
        setAuthenticationState(true);
      }
      
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
    const headers = {};
    if (appMode !== 'local') {
      const accessToken = liff.getAccessToken();
      if (accessToken) {
        headers['x-line-access-token'] = accessToken;
      }
    }
    
    const response = await fetch(`${apiBaseUrl}/line-lookup/${lineUserId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error('ユーザー情報の取得に失敗しました');
    }
    
    const data = await response.json();
    
    if (data.success) {
      displayUserInfo(data.data);
    } else {
      throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    showError(error.message);
  }
}

function displayUserInfo(user) {
  document.getElementById('display-name').textContent = user.display_name || user.user_id;
  document.getElementById('line-user-id').textContent = lineUserId || '-';
  document.getElementById('point-balance').textContent = user.points || 0;
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
