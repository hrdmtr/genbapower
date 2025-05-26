const { MongoClient, ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./database');

/**
 * サーバー設定を取得する関数
 * @returns {Promise<object>} サーバー設定データ
 */
async function getServerSettings() {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('server_settings');
    
    const settings = await collection.findOne({});
    return settings;
  } catch (error) {
    console.error('サーバー設定の取得エラー:', error);
    throw error;
  }
}

/**
 * サーバー設定を保存する関数
 * @param {object} settingsData 設定データ
 * @returns {Promise<object>} 保存結果
 */
async function saveServerSettings(settingsData) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('server_settings');
    
    const existingSettings = await collection.findOne({});
    
    const settingsWithTimestamp = {
      ...settingsData,
      updatedAt: new Date()
    };
    
    let result;
    
    if (existingSettings) {
      result = await collection.updateOne(
        { _id: existingSettings._id },
        { $set: settingsWithTimestamp }
      );
      console.log(`サーバー設定を更新しました。ID: ${existingSettings._id}`);
    } else {
      settingsWithTimestamp.createdAt = new Date();
      result = await collection.insertOne(settingsWithTimestamp);
      console.log(`サーバー設定を新規作成しました。ID: ${result.insertedId}`);
    }
    
    return result;
  } catch (error) {
    console.error('サーバー設定の保存エラー:', error);
    throw error;
  }
}

module.exports = {
  getServerSettings,
  saveServerSettings
};
