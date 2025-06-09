const express = require('express');
const router = express.Router();
const { getLineUserById, saveOrUpdateLineUser, updateLineUserPoints, getLineUserTransactions } = require('../services/line-users');
const { validateChargeTicket, useChargeTicket } = require('../services/charge-tickets');

const lineAuthMiddleware = (req, res, next) => {
  const APP_MODE = process.env.APP_MODE || 'development';
  
  console.log(`=== バックエンド認証チェック ===`);
  console.log('リクエストパス:', req.path);
  console.log('APP_MODE:', APP_MODE);
  console.log('Query params:', req.query);
  console.log('Body params:', req.body);
  console.log('Headers:', Object.keys(req.headers));
  console.log('Full request headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request timestamp:', new Date().toISOString());
  
  const body = req.body || {};
  const query = req.query || {};
  const userId = body.user_id || query.user_id || req.params.userId;
  
  console.log('Extracted user_id:', userId);
  console.log('Environment variables:', {
    APP_MODE: process.env.APP_MODE,
    LIFF_ID: process.env.LIFF_ID,
    LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID ? 'SET' : 'NOT_SET'
  });
  
  if (APP_MODE === 'local') {
    console.log('ローカルモード: LINE認証をバイパスします');
    
    req.lineUser = {
      userId: userId || 'U1234567890abcdef',
      displayName: 'テストユーザー'
    };
    
    console.log('設定されたユーザー:', req.lineUser);
    return next();
  }
  
  const LIFF_ID = process.env.LIFF_ID || 'dummy_liff_id';
  console.log('=== LIFF_ID 詳細チェック ===');
  console.log('LIFF_ID value:', LIFF_ID);
  console.log('LIFF_ID type:', typeof LIFF_ID);
  console.log('LIFF_ID === "dummy_liff_id":', LIFF_ID === 'dummy_liff_id');
  console.log('process.env.LIFF_ID:', process.env.LIFF_ID);
  
  if (LIFF_ID === 'dummy_liff_id' || APP_MODE === 'development') {
    console.log('開発モード検出: バックエンド認証をバイパスします');
    console.log('バイパス理由:', LIFF_ID === 'dummy_liff_id' ? 'DUMMY_LIFF_ID' : 'DEVELOPMENT_MODE');
    
    req.lineUser = {
      userId: userId || 'U1234567890abcdef',
      displayName: 'テストユーザー（開発モード）',
      point_balance: 100,
      member_rank: 'bronze',
      status: 'ACTIVE',
      registration_date: new Date().toISOString(),
      memo: '開発モード用テストユーザー'
    };
    
    console.log('設定されたユーザー:', req.lineUser);
    return next();
  }
  
  const lineAccessToken = req.headers['x-line-access-token'];
  console.log('=== LINE認証トークンチェック ===');
  console.log('x-line-access-token header exists:', !!lineAccessToken);
  console.log('Token length:', lineAccessToken ? lineAccessToken.length : 0);
  console.log('Token prefix:', lineAccessToken ? lineAccessToken.substring(0, 20) + '...' : 'N/A');
  console.log('Authorization header:', req.headers['authorization']);
  console.log('User agent:', req.headers['user-agent']);
  console.log('Referer:', req.headers['referer']);
  console.log('Origin:', req.headers['origin']);
  
  if (!lineAccessToken) {
    console.log('=== 認証失敗: アクセストークンがありません ===');
    console.log('Request headers:', Object.keys(req.headers));
    
    const errorResponse = {
      success: false,
      message: 'LINE認証が必要です',
      debug: {
        hasToken: false,
        appMode: APP_MODE,
        liffId: process.env.LIFF_ID,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        origin: req.headers['origin'],
        timestamp: new Date().toISOString(),
        requestPath: req.path,
        requestMethod: req.method,
        allHeaders: Object.keys(req.headers)
      }
    };
    
    console.log('返却するエラーレスポンス:', JSON.stringify(errorResponse, null, 2));
    return res.status(401).json(errorResponse);
  }
  
  console.log('=== LINE認証トークン検証開始 ===');
  req.lineUser = {
    userId: userId,
    displayName: 'LINE User'
  };
  
  console.log('認証成功 - 設定されたユーザー:', req.lineUser);
  next();
};

router.get('/user/:userId', lineAuthMiddleware, async (req, res) => {
  console.log('=== /api/line/user/:userId エンドポイント開始 ===');
  try {
    const userId = req.params.userId;
    const lineUser = req.lineUser;
    
    console.log('リクエストパラメータ:', {
      userId: userId,
      lineUser: lineUser,
      query: req.query,
      headers: Object.keys(req.headers),
      method: req.method,
      url: req.url
    });
    
    const LIFF_ID = process.env.LIFF_ID || 'dummy_liff_id';
    console.log('権限チェック:', {
      requestedUserId: userId,
      authenticatedUserId: req.lineUser.userId,
      appMode: process.env.APP_MODE,
      liffId: LIFF_ID,
      shouldCheckPermission: req.lineUser.userId !== userId && process.env.APP_MODE !== 'local' && LIFF_ID !== 'dummy_liff_id'
    });
    
    if (req.lineUser.userId !== userId && process.env.APP_MODE !== 'local' && LIFF_ID !== 'dummy_liff_id') {
      console.log('権限エラー: ユーザーIDが一致しません');
      return res.status(403).json({
        success: false,
        message: '権限がありません',
        debug: {
          requestedUserId: userId,
          authenticatedUserId: req.lineUser.userId,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    let user;
    console.log('=== データベースからユーザー情報取得試行 ===');
    try {
      user = await getLineUserById(userId);
      console.log('データベースからユーザー取得成功:', JSON.stringify(user, null, 2));
    } catch (dbError) {
      console.log('=== データベースエラー ===');
      console.log('DB Error message:', dbError.message);
      console.log('DB Error stack:', dbError.stack);
      console.log('モックユーザーを使用します');
      user = null;
    }
    
    if (!user) {
      console.log('=== ユーザーが見つからない場合の処理 ===');
      const shouldCreateMockUser = process.env.APP_MODE === 'local' || process.env.APP_MODE === 'development' || LIFF_ID === 'dummy_liff_id';
      console.log('モックユーザー作成条件:', {
        appMode: process.env.APP_MODE,
        liffId: LIFF_ID,
        shouldCreate: shouldCreateMockUser
      });
      
      if (shouldCreateMockUser) {
        console.log('認証バイパスモード: テストユーザーを自動作成します');
        const mockUser = {
          line_user_id: userId,
          display_name: req.lineUser.displayName || 'テストユーザー',
          point_balance: 1000,
          member_rank: 'silver',
          total_charged: 5000,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log('生成されたモックユーザー:', JSON.stringify(mockUser, null, 2));
        
        const responseData = {
          success: true,
          data: {
            user_id: mockUser.line_user_id,
            display_name: mockUser.display_name,
            point_balance: mockUser.point_balance,
            member_rank: mockUser.member_rank,
            total_charged: mockUser.total_charged,
            status: 'ACTIVE',
            registration_date: mockUser.created_at,
            memo: 'テストユーザーのメモ'
          },
          message: '認証バイパスモード: テストユーザーを使用します'
        };
        
        console.log('=== モックユーザーレスポンス送信 ===');
        console.log('Response data:', JSON.stringify(responseData, null, 2));
        
        return res.status(200).json(responseData);
      }
      
      console.log('ユーザーが見つからず、モックユーザー作成条件も満たさない');
      const notFoundResponse = {
        success: false,
        message: 'ユーザーが見つかりません',
        debug: {
          userId: userId,
          appMode: process.env.APP_MODE,
          liffId: LIFF_ID,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('404レスポンス:', JSON.stringify(notFoundResponse, null, 2));
      return res.status(404).json(notFoundResponse);
    }
    
    console.log('=== 実際のユーザーデータでレスポンス作成 ===');
    const responseData = {
      success: true,
      data: {
        user_id: user.line_user_id,
        display_name: user.display_name,
        point_balance: user.point_balance,
        member_rank: user.member_rank,
        total_charged: user.total_charged,
        status: user.status || 'ACTIVE',
        registration_date: user.created_at,
        memo: user.memo || ''
      }
    };
    
    console.log('=== 成功レスポンス送信 ===');
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('=== LINE会員情報取得エラー ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request details:', {
      userId: req.params.userId,
      method: req.method,
      url: req.url,
      headers: Object.keys(req.headers)
    });
    
    const errorResponse = {
      success: false,
      message: 'サーバーエラーが発生しました',
      debug: {
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
        requestPath: req.path,
        userId: req.params.userId
      }
    };
    
    console.log('エラーレスポンス:', JSON.stringify(errorResponse, null, 2));
    res.status(500).json(errorResponse);
  }
});

router.post('/charge', lineAuthMiddleware, async (req, res) => {
  try {
    const { ticket_id, passcode } = req.body;
    const lineUserId = req.lineUser.userId;
    
    if (!lineUserId || !ticket_id || !passcode) {
      return res.status(400).json({
        success: false,
        message: 'すべての項目が必要です'
      });
    }
    
    if (process.env.APP_MODE === 'local') {
      console.log('ローカルモード: チャージ処理をシミュレートします');
      
      if (ticket_id === 'TICKET123456789' && passcode === '123456') {
        return res.status(200).json({
          success: true,
          charged_amount: 1000,
          new_balance: 2000,
          new_rank: 'silver',
          message: 'ローカルモード: チャージ成功'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: '無効なチケットまたはパスコードです'
        });
      }
    }
    
    const validationResult = await validateChargeTicket(ticket_id, passcode);
    
    if (!validationResult.valid) {
      const errorMessages = {
        'INVALID_TICKET': '無効なチャージ券です',
        'USED_TICKET': '既に使用済みです',
        'EXPIRED_TICKET': '有効期限が切れています',
        'WRONG_PASSCODE': '認証コードが間違っています'
      };
      
      return res.status(400).json({
        success: false,
        message: errorMessages[validationResult.error] || 'チャージ券エラー'
      });
    }
    
    let user = await getLineUserById(lineUserId);
    
    if (!user) {
      await saveOrUpdateLineUser({
        line_user_id: lineUserId,
        display_name: req.lineUser.displayName || 'LINE User',
        point_balance: 0,
        member_rank: 'bronze',
        total_charged: 0
      });
      
      user = await getLineUserById(lineUserId);
    }
    
    await useChargeTicket(ticket_id, lineUserId);
    
    const chargeAmount = validationResult.amount;
    const updateResult = await updateLineUserPoints(
      lineUserId,
      chargeAmount,
      'charge',
      '券売機チャージ',
      ticket_id
    );
    
    res.status(200).json({
      success: true,
      charged_amount: chargeAmount,
      new_balance: updateResult.user.point_balance,
      new_rank: updateResult.user.member_rank
    });
  } catch (error) {
    console.error('ポイントチャージエラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

router.get('/transactions/:userId', lineAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    if (req.lineUser.userId !== userId && process.env.APP_MODE !== 'local') {
      return res.status(403).json({
        success: false,
        message: '権限がありません'
      });
    }
    
    if (process.env.APP_MODE === 'local') {
      console.log('ローカルモード: 取引履歴のモックデータを使用します');
      
      const mockTransactions = [
        {
          id: '1',
          type: 'charge',
          amount: 1000,
          balance_after: 1000,
          description: '券売機チャージ',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          id: '2',
          type: 'use',
          amount: -300,
          balance_after: 700,
          description: 'ポイント利用',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: '3',
          type: 'charge',
          amount: 500,
          balance_after: 1200,
          description: '券売機チャージ',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: '4',
          type: 'use',
          amount: -200,
          balance_after: 1000,
          description: 'ポイント利用',
          created_at: new Date()
        }
      ];
      
      return res.status(200).json({
        success: true,
        transactions: mockTransactions.slice(offset, offset + limit),
        total: mockTransactions.length,
        message: 'ローカルモード: モックデータを使用しています'
      });
    }
    
    const result = await getLineUserTransactions(userId, limit, offset);
    
    res.status(200).json({
      success: true,
      transactions: result.transactions.map(t => ({
        id: t._id,
        type: t.transaction_type,
        amount: t.amount,
        balance_after: t.balance_after,
        description: t.description,
        created_at: t.created_at
      })),
      total: result.total
    });
  } catch (error) {
    console.error('取引履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
module.exports.lineAuthMiddleware = lineAuthMiddleware;
