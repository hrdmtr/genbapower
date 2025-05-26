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
    
    // 設定は1つのドキュメントとして保存
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
    const historyCollection = db.collection('server_settings_history');
    
    // 既存の設定を確認
    const existingSettings = await collection.findOne({});
    
    const settingsWithTimestamp = {
      ...settingsData,
      updatedAt: new Date()
    };
    
    let result;
    
    if (existingSettings) {
      // 既存の設定を履歴に保存
      await historyCollection.insertOne({
        ...existingSettings,
        archivedAt: new Date()
      });
      console.log(`サーバー設定の履歴を保存しました。ID: ${existingSettings._id}`);
      
      // 既存の設定を更新
      result = await collection.updateOne(
        { _id: existingSettings._id },
        { $set: settingsWithTimestamp }
      );
      console.log(`サーバー設定を更新しました。ID: ${existingSettings._id}`);
    } else {
      // 新規設定を作成
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
