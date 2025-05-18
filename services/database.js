const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const mongoConfig = require('../config/mongodb.config');

let client = null;
let db = null;

/**
 * MongoDB接続関数
 * @returns {Promise<object>} データベース接続オブジェクト
 */
async function connectToMongoDB() {
  try {
    if (!client) {
      const certPath = path.resolve(__dirname, '..', mongoConfig.options.tlsCertificateKeyFile);
      
      client = new MongoClient(mongoConfig.uri, {
        ...mongoConfig.options,
        tlsCertificateKeyFile: certPath
      });
      
      await client.connect();
      console.log('MongoDB接続成功');
      
      db = client.db(mongoConfig.dbName);
    }
    
    return db;
  } catch (error) {
    console.error('MongoDB接続エラー:', error);
    throw error;
  }
}

/**
 * 注文データを保存する関数
 * @param {object} orderData 注文データ
 * @returns {Promise<object>} 保存結果
 */
async function saveOrder(orderData) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection(mongoConfig.collection);
    
    const orderWithTimestamp = {
      ...orderData,
      timestamp: new Date()
    };
    
    const result = await collection.insertOne(orderWithTimestamp);
    console.log(`注文データをMongoDBに保存しました。ID: ${result.insertedId}`);
    return result;
  } catch (error) {
    console.error('注文データの保存エラー:', error);
    throw error;
  }
}

/**
 * MongoDB接続を閉じる関数
 */
async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB接続を閉じました');
  }
}

module.exports = {
  connectToMongoDB,
  saveOrder,
  closeMongoDB
};
