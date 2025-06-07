const { MongoClient, ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./database');
const { v4: uuidv4 } = require('uuid');

/**
 * チャージ券を取得する関数
 * @param {string} ticketId チャージ券ID
 * @returns {Promise<object>} チャージ券データ
 */
async function getChargeTicketById(ticketId) {
  try {
    const db = await connectToMongoDB();
    if (!db) {
      console.error('データベース接続が確立できませんでした');
      return null;
    }
    
    if (!await collectionExists(db, 'charge_tickets')) {
      await db.createCollection('charge_tickets');
      console.log('charge_ticketsコレクションを作成しました');
    }
    
    const collection = db.collection('charge_tickets');
    return await collection.findOne({ ticket_id: ticketId });
  } catch (error) {
    console.error('チャージ券取得エラー:', error);
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
 * チャージ券を作成する関数
 * @param {number} amount チャージ金額
 * @param {string} customTicketId カスタムチケットID（オプション）
 * @param {string} customPasscode カスタムパスコード（オプション）
 * @returns {Promise<object>} 作成されたチャージ券
 */
async function createChargeTicket(amount, customTicketId = null, customPasscode = null) {
  try {
    const db = await connectToMongoDB();
    if (!db) {
      console.error('データベース接続が確立できませんでした');
      return null;
    }
    
    if (!await collectionExists(db, 'charge_tickets')) {
      await db.createCollection('charge_tickets');
      console.log('charge_ticketsコレクションを作成しました');
    }
    
    const collection = db.collection('charge_tickets');
    
    const ticket_id = customTicketId || uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    const passcode = customPasscode || Math.floor(100000 + Math.random() * 900000).toString();
    
    const ticket = {
      ticket_id,
      passcode,
      amount,
      issued_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
      used_at: null,
      used_by_user_id: null,
      status: 'issued'
    };
    
    await collection.insertOne(ticket);
    
    console.log(`チャージ券を作成しました: ${ticket_id}`);
    return ticket;
  } catch (error) {
    console.error('チャージ券作成エラー:', error);
    return null;
  }
}

/**
 * チャージ券を検証する関数
 * @param {string} ticketId チャージ券ID
 * @param {string} passcode パスコード
 * @returns {Promise<object>} 検証結果
 */
async function validateChargeTicket(ticketId, passcode) {
  try {
    const db = await connectToMongoDB();
    if (!db) {
      console.error('データベース接続が確立できませんでした');
      return { valid: false, error: 'DATABASE_ERROR' };
    }
    
    if (!await collectionExists(db, 'charge_tickets')) {
      await db.createCollection('charge_tickets');
      console.log('charge_ticketsコレクションを作成しました');
      return { valid: false, error: 'INVALID_TICKET' };
    }
    
    const collection = db.collection('charge_tickets');
    
    const ticket = await collection.findOne({ ticket_id: ticketId });
    
    if (!ticket) {
      return { valid: false, error: 'INVALID_TICKET' };
    }
    
    if (ticket.status !== 'issued') {
      return { valid: false, error: 'USED_TICKET' };
    }
    
    if (ticket.expires_at < new Date()) {
      await collection.updateOne(
        { ticket_id: ticketId },
        { $set: { status: 'expired' } }
      );
      return { valid: false, error: 'EXPIRED_TICKET' };
    }
    
    if (ticket.passcode !== passcode) {
      return { valid: false, error: 'WRONG_PASSCODE' };
    }
    
    return { valid: true, amount: ticket.amount, ticket };
  } catch (error) {
    console.error('チャージ券検証エラー:', error);
    return { valid: false, error: 'SERVER_ERROR' };
  }
}

/**
 * チャージ券を使用済みにする関数
 * @param {string} ticketId チャージ券ID
 * @param {string} lineUserId 使用したユーザーのLINE User ID
 * @returns {Promise<object>} 更新結果
 */
async function useChargeTicket(ticketId, lineUserId) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('charge_tickets');
    
    const result = await collection.updateOne(
      { ticket_id: ticketId, status: 'issued' },
      {
        $set: {
          status: 'used',
          used_at: new Date(),
          used_by_user_id: lineUserId
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw new Error(`チャージ券 ${ticketId} が見つからないか、既に使用済みです`);
    }
    
    console.log(`チャージ券 ${ticketId} を使用済みにしました`);
    return result;
  } catch (error) {
    console.error('チャージ券使用エラー:', error);
    throw error;
  }
}

/**
 * テスト用チャージ券を作成または更新する関数
 * @returns {Promise<object>} テストチャージ券
 */
async function createOrUpdateTestTicket() {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('charge_tickets');
    
    const existingTicket = await collection.findOne({ ticket_id: 'TICKET123456789' });
    
    if (existingTicket) {
      await collection.updateOne(
        { ticket_id: 'TICKET123456789' },
        {
          $set: {
            status: 'issued',
            used_at: null,
            used_by_user_id: null,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後
          }
        }
      );
      
      console.log('テストチケットをリセットしました');
      return await collection.findOne({ ticket_id: 'TICKET123456789' });
    } else {
      return await createChargeTicket(1000, 'TICKET123456789', '123456');
    }
  } catch (error) {
    console.error('テストチケット作成エラー:', error);
    throw error;
  }
}

module.exports = {
  getChargeTicketById,
  createChargeTicket,
  validateChargeTicket,
  useChargeTicket,
  createOrUpdateTestTicket
};
