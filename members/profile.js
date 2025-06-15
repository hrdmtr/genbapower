let liffId = 'dummy_liff_id';
let lineUserId = null;
let userProfile = null;
let appMode = 'local';
let apiBaseUrl = '/api/line';

async function sendLogToServer(level, message, context = null) {
  try {
    await fetch('/api/frontend-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: level,
        message: message,
        context: context,
        timestamp: new Date().toISOString(),
        page: 'profile'
      })
    });
  } catch (error) {
    console.error('Failed to send log to server:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchEnvironmentSettings();
  initializeLIFF();
});

async function fetchEnvironmentSettings() {
  try {
    console.log('=== Fetching Environment Settings ===');
    await sendLogToServer('info', '🔧 環境設定取得開始', { url: '/api/server-settings' });
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
          await sendLogToServer('info', '🔧 appMode更新完了', { appMode: appMode });
        }
        
        if (data.data.liffId) {
          liffId = data.data.liffId;
          console.log('Updated liffId:', liffId);
          await sendLogToServer('info', '🔧 liffId更新完了', { liffId: liffId });
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
    
    await sendLogToServer('info', '🔍 認証フロー開始', { 
      appMode: appMode,
      liffId: liffId,
      'appMode === local': appMode === 'local',
      'liffId === dummy_liff_id': liffId === 'dummy_liff_id',
      'appMode === development': appMode === 'development'
    });
    
    if (appMode === 'local' || liffId === 'dummy_liff_id') {
      console.log('認証バイパス条件検出:', { appMode, liffId });
      
      const bypassReason = appMode === 'local' ? 'ローカルモード' : 'LIFF設定未完了';
      const alertClass = appMode === 'local' ? 'alert-info' : 'alert-warning';
      
      document.getElementById('auth-error').innerHTML = `<div class="alert ${alertClass}">${bypassReason}: 認証をバイパスして動作しています</div>`;
      document.getElementById('auth-error').classList.remove('d-none');
      
      lineUserId = 'U1234567890abcdef';
      userProfile = {
        userId: lineUserId,
        displayName: `テストユーザー（${bypassReason}）`
      };
      
      await sendLogToServer('info', '🆔 lineUserId設定完了', { 
        lineUserId: lineUserId, 
        bypassReason: bypassReason,
        appMode: appMode,
        liffId: liffId 
      });
      
      await fetchUserInfo();
      hideLoading();
      return;
    }
    
    if (appMode === 'development') {
      console.log('デベロップメントモード: LIFF初期化を実行しますが認証を緩和します');
      
      try {
        await sendLogToServer('info', '🔧 LIFF初期化開始（デベロップメントモード）', { 
          appMode: appMode,
          liffId: liffId 
        });
        
        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          console.log('LIFF認証済み: 実際のユーザー情報を取得');
          userProfile = await liff.getProfile();
          lineUserId = userProfile.userId;
          
          await sendLogToServer('info', '🆔 実際のlineUserId設定完了', { 
            lineUserId: lineUserId, 
            displayName: userProfile.displayName,
            appMode: appMode,
            liffId: liffId 
          });
        } else {
          console.log('LIFF未認証: テストユーザーを使用');
          lineUserId = 'U1234567890abcdef';
          userProfile = {
            userId: lineUserId,
            displayName: 'テストユーザー（デベロップメントモード・未認証）'
          };
          
          await sendLogToServer('info', '🆔 テストlineUserId設定完了', { 
            lineUserId: lineUserId, 
            appMode: appMode,
            liffId: liffId 
          });
        }
        
        document.getElementById('auth-error').innerHTML = '<div class="alert alert-info">デベロップメントモード: 認証を緩和して動作しています</div>';
        document.getElementById('auth-error').classList.remove('d-none');
        
        await fetchUserInfo();
        hideLoading();
        return;
        
      } catch (error) {
        console.error('デベロップメントモードLIFF初期化エラー:', error);
        await sendLogToServer('error', '❌ LIFF初期化失敗（テストユーザーにフォールバック）', { 
          error: error.message,
          appMode: appMode,
          liffId: liffId 
        });
      }
    }
    
    if (appMode === 'development') {
      console.log('デベロップメントモード: LIFF初期化を実行しますが認証を緩和します');
      await sendLogToServer('info', '🔧 LIFF初期化開始', { 
        appMode: appMode,
        liffId: liffId 
      });
      
      try {
        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          console.log('LIFF認証済み: 実際のユーザー情報を取得');
          userProfile = await liff.getProfile();
          lineUserId = userProfile.userId;
          
          await sendLogToServer('info', '🆔 実際のlineUserId設定完了', { 
            lineUserId: lineUserId, 
            displayName: userProfile.displayName,
            appMode: appMode,
            liffId: liffId 
          });
        } else {
          console.log('LIFF未認証: テストユーザーを使用');
          lineUserId = 'U1234567890abcdef';
          userProfile = {
            userId: lineUserId,
            displayName: 'テストユーザー（デベロップメントモード・未認証）'
          };
          
          await sendLogToServer('info', '🆔 テストlineUserId設定完了', { 
            lineUserId: lineUserId, 
            appMode: appMode,
            liffId: liffId 
          });
        }
        
        document.getElementById('auth-error').innerHTML = '<div class="alert alert-info">デベロップメントモード: 認証を緩和して動作しています</div>';
        document.getElementById('auth-error').classList.remove('d-none');
        
        await fetchUserInfo();
        hideLoading();
        return;
        
      } catch (error) {
        console.error('デベロップメントモードLIFF初期化エラー:', error);
        await sendLogToServer('error', '❌ LIFF初期化失敗（テストユーザーにフォールバック）', { 
          error: error.message,
          appMode: appMode,
          liffId: liffId 
        });
        
        lineUserId = 'U1234567890abcdef';
        userProfile = {
          userId: lineUserId,
          displayName: 'テストユーザー（LIFF初期化失敗）'
        };
        
        document.getElementById('auth-error').innerHTML = '<div class="alert alert-warning">デベロップメントモード: LIFF初期化失敗、テストユーザーで動作</div>';
        document.getElementById('auth-error').classList.remove('d-none');
        
        await fetchUserInfo();
        hideLoading();
        return;
      }
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
      
      await sendLogToServer('info', '🆔 lineUserId設定完了（LIFF設定エラー）', { 
        lineUserId: lineUserId, 
        appMode: appMode,
        liffId: liffId 
      });
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
    
    await sendLogToServer('info', '🆔 lineUserId設定完了（エラー回避）', { 
      lineUserId: lineUserId, 
      appMode: appMode,
      liffId: liffId 
    });
    
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
    console.log('🚀 === fetchUserInfo開始 ===');
    console.log('🔍 現在のlineUserId:', lineUserId);
    console.log('🔍 現在のuserProfile:', userProfile);
    console.log('🔍 現在のappMode:', appMode);
    console.log('🔍 現在のliffId:', liffId);
    console.log('🔍 現在のapiBaseUrl:', apiBaseUrl);
    
    if (!lineUserId) {
      console.error('❌ lineUserIdが設定されていません');
      throw new Error('ユーザーIDが設定されていません');
    }
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (appMode !== 'local' && liffId !== 'dummy_liff_id' && typeof liff !== 'undefined' && liff.getAccessToken) {
      try {
        const accessToken = liff.getAccessToken();
        if (accessToken) {
          headers['x-line-access-token'] = accessToken;
          console.log('🔑 LINE Access Token added to request headers');
        } else {
          console.log('⚠️ LINE Access Token is empty');
        }
      } catch (liffError) {
        console.log('❌ LIFF Access Token取得エラー (バイパスモードで続行):', liffError.message);
      }
    } else {
      console.log('🔓 認証バイパスモード: LINE Access Tokenをスキップ');
    }
    
    const requestUrl = `${apiBaseUrl}/user/${lineUserId}?user_id=${lineUserId}`;
    console.log('📡 API Request Details:');
    console.log('  URL:', requestUrl);
    console.log('  Method: GET');
    console.log('  Headers:', JSON.stringify(headers, null, 2));
    
    await sendLogToServer('info', '📡 API Request準備完了', {
      url: requestUrl,
      headers: headers,
      lineUserId: lineUserId
    });
    
    console.log('📤 APIリクエスト送信中...');
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: headers
    });
    
    console.log('📥 APIレスポンス受信:');
    console.log('  Status:', response.status);
    console.log('  StatusText:', response.statusText);
    console.log('  OK:', response.ok);
    console.log('  Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ API Response Error:', response.status, response.statusText);
      throw new Error(`ユーザー情報の取得に失敗しました (${response.status}: ${response.statusText})`);
    }
    
    console.log('📋 レスポンスボディ解析中...');
    const data = await response.json();
    console.log('📋 受信したAPIレスポンス:', JSON.stringify(data, null, 2));
    
    await sendLogToServer('info', '📋 APIレスポンス受信', {
      success: data.success,
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : []
    });
    
    if (data.success) {
      console.log('✅ APIレスポンス成功 - ユーザー情報を表示');
      console.log('👤 表示するユーザーデータ:', JSON.stringify(data.data, null, 2));
      
      if (!data.data) {
        console.error('❌ data.dataが空です');
        throw new Error('ユーザーデータが空です');
      }
      
      console.log('🎨 displayUserInfo関数を呼び出し中...');
      displayUserInfo(data.data);
      
      console.log('🔲 QRコード生成開始...');
      generateQRCode(lineUserId);
      
      console.log('✅ === fetchUserInfo完了 ===');
    } else {
      console.error('❌ APIレスポンス失敗:', data.message);
      throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
  } catch (error) {
    console.error('💥 ユーザー情報取得エラー:', error);
    console.error('💥 エラー詳細:', {
      message: error.message,
      stack: error.stack,
      lineUserId: lineUserId,
      appMode: appMode,
      apiBaseUrl: apiBaseUrl
    });
    
    await sendLogToServer('error', '💥 fetchUserInfo エラー', {
      errorMessage: error.message,
      errorStack: error.stack,
      lineUserId: lineUserId,
      appMode: appMode,
      apiBaseUrl: apiBaseUrl
    });
    
    showError(error.message);
  }
}

function displayUserInfo(user) {
  console.log('🎨 === displayUserInfo開始 ===');
  console.log('👤 受信したユーザーデータ:', JSON.stringify(user, null, 2));
  
  sendLogToServer('info', '🎨 ユーザー情報表示開始', {
    userDataKeys: Object.keys(user),
    display_name: user.display_name,
    user_id: user.user_id,
    point_balance: user.point_balance,
    member_rank: user.member_rank
  });
  
  try {
    const displayNameElement = document.getElementById('display-name');
    if (displayNameElement) {
      console.log('📝 表示名設定:', user.display_name);
      displayNameElement.textContent = user.display_name || '-';
    } else {
      console.error('❌ display-name要素が見つかりません');
    }
    
    const memberIdElement = document.getElementById('member-id');
    if (memberIdElement) {
      console.log('🆔 会員ID設定:', user.user_id);
      memberIdElement.textContent = user.user_id || '-';
    } else {
      console.error('❌ member-id要素が見つかりません');
    }
    
    const pointBalanceElement = document.getElementById('point-balance');
    if (pointBalanceElement) {
      console.log('💰 ポイント残高設定:', user.point_balance);
      pointBalanceElement.textContent = user.point_balance || '0';
    } else {
      console.error('❌ point-balance要素が見つかりません');
    }
    
    const rankBadge = document.getElementById('rank-badge');
    if (rankBadge) {
      console.log('🏆 ランク設定:', user.member_rank);
      rankBadge.textContent = (user.member_rank || 'bronze').toUpperCase();
      rankBadge.className = 'rank-badge';
      
      switch (user.member_rank) {
        case 'bronze':
          rankBadge.classList.add('rank-bronze');
          console.log('🥉 ブロンズランク適用');
          break;
        case 'silver':
          rankBadge.classList.add('rank-silver');
          console.log('🥈 シルバーランク適用');
          break;
        case 'gold':
          rankBadge.classList.add('rank-gold');
          console.log('🥇 ゴールドランク適用');
          break;
        default:
          rankBadge.classList.add('rank-bronze');
          console.log('🥉 デフォルトブロンズランク適用');
      }
    } else {
      console.error('❌ rank-badge要素が見つかりません');
    }
    
    console.log('✅ === displayUserInfo完了 ===');
    
    console.log('🔍 DOM要素最終状態:');
    console.log('  表示名:', displayNameElement?.textContent);
    console.log('  会員ID:', memberIdElement?.textContent);
    console.log('  ポイント残高:', pointBalanceElement?.textContent);
    console.log('  ランクバッジ:', rankBadge?.textContent);
    
    sendLogToServer('info', '✅ DOM更新完了', {
      displayName: displayNameElement?.textContent,
      memberId: memberIdElement?.textContent,
      pointBalance: pointBalanceElement?.textContent,
      rankBadge: rankBadge?.textContent
    });
    
  } catch (error) {
    console.error('💥 displayUserInfo エラー:', error);
    console.error('💥 エラー詳細:', {
      message: error.message,
      stack: error.stack,
      userData: user
    });
    
    sendLogToServer('error', '💥 displayUserInfo エラー', {
      errorMessage: error.message,
      errorStack: error.stack,
      userData: user
    });
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
