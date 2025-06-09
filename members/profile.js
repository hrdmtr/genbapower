let liffId = 'dummy_liff_id';
let lineUserId = null;
let userProfile = null;
let appMode = 'local';
let apiBaseUrl = 'http://localhost:8000';

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
          apiBaseUrl = data.data.baseUrl;
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
    
    if (isLoggedIn) {
      console.log('ログイン済み: 実際のLIFF認証状態を使用');
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
    console.log('=== DEBUG: fetchUserInfo開始 ===');
    console.log('lineUserId:', lineUserId);
    console.log('apiBaseUrl:', apiBaseUrl);
    console.log('appMode:', appMode);
    
    let headers = {
      'Content-Type': 'application/json'
    };
    
    if (appMode !== 'local' && liffId !== 'dummy_liff_id' && typeof liff !== 'undefined' && liff.getAccessToken) {
      try {
        const accessToken = liff.getAccessToken();
        if (accessToken) {
          headers['x-line-access-token'] = accessToken;
          console.log('LINE Access Token added to request headers');
          console.log('Token length:', accessToken.length);
          console.log('Token prefix:', accessToken.substring(0, 10) + '...');
        } else {
          console.log('LINE Access Token取得失敗: nullまたは空');
          if (typeof liff !== 'undefined' && liff.isInClient && liff.isInClient()) {
            console.log('LINE環境でトークンが無効 - 再ログインを試行');
            throw new Error('LINE認証トークンが無効です。再ログインが必要です。');
          }
        }
      } catch (liffError) {
        console.log('LIFF Access Token取得エラー:', liffError.message);
        if (typeof liff !== 'undefined' && liff.isInClient && liff.isInClient()) {
          throw new Error('LINE認証に失敗しました: ' + liffError.message);
        }
        console.log('開発環境のため認証エラーを無視して続行');
      }
    } else {
      console.log('認証バイパスモード: LINE Access Tokenをスキップ');
    }
    
    console.log('=== DEBUG: API呼び出し開始 ===');
    const requestUrl = `${apiBaseUrl}/api/line/user/${lineUserId}?user_id=${lineUserId}`;
    console.log('Request URL:', requestUrl);
    console.log('Request method: GET');
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    console.log('Current URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    console.log('Referrer:', document.referrer);
    
    const startTime = Date.now();
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: headers,
      mode: 'cors',
      credentials: 'include'
    });
    const endTime = Date.now();
    
    console.log('=== DEBUG: API レスポンス受信 ===');
    console.log('Response time:', (endTime - startTime) + 'ms');
    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    console.log('Response ok:', response.ok);
    console.log('Response type:', response.type);
    console.log('Response url:', response.url);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('=== API エラーレスポンス ===');
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
        console.error('Parsed error response:', JSON.stringify(parsedError, null, 2));
      } catch (parseError) {
        console.error('Could not parse error response as JSON');
        parsedError = { message: errorText };
      }
      
      throw new Error(`HTTP ${response.status}: ${parsedError.message || errorText}`);
    }
    
    const responseText = await response.text();
    console.log('=== DEBUG: Raw response text ===');
    console.log('Response body length:', responseText.length);
    console.log('Response body preview:', responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('=== DEBUG: Parsed API レスポンスデータ ===');
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Raw response:', responseText);
      throw new Error('サーバーから無効なJSONレスポンスを受信しました');
    }
    
    if (!data.success || !data.data) {
      console.error('Invalid API response structure:', data);
      throw new Error(`Invalid response structure: success=${data.success}, data=${!!data.data}`);
    }
    
    const userData = data.data;
    console.log('=== DEBUG: ユーザーデータ処理 ===');
    console.log('User data:', JSON.stringify(userData, null, 2));
    
    console.log('=== DEBUG: DOM要素更新開始 ===');
    const elements = {
      'display-name': userData.display_name || '-',
      'member-id': userData.user_id || '-',
      'point-balance': userData.point_balance || '0',
      'member-rank': userData.member_rank || '-',
      'total-charged': userData.total_charged || '0',
      'status': userData.status || '-',
      'registration-date': userData.registration_date ? 
        new Date(userData.registration_date).toLocaleDateString('ja-JP') : '-',
      'memo': userData.memo || '-'
    };
    
    for (const [elementId, value] of Object.entries(elements)) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value;
        console.log(`Updated ${elementId}:`, value);
      } else {
        console.warn(`Element not found: ${elementId}`);
      }
    }
    
    console.log('=== DEBUG: プロフィール表示完了 ===');
    
    if (data.success && data.data) {
      console.log('ユーザー情報の表示が完了しました');
      return data.data;
    } else {
      console.error('Invalid response structure:', data);
      throw new Error(`Invalid response structure: success=${data.success}, data=${!!data.data}`);
    }
  } catch (error) {
    console.error('=== DEBUG: fetchUserInfo エラー詳細 ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request URL was:', `${apiBaseUrl}/api/line/user/${lineUserId}?user_id=${lineUserId}`);
    console.error('Request headers were:', JSON.stringify({
      'Content-Type': 'application/json'
    }, null, 2));
    console.error('appMode:', appMode);
    console.error('lineUserId:', lineUserId);
    console.error('apiBaseUrl:', apiBaseUrl);
    console.error('Current timestamp:', new Date().toISOString());
    
    let userFriendlyMessage = 'ユーザー情報の取得に失敗しました';
    
    if (error.message.includes('Failed to fetch')) {
      userFriendlyMessage = 'ネットワークエラー: サーバーに接続できませんでした';
    } else if (error.message.includes('401')) {
      userFriendlyMessage = '認証エラー: LINE認証が無効です';
    } else if (error.message.includes('403')) {
      userFriendlyMessage = '権限エラー: アクセス権限がありません';
    } else if (error.message.includes('404')) {
      userFriendlyMessage = 'ユーザーが見つかりません';
    } else if (error.message.includes('500')) {
      userFriendlyMessage = 'サーバーエラーが発生しました';
    } else if (error.message.includes('JSON')) {
      userFriendlyMessage = 'サーバーレスポンス形式エラー';
    }
    
    showError(userFriendlyMessage + ' (詳細: ' + error.message + ')');
  }
}

function displayUserInfo(user) {
  console.log('=== DEBUG: displayUserInfo開始 ===');
  console.log('Received user data:', user);
  console.log('User data type:', typeof user);
  console.log('User data keys:', Object.keys(user || {}));
  
  try {
    console.log('=== DEBUG: 各フィールドの更新開始 ===');
    
    const displayName = user.display_name || '-';
    console.log('Setting display-name to:', displayName);
    document.getElementById('display-name').textContent = displayName;
    
    const memberId = user.user_id || '-';
    console.log('Setting member-id to:', memberId);
    document.getElementById('member-id').textContent = memberId;
    
    const pointBalance = user.point_balance || 0;
    console.log('Setting point-balance to:', pointBalance);
    document.getElementById('point-balance').textContent = pointBalance;
    
    const memberRank = user.member_rank || 'bronze';
    console.log('Setting rank-badge to:', memberRank.toUpperCase());
    const rankBadge = document.getElementById('rank-badge');
    rankBadge.textContent = memberRank.toUpperCase();
    rankBadge.className = 'rank-badge';
    
    switch (memberRank) {
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
    console.log('Rank badge classes:', rankBadge.className);
    
    const status = user.status || 'ACTIVE';
    console.log('Setting user-status to:', status);
    document.getElementById('user-status').textContent = status;
    
    let registrationDate = '-';
    if (user.registration_date) {
      try {
        registrationDate = new Date(user.registration_date).toLocaleDateString('ja-JP');
        console.log('Parsed registration date:', user.registration_date, '->', registrationDate);
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        registrationDate = '-';
      }
    }
    console.log('Setting registration-date to:', registrationDate);
    document.getElementById('registration-date').textContent = registrationDate;
    
    const userId = user.user_id || '-';
    console.log('Setting user-id to:', userId);
    document.getElementById('user-id').textContent = userId;
    
    const memo = user.memo || '-';
    console.log('Setting user-memo to:', memo);
    document.getElementById('user-memo').textContent = memo;
    
    console.log('=== DEBUG: 全フィールド更新完了 ===');
    
    console.log('=== DEBUG: 更新後のDOM要素確認 ===');
    const updatedElements = {
      'display-name': document.getElementById('display-name')?.textContent,
      'member-id': document.getElementById('member-id')?.textContent,
      'point-balance': document.getElementById('point-balance')?.textContent,
      'rank-badge': document.getElementById('rank-badge')?.textContent,
      'user-status': document.getElementById('user-status')?.textContent,
      'registration-date': document.getElementById('registration-date')?.textContent,
      'user-id': document.getElementById('user-id')?.textContent,
      'user-memo': document.getElementById('user-memo')?.textContent
    };
    console.log('Final DOM element values:', updatedElements);
    
  } catch (error) {
    console.error('=== DEBUG: displayUserInfo内でエラー ===');
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
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
