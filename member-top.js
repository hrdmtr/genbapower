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
        
        try {
          const debugResponse = await fetch('/api/debug/line-user-id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              lineUserId: lineUserId,
              displayName: userProfile.displayName,
              source: 'member-top.js'
            })
          });
          console.log('DEBUG POST送信成功:', await debugResponse.json());
        } catch (debugError) {
          console.error('DEBUG POST送信失敗:', debugError);
        }
        
        console.log('=== DEBUG POST完了後、fetchUserInfo呼び出し前 ===');
        console.log('lineUserId:', lineUserId);
        console.log('userProfile:', userProfile);
        
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
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'BEFORE_FETCH_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js (LINE environment)',
            additionalData: { appMode, apiBaseUrl }
          })
        });
      } catch (debugError) {
        console.error('Debug POST failed (before):', debugError);
      }
      
      await fetchUserInfo();
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'AFTER_FETCH_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js (LINE environment)'
          })
        });
      } catch (debugError) {
        console.error('Debug POST failed (after):', debugError);
      }
      
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
      
      try {
        const debugResponse = await fetch('/api/debug/line-user-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lineUserId: lineUserId,
            displayName: userProfile.displayName,
            source: 'member-top.js (development fallback)'
          })
        });
        console.log('DEBUG POST送信成功 (development fallback):', await debugResponse.json());
      } catch (debugError) {
        console.error('DEBUG POST送信失敗 (development fallback):', debugError);
      }
      
      console.log('=== fetchUserInfo呼び出し直前 (開発モード) ===');
      console.log('現在のlineUserId:', lineUserId);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'BEFORE_FETCH_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js (development fallback)',
            additionalData: { appMode, apiBaseUrl }
          })
        });
      } catch (debugError) {
        console.error('Debug POST failed (before):', debugError);
      }
      
      await fetchUserInfo();
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'AFTER_FETCH_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js (development fallback)'
          })
        });
      } catch (debugError) {
        console.error('Debug POST failed (after):', debugError);
      }
      
      console.log('=== fetchUserInfo呼び出し完了 (開発モード) ===');
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
    
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'FETCH_USER_INFO_STARTED',
          lineUserId: lineUserId,
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo()',
          additionalData: { appMode, apiBaseUrl }
        })
      });
    } catch (debugError) {
      console.error('Debug POST failed (fetchUserInfo started):', debugError);
    }
    
    console.log('=== lineUserId チェック ===');
    console.log('lineUserId value:', lineUserId);
    console.log('lineUserId type:', typeof lineUserId);
    console.log('lineUserId truthy:', !!lineUserId);
    
    if (!lineUserId) {
      console.error('=== LINE ユーザーIDが取得できていません ===');
      throw new Error('LINE ユーザーIDが取得できていません');
    }
    
    console.log('=== ヘッダー設定開始 ===');
    const headers = {};
    if (appMode !== 'local') {
      console.log('非ローカルモード: アクセストークン取得を試行');
      try {
        const accessToken = liff.getAccessToken();
        console.log('LINE Access Token取得:', accessToken ? 'あり' : 'なし');
        if (accessToken) {
          headers['x-line-access-token'] = accessToken;
          console.log('アクセストークンをヘッダーに設定');
        }
      } catch (tokenError) {
        console.error('=== アクセストークン取得エラー ===');
        console.error('tokenError:', tokenError);
        console.error('tokenError.message:', tokenError.message);
      }
    } else {
      console.log('ローカルモード: アクセストークンをスキップ');
    }
    console.log('=== ヘッダー設定完了 ===');
    
    const requestUrl = `${apiBaseUrl}/line-lookup/${lineUserId}`;
    console.log('API リクエスト URL:', requestUrl);
    console.log('リクエストヘッダー:', headers);
    
    console.log('=== fetch() 呼び出し直前 ===');
    console.log('requestUrl:', requestUrl);
    console.log('headers:', JSON.stringify(headers, null, 2));
    
    let response;
    try {
      response = await fetch(requestUrl, {
        headers
      });
      console.log('=== fetch() 呼び出し成功 ===');
      console.log('response object:', response);
    } catch (fetchError) {
      console.error('=== fetch() 呼び出しエラー ===');
      console.error('fetchError:', fetchError);
      console.error('fetchError.message:', fetchError.message);
      console.error('fetchError.stack:', fetchError.stack);
      throw new Error(`API呼び出しに失敗しました: ${fetchError.message}`);
    }
    
    console.log('API レスポンス状態:', response.status, response.statusText);
    console.log('API レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API エラーレスポンス:', errorText);
      throw new Error(`ユーザー情報の取得に失敗しました (${response.status}): ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log('API レスポンス生テキスト:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('API レスポンスデータ:', data);
    } catch (parseError) {
      console.error('JSON パースエラー:', parseError);
      console.error('レスポンステキスト:', responseText);
      throw new Error(`APIレスポンスのJSONパースに失敗しました: ${parseError.message}`);
    }
    
    if (data.success) {
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'BEFORE_DISPLAY_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { userData: data.data }
          })
        });
      } catch (debugError) {
        console.error('Debug POST failed (before displayUserInfo):', debugError);
      }
      
      displayUserInfo(data.data);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'AFTER_DISPLAY_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()'
          })
        });
      } catch (debugError) {
        console.error('Debug POST failed (after displayUserInfo):', debugError);
      }
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
  console.log('=== displayUserInfo 実行開始 ===');
  console.log('user data:', user);
  console.log('lineUserId variable:', lineUserId);
  console.log('userProfile:', userProfile);
  
  const displayNameElement = document.getElementById('display-name');
  const lineUserIdElement = document.getElementById('line-user-id');
  const pointBalanceElement = document.getElementById('point-balance');
  
  console.log('DOM elements found:', {
    displayName: !!displayNameElement,
    lineUserId: !!lineUserIdElement,
    pointBalance: !!pointBalanceElement
  });
  
  if (displayNameElement) {
    displayNameElement.textContent = user.display_name || user.user_id;
    console.log('Display name set to:', displayNameElement.textContent);
  }
  
  if (lineUserIdElement) {
    const userIdToDisplay = (userProfile && userProfile.userId) ? userProfile.userId : (lineUserId || '-');
    lineUserIdElement.textContent = userIdToDisplay;
  }
  
  if (pointBalanceElement) {
    pointBalanceElement.textContent = user.points || 0;
    console.log('Point balance set to:', pointBalanceElement.textContent);
  }
  
  console.log('=== displayUserInfo 実行完了 ===');
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
