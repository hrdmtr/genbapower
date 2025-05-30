const express = require('express');
const router = express.Router();
const { getLineUserById, saveOrUpdateLineUser, updateLineUserPoints, getLineUserTransactions } = require('../services/line-users');
const { validateChargeTicket, useChargeTicket } = require('../services/charge-tickets');

const lineAuthMiddleware = (req, res, next) => {
  const APP_MODE = process.env.APP_MODE || 'development';
  
  const body = req.body || {};
  const query = req.query || {};
  const userId = body.user_id || query.user_id || req.params.userId;
  
  if (APP_MODE === 'local') {
    console.log('ローカルモード: LINE認証をバイパスします');
    
    req.lineUser = {
      userId: userId || 'U1234567890abcdef',
      displayName: 'テストユーザー'
    };
    
    return next();
  }
  
  const lineAccessToken = req.headers['x-line-access-token'];
  
  if (!lineAccessToken) {
    return res.status(401).json({
      success: false,
      message: 'LINE認証が必要です'
    });
  }
  
  
  req.lineUser = {
    userId: userId,
    displayName: 'LINE User'
  };
  
  next();
};

router.get('/user/:userId', lineAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (req.lineUser.userId !== userId && process.env.APP_MODE !== 'local') {
      return res.status(403).json({
        success: false,
        message: '権限がありません'
      });
    }
    
    const user = await getLineUserById(userId);
    
    if (!user) {
      if (process.env.APP_MODE === 'local') {
        console.log('ローカルモード: テストユーザーを自動作成します');
        const mockUser = {
          line_user_id: userId,
          display_name: 'テストユーザー',
          point_balance: 1000,
          member_rank: 'silver',
          total_charged: 5000,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        return res.status(200).json({
          success: true,
          data: {
            user_id: mockUser.line_user_id,
            display_name: mockUser.display_name,
            point_balance: mockUser.point_balance,
            member_rank: mockUser.member_rank,
            total_charged: mockUser.total_charged
          },
          message: 'ローカルモード: テストユーザーを使用します'
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }
    
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
    console.error('LINE会員情報取得エラー:', error);
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
