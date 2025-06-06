const { MongoClient, ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./database');

/**
 * サーバー設定を取得する関数
 * @returns {Promise<object>} サーバー設定データ
 */
async function getServerSettings() {
  try {
    const db = await connectToMongoDB();
    
    if (!db) {
      console.log('MongoDB接続が利用できないため、デフォルト設定を使用します');
      return {
        appName: 'QRコードリーダー注文システム',
        appNameDescription: 'アプリケーションの名前',
        baseUrl: 'http://localhost:8000',
        baseUrlDescription: 'APIリクエストのベースURL',
        recordsPerPage: 20,
        recordsPerPageDescription: '1ページあたりの表示件数',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    try {
      const collection = db.collection('server_settings');
      
      // 設定は1つのドキュメントとして保存
      const settings = await collection.findOne({});
      return settings;
    } catch (dbError) {
      console.error('データベースアクセスエラー:', dbError);
      return {
        appName: 'QRコードリーダー注文システム',
        appNameDescription: 'アプリケーションの名前',
        baseUrl: 'http://localhost:8000',
        baseUrlDescription: 'APIリクエストのベースURL',
        recordsPerPage: 20,
        recordsPerPageDescription: '1ページあたりの表示件数',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  } catch (error) {
    console.error('サーバー設定の取得エラー:', error);
    return {
      appName: 'QRコードリーダー注文システム',
      appNameDescription: 'アプリケーションの名前',
      baseUrl: 'http://localhost:8000',
      baseUrlDescription: 'APIリクエストのベースURL',
      recordsPerPage: 20,
      recordsPerPageDescription: '1ページあたりの表示件数',
      createdAt: new Date(),
      updatedAt: new Date()
    };
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
    
    if (!db) {
      console.log('MongoDB接続が利用できないため、設定を保存できません');
      return { acknowledged: true, mockSave: true };
    }
    
    try {
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
    } catch (dbError) {
      console.error('データベースアクセスエラー:', dbError);
      return { acknowledged: true, mockSave: true };
    }
  } catch (error) {
    console.error('サーバー設定の保存エラー:', error);
    return { acknowledged: true, mockSave: true };
  }
}

module.exports = {
  getServerSettings,
  saveServerSettings
};
