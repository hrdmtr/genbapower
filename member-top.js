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
    await fetch('/api/debug/execution-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'FETCHUSERINFO_FUNCTION_START',
        lineUserId: lineUserId || 'null',
        displayName: userProfile ? userProfile.displayName : 'unknown',
        source: 'member-top.js fetchUserInfo() - ENTRY POINT',
        additionalData: { 
          appMode: appMode || 'undefined',
          apiBaseUrl: apiBaseUrl || 'undefined',
          userProfileExists: !!userProfile,
          lineUserIdType: typeof lineUserId
        }
      })
    });
  } catch (entryDebugError) {
    console.error('Entry debug POST failed:', entryDebugError);
  }

  console.log('=== fetchUserInfo() 関数開始 ===');
  console.log('関数呼び出し時点での変数状態:');
  console.log('- lineUserId:', lineUserId);
  console.log('- appMode:', appMode);
  console.log('- apiBaseUrl:', apiBaseUrl);
  console.log('- userProfile:', userProfile);
  
  try {
    console.log('=== try ブロック開始 ===');
    console.log('=== ユーザー情報取得開始 ===');
    console.log('lineUserId:', lineUserId);
    console.log('appMode:', appMode);
    console.log('apiBaseUrl:', apiBaseUrl);
    
    console.log('=== debug POST 送信前 ===');
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
      console.log('=== debug POST 送信完了 ===');
    } catch (debugError) {
      console.error('Debug POST failed (fetchUserInfo started):', debugError);
    }
    console.log('=== debug POST 処理完了、次のステップへ ===');
    
    // lineUserIdチェック前にデバッグPOST
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'BEFORE_LINEUSERID_CHECK',
          lineUserId: lineUserId || 'null',
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo()',
          additionalData: { 
            lineUserIdValue: lineUserId,
            lineUserIdType: typeof lineUserId,
            lineUserIdTruthy: !!lineUserId
          }
        })
      });
    } catch (debugError) {
      console.error('Debug POST failed (before lineUserId check):', debugError);
    }

    console.log('=== lineUserId チェック ===');
    console.log('lineUserId value:', lineUserId);
    console.log('lineUserId type:', typeof lineUserId);
    console.log('lineUserId truthy:', !!lineUserId);
    
    if (!lineUserId) {
      console.error('=== LINE ユーザーIDが取得できていません ===');
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'LINEUSERID_CHECK_FAILED',
            lineUserId: lineUserId || 'null',
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { error: 'LINE ユーザーIDが取得できていません' }
          })
        });
      } catch (debugError) {
        console.error('Debug POST failed (lineUserId check failed):', debugError);
      }
      
      throw new Error('LINE ユーザーIDが取得できていません');
    }
    
    // lineUserIdチェック成功後にデバッグPOST
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'LINEUSERID_CHECK_PASSED',
          lineUserId: lineUserId,
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo()',
          additionalData: { lineUserIdValue: lineUserId }
        })
      });
    } catch (debugError) {
      console.error('Debug POST failed (lineUserId check passed):', debugError);
    }
    
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'BEFORE_HEADER_SETUP',
          lineUserId: lineUserId,
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo()',
          additionalData: { appMode: appMode }
        })
      });
    } catch (debugError) {
      console.error('Debug POST failed (before header setup):', debugError);
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
        
        try {
          await fetch('/api/debug/execution-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'ACCESS_TOKEN_RETRIEVED',
              lineUserId: lineUserId,
              displayName: userProfile ? userProfile.displayName : 'unknown',
              source: 'member-top.js fetchUserInfo()',
              additionalData: { 
                hasAccessToken: !!accessToken,
                headerCount: Object.keys(headers).length
              }
            })
          });
        } catch (debugError) {
          console.error('Debug POST failed (access token retrieved):', debugError);
        }
        
      } catch (tokenError) {
        console.error('=== アクセストークン取得エラー ===');
        console.error('tokenError:', tokenError);
        console.error('tokenError.message:', tokenError.message);
        
        try {
          await fetch('/api/debug/execution-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'ACCESS_TOKEN_ERROR',
              lineUserId: lineUserId,
              displayName: userProfile ? userProfile.displayName : 'unknown',
              source: 'member-top.js fetchUserInfo()',
              additionalData: { 
                error: tokenError.message,
                errorType: tokenError.constructor.name
              }
            })
          });
        } catch (debugError) {
          console.error('Debug POST failed (access token error):', debugError);
        }
      }
    } else {
      console.log('ローカルモード: アクセストークンをスキップ');
    }
    console.log('=== ヘッダー設定完了 ===');
    // IMPORTANT: クロスオリジン問題の解決
    // 問題: LINE環境（ngrokドメイン）から http://localhost:8000 へのAPI呼び出しが
    //       "Load failed" エラーで失敗していた（クロスオリジンリクエスト制限）
    // 解決: 相対パス /api/users/line-lookup/${lineUserId} を使用することで
    //       同一オリジンでのAPI呼び出しを実現し、クロスオリジン問題を回避

    const requestUrl = `/api/users/line-lookup/${lineUserId}`;
    console.log('API リクエスト URL:', requestUrl);
    console.log('リクエストヘッダー:', headers);
    
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'BEFORE_API_FETCH',
          lineUserId: lineUserId,
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo()',
          additionalData: { 
            requestUrl: requestUrl,
            headers: headers,
            headersStringified: JSON.stringify(headers)
          }
        })
      });
    } catch (debugError) {
      console.error('Debug POST failed (before API fetch):', debugError);
    }
    
    console.log('=== fetch() 呼び出し直前 ===');
    console.log('requestUrl:', requestUrl);
    console.log('headers:', JSON.stringify(headers, null, 2));
    
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'IMMEDIATE_BEFORE_FETCH',
          lineUserId: lineUserId,
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo() - IMMEDIATE BEFORE FETCH',
          additionalData: { 
            aboutToCallUrl: requestUrl,
            aboutToCallHeaders: headers,
            fetchMethod: 'GET'
          }
        })
      });
      console.log('=== 直前デバッグPOST送信完了 ===');
    } catch (debugError) {
      console.error('Immediate before fetch debug POST failed:', debugError);
    }
    
    console.log('=== 実際のfetch()呼び出し開始 ===');
    let response;
    try {
      response = await fetch(requestUrl, {
        method: 'GET',
        headers
      });
      console.log('=== fetch()呼び出し成功 ===');
      console.log('response status:', response.status);
      console.log('response ok:', response.ok);
      console.log('response url:', response.url);
      console.log('response type:', response.type);
      console.log('response redirected:', response.redirected);
      console.log('response headers keys:', Array.from(response.headers.keys()));
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'FETCH_SUCCESS',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              responseStatus: response.status,
              responseOk: response.ok,
              responseUrl: response.url,
              responseType: response.type,
              responseRedirected: response.redirected,
              responseHeadersKeys: Array.from(response.headers.keys())
            }
          })
        });
        console.log('=== fetch成功デバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('Fetch success debug POST failed:', debugError);
      }
      
    } catch (fetchError) {
      console.error('=== fetch()呼び出しエラー ===');
      console.error('fetchError:', fetchError);
      console.error('fetchError.message:', fetchError.message);
      console.error('fetchError.name:', fetchError.name);
      console.error('fetchError.stack:', fetchError.stack);
      console.error('fetchError.cause:', fetchError.cause);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'FETCH_ERROR',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              errorMessage: fetchError.message,
              errorName: fetchError.name,
              errorStack: fetchError.stack,
              errorCause: fetchError.cause
            }
          })
        });
        console.log('=== fetchエラーデバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('Fetch error debug POST failed:', debugError);
      }
      
      throw new Error(`API呼び出しに失敗しました: ${fetchError.message}`);
    }
    
    console.log('=== レスポンス処理開始 ===');
    console.log('API レスポンス状態:', response.status, response.statusText);
    console.log('API レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
    console.log('API レスポンスURL:', response.url);
    console.log('API レスポンスタイプ:', response.type);
    
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'RESPONSE_PROCESSING_START',
          lineUserId: lineUserId,
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo()',
          additionalData: { 
            responseStatus: response.status,
            responseStatusText: response.statusText,
            responseOk: response.ok,
            responseUrl: response.url,
            responseType: response.type,
            responseHeaders: Object.fromEntries(response.headers.entries())
          }
        })
      });
      console.log('=== レスポンス処理開始デバッグPOST送信完了 ===');
    } catch (debugError) {
      console.error('Response processing start debug POST failed:', debugError);
    }
    
    if (!response.ok) {
      console.error('=== HTTPエラーレスポンス ===');
      console.error('Status:', response.status);
      console.error('StatusText:', response.statusText);
      
      let errorText;
      try {
        errorText = await response.text();
        console.error('API エラーレスポンステキスト:', errorText);
      } catch (textError) {
        console.error('エラーレスポンステキスト取得失敗:', textError);
        errorText = 'レスポンステキスト取得不可';
      }
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'HTTP_ERROR_RESPONSE',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              status: response.status,
              statusText: response.statusText,
              errorText: errorText
            }
          })
        });
        console.log('=== HTTPエラーデバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('HTTP error debug POST failed:', debugError);
      }
      
      throw new Error(`ユーザー情報の取得に失敗しました (${response.status}): ${errorText}`);
    }
    
    console.log('=== レスポンステキスト取得開始 ===');
    let responseText;
    try {
      responseText = await response.text();
      console.log('=== レスポンステキスト取得成功 ===');
      console.log('API レスポンス生テキスト:', responseText);
      console.log('レスポンステキスト長:', responseText.length);
      console.log('レスポンステキスト最初の100文字:', responseText.substring(0, 100));
    } catch (textError) {
      console.error('=== レスポンステキスト取得エラー ===');
      console.error('textError:', textError);
      console.error('textError.message:', textError.message);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'RESPONSE_TEXT_ERROR',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              errorMessage: textError.message,
              errorName: textError.name
            }
          })
        });
        console.log('=== テキスト取得エラーデバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('Response text error debug POST failed:', debugError);
      }
      
      throw new Error(`レスポンステキストの取得に失敗しました: ${textError.message}`);
    }
    
    console.log('=== JSON解析開始 ===');
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('=== JSON解析成功 ===');
      console.log('API レスポンスデータ:', data);
      console.log('データのキー:', Object.keys(data));
      console.log('data.success:', data.success);
      console.log('data.data:', data.data);
      console.log('data.message:', data.message);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'JSON_PARSE_SUCCESS',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              dataReceived: !!data,
              dataKeys: data ? Object.keys(data) : [],
              dataSuccess: data ? data.success : null,
              dataHasData: data ? !!data.data : false,
              dataMessage: data ? data.message : null
            }
          })
        });
        console.log('=== JSON解析成功デバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('JSON parse success debug POST failed:', debugError);
      }
      
    } catch (parseError) {
      console.error('=== JSON解析エラー ===');
      console.error('parseError:', parseError);
      console.error('parseError.message:', parseError.message);
      console.error('parseError.name:', parseError.name);
      console.error('解析しようとしたテキスト:', responseText);
      console.error('テキスト長:', responseText.length);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'JSON_PARSE_ERROR',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              errorMessage: parseError.message,
              errorName: parseError.name,
              responseTextLength: responseText.length,
              responseTextPreview: responseText.substring(0, 200)
            }
          })
        });
        console.log('=== JSON解析エラーデバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('JSON parse error debug POST failed:', debugError);
      }
      
      throw new Error(`APIレスポンスのJSONパースに失敗しました: ${parseError.message}`);
    }
    
    console.log('=== データ成功チェック ===');
    console.log('data.success:', data.success);
    console.log('data.success type:', typeof data.success);
    console.log('data.success truthy:', !!data.success);
    
    if (data.success) {
      console.log('=== データ成功: displayUserInfo()呼び出し前 ===');
      console.log('data.data:', data.data);
      console.log('data.data type:', typeof data.data);
      console.log('lineUserId at this point:', lineUserId);
      console.log('userProfile at this point:', userProfile);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'BEFORE_DISPLAY_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              userData: data.data,
              fullData: data,
              lineUserIdAtThisPoint: lineUserId,
              userProfileAtThisPoint: userProfile,
              userProfileUserId: userProfile ? userProfile.userId : null
            }
          })
        });
        console.log('=== displayUserInfo前デバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('Debug POST failed (before displayUserInfo):', debugError);
      }
      
      console.log('=== displayUserInfo()呼び出し実行 ===');
      try {
        displayUserInfo(data.data);
        console.log('=== displayUserInfo()呼び出し成功 ===');
      } catch (displayError) {
        console.error('=== displayUserInfo()エラー ===');
        console.error('displayError:', displayError);
        console.error('displayError.message:', displayError.message);
        console.error('displayError.stack:', displayError.stack);
        
        // displayUserInfo()エラーのデバッグPOST
        try {
          await fetch('/api/debug/execution-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'DISPLAY_USER_INFO_ERROR',
              lineUserId: lineUserId,
              displayName: userProfile ? userProfile.displayName : 'unknown',
              source: 'member-top.js fetchUserInfo()',
              additionalData: { 
                errorMessage: displayError.message,
                errorStack: displayError.stack,
                userDataPassed: data.data
              }
            })
          });
          console.log('=== displayUserInfoエラーデバッグPOST送信完了 ===');
        } catch (debugError) {
          console.error('Display user info error debug POST failed:', debugError);
        }
        
        throw displayError;
      }
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'AFTER_DISPLAY_USER_INFO',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: {
              completedSuccessfully: true
            }
          })
        });
        console.log('=== displayUserInfo後デバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('Debug POST failed (after displayUserInfo):', debugError);
      }
    } else {
      console.error('=== データ失敗: data.success が false ===');
      console.error('data.message:', data.message);
      console.error('full data object:', data);
      
      try {
        await fetch('/api/debug/execution-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'DATA_SUCCESS_FALSE',
            lineUserId: lineUserId,
            displayName: userProfile ? userProfile.displayName : 'unknown',
            source: 'member-top.js fetchUserInfo()',
            additionalData: { 
              dataMessage: data.message,
              fullDataObject: data
            }
          })
        });
        console.log('=== データ失敗デバッグPOST送信完了 ===');
      } catch (debugError) {
        console.error('Data success false debug POST failed:', debugError);
      }
      
      throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }
  } catch (error) {
    console.error('=== fetchUserInfo() catch ブロック実行 ===');
    console.error('=== ユーザー情報取得エラー詳細 ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    console.error('Error cause:', error.cause);
    console.error('エラー発生時の変数状態:');
    console.error('- lineUserId:', lineUserId);
    console.error('- lineUserId type:', typeof lineUserId);
    console.error('- appMode:', appMode);
    console.error('- apiBaseUrl:', apiBaseUrl);
    console.error('- userProfile:', userProfile);
    console.error('- userProfile.userId:', userProfile ? userProfile.userId : 'userProfile is null');
    
    try {
      await fetch('/api/debug/execution-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'FETCHUSERINFO_TOTAL_ERROR',
          lineUserId: lineUserId || 'null',
          displayName: userProfile ? userProfile.displayName : 'unknown',
          source: 'member-top.js fetchUserInfo() - CATCH BLOCK',
          additionalData: { 
            errorMessage: error.message,
            errorName: error.name,
            errorType: error.constructor.name,
            errorStack: error.stack,
            errorCause: error.cause,
            lineUserIdAtError: lineUserId,
            lineUserIdTypeAtError: typeof lineUserId,
            userProfileAtError: userProfile,
            userProfileUserIdAtError: userProfile ? userProfile.userId : null,
            appModeAtError: appMode,
            apiBaseUrlAtError: apiBaseUrl
          }
        })
      });
      console.log('=== 全体エラーデバッグPOST送信完了 ===');
    } catch (debugError) {
      console.error('Total error debug POST failed:', debugError);
    }
    
    showError(error.message);
  }
  console.log('=== fetchUserInfo() 関数終了 ===');
}

function displayUserInfo(user) {
  console.log('=== displayUserInfo 実行開始 ===');
  console.log('user data:', user);
  console.log('user data type:', typeof user);
  console.log('user data keys:', user ? Object.keys(user) : 'user is null/undefined');
  console.log('lineUserId variable:', lineUserId);
  console.log('lineUserId type:', typeof lineUserId);
  console.log('userProfile:', userProfile);
  console.log('userProfile type:', typeof userProfile);
  console.log('userProfile.userId:', userProfile ? userProfile.userId : 'userProfile is null');
  
  const displayNameElement = document.getElementById('display-name');
  const lineUserIdElement = document.getElementById('line-user-id');
  const pointBalanceElement = document.getElementById('point-balance');
  
  console.log('DOM elements found:', {
    displayName: !!displayNameElement,
    lineUserId: !!lineUserIdElement,
    pointBalance: !!pointBalanceElement
  });
  
  console.log('DOM element details:');
  console.log('- displayNameElement:', displayNameElement);
  console.log('- lineUserIdElement:', lineUserIdElement);
  console.log('- pointBalanceElement:', pointBalanceElement);
  
  if (displayNameElement) {
    const nameToSet = user.display_name || user.user_id;
    displayNameElement.textContent = nameToSet;
    console.log('Display name set to:', nameToSet);
    console.log('Display name element after setting:', displayNameElement.textContent);
  } else {
    console.error('displayNameElement not found!');
  }
  
  if (lineUserIdElement) {
    console.log('=== LINE ユーザーID設定処理 ===');
    console.log('userProfile exists:', !!userProfile);
    console.log('userProfile.userId:', userProfile ? userProfile.userId : 'N/A');
    console.log('lineUserId:', lineUserId);
    console.log('lineUserId type:', typeof lineUserId);
    
    const userIdToDisplay = (userProfile && userProfile.userId) ? userProfile.userId : (lineUserId || '-');
    console.log('userIdToDisplay calculated as:', userIdToDisplay);
    console.log('userIdToDisplay type:', typeof userIdToDisplay);
    
    lineUserIdElement.textContent = userIdToDisplay;
    console.log('LINE user ID element after setting:', lineUserIdElement.textContent);
    console.log('LINE user ID element innerHTML:', lineUserIdElement.innerHTML);
    
    setTimeout(() => {
      console.log('=== 1秒後のLINE ユーザーID要素確認 ===');
      console.log('lineUserIdElement.textContent:', lineUserIdElement.textContent);
      console.log('lineUserIdElement.innerHTML:', lineUserIdElement.innerHTML);
    }, 1000);
    
  } else {
    console.error('lineUserIdElement not found!');
  }
  
  if (pointBalanceElement) {
    const pointsToSet = user.points || 0;
    pointBalanceElement.textContent = pointsToSet;
    console.log('Point balance set to:', pointsToSet);
    console.log('Point balance element after setting:', pointBalanceElement.textContent);
  } else {
    console.error('pointBalanceElement not found!');
  }
  
  console.log('=== displayUserInfo 実行完了 ===');
  console.log('最終的な要素の状態:');
  console.log('- Display name:', displayNameElement ? displayNameElement.textContent : 'element not found');
  console.log('- LINE user ID:', lineUserIdElement ? lineUserIdElement.textContent : 'element not found');
  console.log('- Point balance:', pointBalanceElement ? pointBalanceElement.textContent : 'element not found');
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
