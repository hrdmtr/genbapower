const { MongoClient, ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./database');

/**
 * LINE会員情報を取得する関数
 * @param {string} lineUserId LINE User ID
 * @returns {Promise<object>} LINE会員情報
 */
async function getLineUserById(lineUserId) {
  try {
    const db = await connectToMongoDB();
    if (!db) {
      console.error('データベース接続が確立できませんでした');
      return null;
    }
    
    if (!await collectionExists(db, 'line_users')) {
      await db.createCollection('line_users');
      console.log('line_usersコレクションを作成しました');
    }
    
    const collection = db.collection('line_users');
    return await collection.findOne({ line_user_id: lineUserId });
  } catch (error) {
    console.error('LINE会員情報の取得エラー:', error);
    return null;
  }
}

/**
 * コレクションが存在するか確認する関数
 * @param {object} db データベース接続
 * @param {string} collectionName コレクション名
 * @returns {Promise<boolean>} 存在するかどうか
 */
async function collectionExists(db, collectionName) {
  try {
    const collections = await db.listCollections({ name: collectionName }).toArray();
    return collections.length > 0;
  } catch (error) {
    console.error(`コレクション確認エラー (${collectionName}):`, error);
    return false;
  }
}

/**
 * LINE会員情報を保存または更新する関数
 * @param {object} lineUserData LINE会員データ
 * @returns {Promise<object>} 保存結果
 */
async function saveOrUpdateLineUser(lineUserData) {
  try {
    const db = await connectToMongoDB();
    if (!db) {
      console.error('データベース接続が確立できませんでした');
      return null;
    }
    
    if (!await collectionExists(db, 'line_users')) {
      await db.createCollection('line_users');
      console.log('line_usersコレクションを作成しました');
    }
    
    const collection = db.collection('line_users');
    
    const { line_user_id, display_name } = lineUserData;
    
    if (!line_user_id) {
      console.error('LINE User IDは必須です');
      return { error: 'LINE User IDは必須です' };
    }
    
    const existingUser = await collection.findOne({ line_user_id });
    
    if (existingUser) {
      const result = await collection.updateOne(
        { line_user_id },
        { 
          $set: {
            ...lineUserData,
            updated_at: new Date()
          }
        }
      );
      
      console.log(`LINE会員情報を更新しました。ID: ${line_user_id}`);
      return { updated: true, result };
    } else {
      const newUser = {
        ...lineUserData,
        point_balance: lineUserData.point_balance || 0,
        member_rank: lineUserData.member_rank || 'bronze',
        total_charged: lineUserData.total_charged || 0,
        status: lineUserData.status || 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await collection.insertOne(newUser);
      console.log(`LINE会員情報を新規作成しました。ID: ${line_user_id}`);
      return { created: true, result };
    }
  } catch (error) {
    console.error('LINE会員情報の保存エラー:', error);
    return { error: error.message };
  }
}

/**
 * LINE会員のポイント残高を更新する関数
 * @param {string} lineUserId LINE User ID
 * @param {number} amount 変更するポイント量（正の値で増加、負の値で減少）
 * @param {string} transactionType 取引タイプ（'charge', 'use', 'expire'）
 * @param {string} description 取引の説明
 * @param {string} ticketId チャージ券ID（チャージの場合のみ）
 * @returns {Promise<object>} 更新結果と更新後のユーザー情報
 */
async function updateLineUserPoints(lineUserId, amount, transactionType, description, ticketId = null) {
  const APP_MODE = process.env.APP_MODE || 'development';
  
  try {
    const db = await connectToMongoDB();
    const userCollection = db.collection('line_users');
    const transactionCollection = db.collection('point_transactions');
    
    const user = await userCollection.findOne({ line_user_id: lineUserId });
    
    if (!user) {
      throw new Error(`LINE User ID ${lineUserId} が見つかりません`);
    }
    
    const newBalance = user.point_balance + amount;
    
    if (newBalance < 0) {
      throw new Error('ポイント残高が不足しています');
    }
    
    if (APP_MODE === 'local') {
      const updateResult = await userCollection.updateOne(
        { line_user_id: lineUserId },
        { 
          $set: {
            point_balance: newBalance,
            updated_at: new Date()
          },
          $inc: transactionType === 'charge' ? { total_charged: amount } : {}
        }
      );
      
      if (transactionType === 'charge') {
        const newTotalCharged = user.total_charged + amount;
        let newRank = user.member_rank;
        
        if (newTotalCharged >= 10000) {
          newRank = 'gold';
        } else if (newTotalCharged >= 5000) {
          newRank = 'silver';
        } else {
          newRank = 'bronze';
        }
        
        if (newRank !== user.member_rank) {
          await userCollection.updateOne(
            { line_user_id: lineUserId },
            { $set: { member_rank: newRank } }
          );
        }
      }
      
      const transaction = {
        user_id: lineUserId,
        transaction_type: transactionType,
        amount,
        balance_after: newBalance,
        ticket_id: ticketId,
        description,
        created_at: new Date()
      };
      
      await transactionCollection.insertOne(transaction);
      
      const updatedUser = await userCollection.findOne({ line_user_id: lineUserId });
      
      return {
        success: true,
        user: updatedUser,
        transaction
      };
    }
    
    const session = db.client.startSession();
    
    try {
      session.startTransaction();
      
      const updateResult = await userCollection.updateOne(
        { line_user_id: lineUserId },
        { 
          $set: {
            point_balance: newBalance,
            updated_at: new Date()
          },
          $inc: transactionType === 'charge' ? { total_charged: amount } : {}
        },
        { session }
      );
      
      if (transactionType === 'charge') {
        const newTotalCharged = user.total_charged + amount;
        let newRank = user.member_rank;
        
        if (newTotalCharged >= 10000) {
          newRank = 'gold';
        } else if (newTotalCharged >= 5000) {
          newRank = 'silver';
        } else {
          newRank = 'bronze';
        }
        
        if (newRank !== user.member_rank) {
          await userCollection.updateOne(
            { line_user_id: lineUserId },
            { $set: { member_rank: newRank } },
            { session }
          );
        }
      }
      
      const transaction = {
        user_id: lineUserId,
        transaction_type: transactionType,
        amount,
        balance_after: newBalance,
        ticket_id: ticketId,
        description,
        created_at: new Date()
      };
      
      await transactionCollection.insertOne(transaction, { session });
      
      await session.commitTransaction();
      
      const updatedUser = await userCollection.findOne({ line_user_id: lineUserId });
      
      return {
        success: true,
        user: updatedUser,
        transaction
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('ポイント更新エラー:', error);
    throw error;
  }
}

/**
 * LINE会員のポイント取引履歴を取得する関数
 * @param {string} lineUserId LINE User ID
 * @param {number} limit 取得件数の上限（オプション）
 * @param {number} offset スキップする件数（オプション）
 * @returns {Promise<Array>} 取引履歴の配列
 */
async function getLineUserTransactions(lineUserId, limit = 20, offset = 0) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('point_transactions');
    
    const transactions = await collection.find({ user_id: lineUserId })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    const total = await collection.countDocuments({ user_id: lineUserId });
    
    return {
      transactions,
      total
    };
  } catch (error) {
    console.error('取引履歴取得エラー:', error);
    throw error;
  }
}

module.exports = {
  getLineUserById,
  saveOrUpdateLineUser,
  updateLineUserPoints,
  getLineUserTransactions
};
