const { MongoClient, ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./database');

/**
 * ユーザデータを取得する関数
 * @param {object} query 検索クエリ（オプション）
 * @param {number} limit 取得件数の上限（オプション）
 * @returns {Promise<Array>} ユーザデータの配列
 */
async function getUsers(query = {}, limit = 100, sortOptions = {}) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('users');
    
    let cursor = collection.find(query);
    
    if (Object.keys(sortOptions).length > 0) {
      cursor = cursor.sort(sortOptions);
    }
    
    const users = await cursor.limit(limit).toArray();
    return users;
  } catch (error) {
    console.error('ユーザデータの取得エラー:', error);
    throw error;
  }
}

/**
 * ユーザデータを取得する関数
 * @param {string} userId ユーザIDまたはObjectID
 * @returns {Promise<object>} ユーザデータ
 */
async function getUserById(userId) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('users');
    
    let query = { userId };
    
    if (ObjectId.isValid(userId)) {
      const user = await collection.findOne({ _id: new ObjectId(userId) });
      if (user) return user;
    }
    
    return await collection.findOne(query);
  } catch (error) {
    console.error('ユーザデータの取得エラー:', error);
    throw error;
  }
}

/**
 * ユーザデータを保存する関数
 * @param {object} userData ユーザデータ
 * @returns {Promise<object>} 保存結果
 */
async function saveUser(userData) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('users');
    
    const userWithTimestamp = {
      ...userData,
      registrationDate: userData.registrationDate || new Date(),
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(userWithTimestamp);
    console.log(`ユーザデータをMongoDBに保存しました。ID: ${result.insertedId}`);
    return result;
  } catch (error) {
    console.error('ユーザデータの保存エラー:', error);
    throw error;
  }
}

/**
 * ユーザデータを更新する関数
 * @param {string} userId ユーザIDまたはObjectID
 * @param {object} userData 更新するユーザデータ
 * @returns {Promise<object>} 更新結果
 */
async function updateUser(userId, userData) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('users');
    
    let filter = { userId };
    
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }
    
    const result = await collection.updateOne(
      filter,
      { $set: userData }
    );
    
    if (result.matchedCount === 0) {
      throw new Error(`ユーザID ${userId} が見つかりません`);
    }
    
    console.log(`ユーザデータを更新しました。ID: ${userId}`);
    return result;
  } catch (error) {
    console.error('ユーザデータの更新エラー:', error);
    throw error;
  }
}

/**
 * ユーザデータを削除する関数
 * @param {string} userId ユーザIDまたはObjectID
 * @returns {Promise<object>} 削除結果
 */
async function deleteUser(userId) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('users');
    
    let filter = { userId };
    
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }
    
    const result = await collection.deleteOne(filter);
    
    if (result.deletedCount === 0) {
      throw new Error(`ユーザID ${userId} が見つかりません`);
    }
    
    console.log(`ユーザデータを削除しました。ID: ${userId}`);
    return result;
  } catch (error) {
    console.error('ユーザデータの削除エラー:', error);
    throw error;
  }
}

module.exports = {
  getUsers,
  getUserById,
  saveUser,
  updateUser,
  deleteUser
};
