let liffId = 'dummy_liff_id';
let lineUserId = null;
let userProfile = null;
let appMode = 'local';
let apiBaseUrl = '/api/users';

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
      
      try {
        console.log('=== LINE プロフィール取得開始 ===');
        userProfile = await liff.getProfile();
        lineUserId = userProfile.userId;
        console.log('LINE プロフィール取得成功:', {
          userId: lineUserId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl
        });
      } catch (profileError) {
        console.error('=== LINE プロフィール取得エラー ===');
        console.error('Error:', profileError);
        console.error('LIFF状態:', {
          isLoggedIn: liff.isLoggedIn(),
          isInClient: liff.isInClient(),
          context: liff.getContext()
        });
        
        showError(`LINEプロフィール取得に失敗しました: ${profileError.message}`);
        hideLoading();
        return;
      }
      
      await fetchUserInfo();
      hideLoading();
    }
  } catch (error) {
    console.error('LIFF初期化エラー:', error);
    
    if (appMode === 'development' && (error.message.includes('channel not found') || liffId === 'dummy_liff_id')) {
      console.log('開発モード: ダミーLIFF IDのため、テストデータを使用します');
      
      lineUserId = 'U1234567890abcdef';
      userProfile = {
        userId: lineUserId,
        displayName: 'テストユーザー（開発モード）'
      };
      
      await fetchUserInfo();
      hideLoading();
      return;
    }
    
    document.getElementById('auth-error').classList.remove('d-none');
    document.getElementById('auth-error').textContent = `エラーが発生しました: ${error.message}`;
    hideLoading();
  }
}

async function fetchUserInfo() {
  try {
    console.log('=== ユーザー情報取得開始 ===');
    console.log('lineUserId:', lineUserId);
    console.log('appMode:', appMode);
    console.log('apiBaseUrl:', apiBaseUrl);
    
    if (!lineUserId) {
      throw new Error('LINE ユーザーIDが取得できていません');
    }
    
    const headers = {};
    if (appMode !== 'local') {
      const accessToken = liff.getAccessToken();
      console.log('LINE Access Token取得:', accessToken ? 'あり' : 'なし');
      if (accessToken) {
        headers['x-line-access-token'] = accessToken;
      }
    }
    
    const requestUrl = `${apiBaseUrl}/line-lookup/${lineUserId}`;
    console.log('API リクエスト URL:', requestUrl);
    console.log('リクエストヘッダー:', headers);
    
    const response = await fetch(requestUrl, {
      headers
    });
    
    console.log('API レスポンス状態:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API エラーレスポンス:', errorText);
      throw new Error(`ユーザー情報の取得に失敗しました (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API レスポンスデータ:', data);
    
    if (data.success) {
      displayUserInfo(data.data);
    } else {
      throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
  } catch (error) {
    console.error('=== ユーザー情報取得エラー詳細 ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
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
