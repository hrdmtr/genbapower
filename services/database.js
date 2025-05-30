const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const appMode = process.env.APP_MODE || 'development';

let mongoConfig;
if (appMode === 'local') {
  console.log('ローカルモード: MongoDB接続設定を使用します');
  try {
    mongoConfig = require('../config/mongodb.local');
  } catch (err) {
    console.log('ローカル設定ファイルが見つからないため、デフォルト設定を使用します');
    mongoConfig = {
      uri: "mongodb://localhost:27017",
      dbName: "genbapower",
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      },
      collection: "orders"
    };
  }
} else {
  mongoConfig = require('../config/mongodb.config');
}

let client = null;
let db = null;

/**
 * MongoDB接続関数
 * @returns {Promise<object>} データベース接続オブジェクト
 */
async function connectToMongoDB() {
  try {
    if (!client) {
      let options = { ...mongoConfig.options };
      
      if (appMode !== 'local' && options.tlsCertificateKeyFile) {
        try {
          const certPath = path.resolve(__dirname, '..', options.tlsCertificateKeyFile);
          await fs.promises.access(certPath, fs.constants.F_OK);
          options.tlsCertificateKeyFile = certPath;
        } catch (certError) {
          console.warn('証明書ファイルが見つかりません。TLSなしで接続します:', certError.message);
          delete options.tlsCertificateKeyFile;
          delete options.tls;
        }
      }
      
      client = new MongoClient(mongoConfig.uri, options);
      
      await client.connect();
      console.log('MongoDB接続成功');
      
      db = client.db(mongoConfig.dbName);
    }
    
    return db;
  } catch (error) {
    console.error('MongoDB接続エラー:', error);
    return null;
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
 * 注文データを取得する関数
 * @param {object} query 検索クエリ（オプション）
 * @param {number} limit 取得件数の上限（オプション）
 * @returns {Promise<Array>} 注文データの配列
 */
async function getOrders(query = {}, limit = 100) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection(mongoConfig.collection);
    
    const orders = await collection.find(query).limit(limit).toArray();
    return orders;
  } catch (error) {
    console.error('注文データの取得エラー:', error);
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
  getOrders,
  closeMongoDB
};
