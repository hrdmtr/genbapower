const express = require('express');
const router = express.Router();
const { getLineUserById, saveOrUpdateLineUser, updateLineUserPoints, getLineUserTransactions } = require('../services/line-users');
const { validateChargeTicket, useChargeTicket } = require('../services/charge-tickets');

const lineAuthMiddleware = (req, res, next) => {
  const APP_MODE = process.env.APP_MODE || 'development';
  
  console.log(`🔍 === バックエンド認証チェック開始 ===`);
  console.log('🔍 リクエストパス:', req.path);
  console.log('🔍 リクエストメソッド:', req.method);
  console.log('🔍 APP_MODE:', APP_MODE);
  console.log('🔍 Query params:', JSON.stringify(req.query, null, 2));
  console.log('🔍 Body params:', JSON.stringify(req.body, null, 2));
  console.log('🔍 URL params:', JSON.stringify(req.params, null, 2));
  console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  
  const body = req.body || {};
  const query = req.query || {};
  const userId = body.user_id || query.user_id || req.params.userId;
  
  console.log('Extracted user_id:', userId);
  
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
  if (LIFF_ID === 'dummy_liff_id') {
    console.log('DUMMY LIFF_ID検出: バックエンド認証をバイパスします');
    
    req.lineUser = {
      userId: userId || 'U1234567890abcdef',
      displayName: 'テストユーザー（LIFF設定未完了）'
    };
    
    console.log('設定されたユーザー:', req.lineUser);
    return next();
  }
  
  const lineAccessToken = req.headers['x-line-access-token'];
  console.log('LINE Access Token:', lineAccessToken ? 'あり' : 'なし');
  
  if (!lineAccessToken) {
    console.log('認証失敗: アクセストークンがありません');
    return res.status(401).json({
      success: false,
      message: 'LINE認証が必要です'
    });
  }
  
  req.lineUser = {
    userId: userId,
    displayName: 'LINE User'
  };
  
  console.log('認証成功:', req.lineUser);
  next();
};

router.get('/user/:userId', lineAuthMiddleware, async (req, res) => {
  try {
    console.log('🚀 === ユーザー情報取得API開始 ===');
    const userId = req.params.userId;
    console.log('🚀 取得対象ユーザーID:', userId);
    console.log('🚀 認証済みユーザー情報:', JSON.stringify(req.lineUser, null, 2));
    
    const LIFF_ID = process.env.LIFF_ID || 'dummy_liff_id';
    console.log('🚀 LIFF_ID:', LIFF_ID);
    console.log('🚀 APP_MODE:', process.env.APP_MODE);
    
    if (req.lineUser.userId !== userId && process.env.APP_MODE !== 'local' && LIFF_ID !== 'dummy_liff_id') {
      console.log('❌ 権限チェック失敗:', {
        requestedUserId: userId,
        authenticatedUserId: req.lineUser.userId,
        appMode: process.env.APP_MODE,
        liffId: LIFF_ID
      });
      return res.status(403).json({
        success: false,
        message: '権限がありません'
      });
    }
    
    console.log('✅ 権限チェック通過');
    
    console.log('🔍 データベースからユーザー情報を取得中...');
    let user;
    try {
      user = await getLineUserById(userId);
      console.log('🔍 データベース検索結果:', user ? '見つかりました' : '見つかりませんでした');
      if (user) {
        console.log('🔍 取得したユーザー情報:', JSON.stringify({
          line_user_id: user.line_user_id,
          display_name: user.display_name,
          point_balance: user.point_balance,
          member_rank: user.member_rank,
          total_charged: user.total_charged
        }, null, 2));
      }
    } catch (dbError) {
      console.log('❌ データベースエラー: モックユーザーを使用します', dbError.message);
      console.log('❌ データベースエラー詳細:', dbError.stack);
      user = null;
    }
    
    if (!user) {
      console.log('📝 ユーザーが見つからない - バイパス条件をチェック');
      console.log('📝 バイパス条件:', {
        appMode: process.env.APP_MODE,
        liffId: LIFF_ID,
        isLocal: process.env.APP_MODE === 'local',
        isDummyLiff: LIFF_ID === 'dummy_liff_id'
      });
      
      if (process.env.APP_MODE === 'local' || LIFF_ID === 'dummy_liff_id') {
        console.log('✅ 認証バイパスモード: テストユーザーを自動作成します');
        const mockUser = {
          line_user_id: userId,
          display_name: req.lineUser.displayName || 'テストユーザー',
          point_balance: 1000,
          member_rank: 'silver',
          total_charged: 5000,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log('✅ 作成するモックユーザー:', JSON.stringify(mockUser, null, 2));
        
        const responseData = {
          success: true,
          data: {
            user_id: mockUser.line_user_id,
            display_name: mockUser.display_name,
            point_balance: mockUser.point_balance,
            member_rank: mockUser.member_rank,
            total_charged: mockUser.total_charged
          },
          message: '認証バイパスモード: テストユーザーを使用します'
        };
        
        console.log('✅ APIレスポンス送信:', JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);
      }
      
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }
    
    console.log('✅ 既存ユーザー情報でレスポンス作成');
    const responseData = {
      success: true,
      data: {
        user_id: user.line_user_id,
        display_name: user.display_name,
        point_balance: user.point_balance,
        member_rank: user.member_rank,
        total_charged: user.total_charged
      }
    };
    
    console.log('✅ APIレスポンス送信:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ LINE会員情報取得エラー:', error);
    console.error('❌ エラースタック:', error.stack);
    
    const errorResponse = {
      success: false,
      message: 'サーバーエラーが発生しました',
      debug: error.message
    };
    
    console.log('❌ エラーレスポンス送信:', JSON.stringify(errorResponse, null, 2));
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
