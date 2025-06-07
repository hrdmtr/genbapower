let liffId = 'dummy_liff_id';
let appMode = 'local';

document.addEventListener('DOMContentLoaded', () => {
  fetchEnvironmentSettings();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('login-btn').addEventListener('click', handleLogin);
}

async function fetchEnvironmentSettings() {
  try {
    const response = await fetch('/api/server-settings');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        if (data.data.appMode) {
          appMode = data.data.appMode;
        }
        if (data.data.liffId) {
          liffId = data.data.liffId;
        }
      }
    }
    
    await initializeAuthentication();
  } catch (error) {
    console.error('環境設定の読み込みエラー:', error);
    await initializeAuthentication();
  }
}

async function initializeAuthentication() {
  try {
    console.log('=== 認証初期化 (login.js) ===');
    console.log('appMode:', appMode);
    console.log('liffId:', liffId);
    
    if (appMode === 'local' || liffId === 'dummy_liff_id') {
      const bypassReason = appMode === 'local' ? 'ローカルモード' : 'LIFF設定未完了';
      showAuthInfo(`${bypassReason}: 認証をバイパスします`);
      
      setTimeout(() => {
        window.location.href = '/member-top.html';
      }, 2000);
      return;
    }

    await liff.init({ liffId });
    
    if (liff.isLoggedIn()) {
      console.log('既にログイン済み: メンバートップに移動');
      window.location.href = '/member-top.html';
      return;
    }
    
    console.log('未認証: ログインボタンを表示');
    
  } catch (error) {
    console.error('認証初期化エラー:', error);
    showError('認証システムの初期化に失敗しました。');
  }
}

async function handleLogin() {
  try {
    showLoading();
    
    if (appMode === 'local' || liffId === 'dummy_liff_id') {
      window.location.href = '/member-top.html';
      return;
    }

    const redirectUri = window.location.origin + '/member-top.html';
    console.log('ログイン開始:', redirectUri);
    liff.login({ redirectUri });
    
  } catch (error) {
    console.error('ログインエラー:', error);
    showError('ログインに失敗しました。');
    hideLoading();
  }
}

function showAuthInfo(message) {
  const infoElement = document.getElementById('auth-info');
  document.getElementById('auth-message').textContent = message;
  infoElement.classList.remove('d-none');
}

function showError(message) {
  const errorElement = document.getElementById('auth-error');
  document.getElementById('error-message').textContent = message;
  errorElement.classList.remove('d-none');
}

function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}
