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
      

      const isLoggedIn = liff.isLoggedIn();
      console.log('liff.isLoggedIn():', isLoggedIn);
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



    



    




    
    if (!lineUserId) {
      throw new Error('LINE ユーザーIDが取得できていません');
    }
    

    



    const headers = {};
    if (appMode !== 'local') {
      try {
        const accessToken = liff.getAccessToken();
        if (accessToken) {
          headers['x-line-access-token'] = accessToken;
        }
      } catch (tokenError) {
        console.error('LINE Access Token取得エラー:', tokenError);
      }
    }

    // IMPORTANT: クロスオリジン問題の解決
    // 問題: LINE環境（ngrokドメイン）から http://localhost:8000 へのAPI呼び出しが
    //       "Load failed" エラーで失敗していた（クロスオリジンリクエスト制限）
    // 解決: 相対パス /api/users/line-lookup/${lineUserId} を使用することで
    //       同一オリジンでのAPI呼び出しを実現し、クロスオリジン問題を回避
    const requestUrl = `/api/users/line-lookup/${lineUserId}`;

    let response;
    try {
      response = await fetch(requestUrl, {
        method: 'GET',
        headers
      });
    } catch (fetchError) {
      console.error('API呼び出しエラー:', fetchError);
      throw new Error(`API呼び出しに失敗しました: ${fetchError.message}`);
    }

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (textError) {
        errorText = 'レスポンステキスト取得不可';
      }
      throw new Error(`ユーザー情報の取得に失敗しました (${response.status}): ${errorText}`);
    }

    let responseText;
    try {
      responseText = await response.text();
    } catch (textError) {
      throw new Error(`レスポンステキストの取得に失敗しました: ${textError.message}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      throw new Error(`APIレスポンスのJSONパースに失敗しました: ${parseError.message}`);
    }

    if (data.success) {
      try {
        displayUserInfo(data.data);
      } catch (displayError) {
        console.error('displayUserInfo エラー:', displayError);
        throw displayError;
      }
    } else {
      throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    showError(error.message);
  }
}

function displayUserInfo(user) {
  const displayNameElement = document.getElementById('display-name');
  const lineUserIdElement = document.getElementById('line-user-id');
  const pointBalanceElement = document.getElementById('point-balance');
  
  if (displayNameElement) {
    displayNameElement.textContent = user.display_name || user.user_id;
  }
  
  if (lineUserIdElement) {
    const userIdToDisplay = (userProfile && userProfile.userId) ? userProfile.userId : (lineUserId || '-');
    lineUserIdElement.textContent = userIdToDisplay;
  }
  
  if (pointBalanceElement) {
    pointBalanceElement.textContent = user.points || 0;
  }
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
