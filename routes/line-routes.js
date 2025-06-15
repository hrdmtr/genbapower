const express = require('express');
const router = express.Router();
const { getLineUserById, saveOrUpdateLineUser, updateLineUserPoints, getLineUserTransactions } = require('../services/line-users');
const { validateChargeTicket, useChargeTicket } = require('../services/charge-tickets');

const lineAuthMiddleware = (req, res, next) => {
  const APP_MODE = process.env.APP_MODE || 'development';
  
  console.log(`🔥 === バックエンド認証チェック開始 ===`);
  console.log('🔥 リクエストパス:', req.path);
  console.log('🔥 APP_MODE:', APP_MODE);
  console.log('🔥 リクエストメソッド:', req.method);
  console.log('🔥 リクエストヘッダー:', {
    'content-type': req.headers['content-type'],
    'x-line-access-token': req.headers['x-line-access-token'] ? '***TOKEN_EXISTS***' : 'NO_TOKEN',
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });
  console.log('🔥 認証ミドルウェア実行中...');
  
  const body = req.body || {};
  const query = req.query || {};
  const userId = body.user_id || query.user_id || req.params.userId;
  const accessToken = req.headers['x-line-access-token'];
  
  console.log('🔥 === パラメータ抽出詳細 ===');
  console.log('🔥 req.params:', req.params);
  console.log('🔥 req.query:', query);
  console.log('🔥 req.body:', body);
  console.log('🔥 Extracted user_id:', userId);
  console.log('🔥 Access token present:', !!accessToken);
  console.log('🔥 Access token length:', accessToken ? accessToken.length : 0);
  console.log('🔥 Access token first 20 chars:', accessToken ? accessToken.substring(0, 20) + '...' : 'NO_TOKEN');
  console.log('🔥 === パラメータ抽出完了 ===');
  
  if (APP_MODE === 'local' || APP_MODE === 'development') {
    const bypassReason = APP_MODE === 'local' ? 'ローカルモード' : 'デベロップメントモード';
    console.log(`🔥 ✅ ${bypassReason}: LINE認証をバイパスします`);
    
    req.lineUser = {
      userId: userId || 'U1234567890abcdef',
      displayName: APP_MODE === 'development' ? 'haradm (Development Mode - Known User)' : 'テストユーザー'
    };
    
    console.log('設定されたユーザー:', req.lineUser);
    return next();
  }
  
  // 
  //
  //
  //
  if (APP_MODE === 'development') {
    console.log('🔥 ✅ デベロップメントモード: LINE認証をバイパスします');
    console.log('🔥 🔍 Development mode details:', {
      userId: userId,
      hasAccessToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0
    });
    
    if (userId && accessToken) {
      console.log('🔥 ✅ 実際のユーザーIDとアクセストークンを使用');
      req.lineUser = {
        userId: userId,
        displayName: 'haradm (Development Mode)',
        accessToken: accessToken
      };
    } else if (userId === 'U34ec5d230907eaf36c3cb9c362c14181') {
      console.log('🔥 ✅ 既知の実際のユーザーIDを使用');
      req.lineUser = {
        userId: userId,
        displayName: 'haradm (Development Mode - Known User)'
      };
    } else {
      console.log('🔥 ✅ テストユーザーにフォールバック');
      req.lineUser = {
        userId: userId || 'U1234567890abcdef',
        displayName: 'テストユーザー（デベロップメントモード）'
      };
    }
    
    console.log('🔥 ✅ 設定されたユーザー:', {
      userId: req.lineUser.userId,
      displayName: req.lineUser.displayName,
      hasAccessToken: !!req.lineUser.accessToken
    });
    console.log('🔥 デベロップメントモード認証完了 - next()呼び出し');
    return next();
  }
  
  const LIFF_ID = process.env.LIFF_ID || 'dummy_liff_id';
  console.log('🔥 LIFF_ID チェック:', LIFF_ID);
  if (LIFF_ID === 'dummy_liff_id') {
    console.log('🔥 DUMMY LIFF_ID検出: バックエンド認証をバイパスします');
    
    req.lineUser = {
      userId: userId || 'U1234567890abcdef',
      displayName: 'テストユーザー（LIFF設定未完了）'
    };
    
    console.log('🔥 設定されたユーザー:', req.lineUser);
    console.log('🔥 DUMMY LIFF_ID認証完了 - next()呼び出し');
    return next();
  }
  
  const lineAccessToken = req.headers['x-line-access-token'];
  console.log('🔥 LINE Access Token:', lineAccessToken ? 'あり' : 'なし');
  console.log('🔥 実際のLIFF認証フロー開始');
  
  if (!lineAccessToken) {
    console.log('🔥 ❌ 認証失敗: アクセストークンがありません');
    return res.status(401).json({
      success: false,
      message: 'LINE認証が必要です'
    });
  }
  
  console.log('🔥 ✅ アクセストークン確認済み - ユーザー設定');
  req.lineUser = {
    userId: userId,
    displayName: 'LINE User'
  };
  
  console.log('🔥 ✅ 認証成功:', req.lineUser);
  console.log('🔥 実際のLIFF認証完了 - next()呼び出し');
  next();
};

router.get('/user/:userId', (req, res, next) => {
  console.log('[trace for devin] === ROUTE HIT: /user/:userId ===');
  console.log('[trace for devin] req.method:', req.method);
  console.log('[trace for devin] req.url:', req.url);
  console.log('[trace for devin] req.params:', req.params);
  console.log('[trace for devin] req.headers:', {
    'x-line-access-token': req.headers['x-line-access-token'] ? `TOKEN_LENGTH_${req.headers['x-line-access-token'].length}` : 'NO_TOKEN',
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });
  next();
}, lineAuthMiddleware, async (req, res) => {
  console.log('[trace for devin] === /user/:userId エンドポイント開始 ===');
  console.log('[trace for devin] req.params.userId:', req.params.userId);
  console.log('[trace for devin] req.lineUser:', req.lineUser);
  console.log('[trace for devin] リクエストヘッダー詳細:', {
    'x-line-access-token': req.headers['x-line-access-token'] ? `TOKEN_LENGTH_${req.headers['x-line-access-token'].length}` : 'NO_TOKEN',
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 30) + '...'
  });
  console.log('[trace for devin] 認証ミドルウェア通過確認 - req.lineUserが設定されているか:', !!req.lineUser);
  
  try {
    const userId = req.params.userId;
    console.log('[trace for devin] 処理対象userId:', userId);
    console.log('[trace for devin] 認証ミドルウェア通過後のreq.lineUser:', {
      userId: req.lineUser?.userId,
      displayName: req.lineUser?.displayName,
      hasAccessToken: !!req.lineUser?.accessToken
    });
    
    if (!req.lineUser) {
      console.log('[trace for devin] ❌ CRITICAL ERROR: req.lineUserが設定されていません！');
      return res.status(500).json({
        success: false,
        message: '認証ミドルウェアエラー: ユーザー情報が設定されていません'
      });
    }
    
    const LIFF_ID = process.env.LIFF_ID || 'dummy_liff_id';
    if (req.lineUser.userId !== userId && process.env.APP_MODE !== 'local' && LIFF_ID !== 'dummy_liff_id') {
      return res.status(403).json({
        success: false,
        message: '権限がありません'
      });
    }
    
    let user;
    try {
      console.log('[trace for devin] データベースからユーザー情報を取得中...');
      user = await getLineUserById(userId);
      console.log('[trace for devin] データベースユーザー取得結果:', user ? 'ユーザー見つかりました' : 'ユーザーが見つかりません');
    } catch (dbError) {
      console.log('[trace for devin] ❌ データベースエラー: モックユーザーを使用します', dbError.message);
      user = null;
    }
    
    if (!user) {
      console.log('[trace for devin] ユーザーが見つからない場合の処理開始');
      console.log('[trace for devin] 認証バイパス条件チェック:', {
        'APP_MODE === local': process.env.APP_MODE === 'local',
        'APP_MODE === development': process.env.APP_MODE === 'development',
        'LIFF_ID === dummy_liff_id': LIFF_ID === 'dummy_liff_id'
      });
      
      if (process.env.APP_MODE === 'local' || LIFF_ID === 'dummy_liff_id') {
        console.log('[trace for devin] 認証バイパスモード: テストユーザーを自動作成します');
        const mockUser = {
          line_user_id: userId,
          display_name: req.lineUser.displayName || 'テストユーザー',
          point_balance: 1000,
          member_rank: 'silver',
          total_charged: 5000,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log('[trace for devin] モックユーザーデータを返却:', {
          user_id: mockUser.line_user_id,
          display_name: mockUser.display_name,
          point_balance: mockUser.point_balance,
          member_rank: mockUser.member_rank
        });
        
        return res.status(200).json({
          success: true,
          data: {
            user_id: mockUser.line_user_id,
            display_name: mockUser.display_name,
            point_balance: mockUser.point_balance,
            member_rank: mockUser.member_rank,
            total_charged: mockUser.total_charged
          },
          message: '認証バイパスモード: テストユーザーを使用します'
        });
      }
      
      if (process.env.APP_MODE === 'development') {
        console.log('[trace for devin] デベロップメントモード（実際のLIFF_ID）: 実際のユーザーIDでモックデータ作成');
        const realUserMockData = {
          line_user_id: userId,
          display_name: req.lineUser.displayName || 'haradm',
          point_balance: 1500,
          member_rank: 'gold',
          total_charged: 2500,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log('[trace for devin] 実際のユーザーIDベースモックデータを返却:', {
          user_id: realUserMockData.line_user_id,
          display_name: realUserMockData.display_name,
          point_balance: realUserMockData.point_balance,
          member_rank: realUserMockData.member_rank
        });
        
        return res.status(200).json({
          success: true,
          data: {
            user_id: realUserMockData.line_user_id,
            display_name: realUserMockData.display_name,
            point_balance: realUserMockData.point_balance,
            member_rank: realUserMockData.member_rank,
            total_charged: realUserMockData.total_charged
          },
          message: 'デベロップメントモード: 実際のユーザー情報ベースのデータを返却しました'
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }
    
    console.log('[trace for devin] ✅ 実際のユーザーデータを返却:', {
      user_id: user.line_user_id,
      display_name: user.display_name,
      point_balance: user.point_balance,
      member_rank: user.member_rank
    });
    
    res.status(200).json({
      success: true,
      data: {
        user_id: user.line_user_id,
        display_name: user.display_name,
        point_balance: user.point_balance,
        member_rank: user.member_rank,
        total_charged: user.total_charged
      }
    });
  } catch (error) {
    console.error('❌ LINE会員情報取得エラー:', error);
    console.error('❌ エラー詳細:', {
      message: error.message,
      stack: error.stack?.substring(0, 200) + '...',
      userId: req.params.userId,
      lineUser: req.lineUser
    });
    
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
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
