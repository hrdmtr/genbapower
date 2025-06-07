import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB configuration
const mongoConfig = {
  uri: "mongodb+srv://cluster0.5gmgchv.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority",
  dbName: "genbapower",
  options: {
    tlsCertificateKeyFile: "./config/certs/mongodb.pem",
    serverApi: { version: '1' }
  },
  collection: "orders"
};

// Global variables
let client = null;
let db = null;

/**
 * MongoDB接続関数
 * @returns {Promise<object>} データベース接続オブジェクト
 */
async function connectToMongoDB() {
  try {
    if (!client) {
      const certPath = resolve(__dirname, '..', mongoConfig.options.tlsCertificateKeyFile);
      
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
      orderDate: orderData.orderDate || new Date()
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

async function testMongoDBConnection() {
  try {
    console.log('MongoDB接続テストを開始します...');
    
    const db = await connectToMongoDB();
    console.log('データベースに接続しました');
    
    const adminDb = db.admin();
    const pingResult = await adminDb.ping();
    console.log('Ping結果:', pingResult);
    
    if (pingResult.ok === 1) {
      console.log('MongoDB接続成功！サーバーは正常に動作しています');
      
      const collections = await db.listCollections().toArray();
      console.log('コレクション一覧:');
      collections.forEach(col => console.log(`- ${col.name}`));
      
      console.log('接続テスト成功');
    } else {
      console.error('MongoDB ping失敗');
    }
    
  } catch (error) {
    console.error('MongoDB接続テストエラー:', error);
  }
}

async function testAddOrder() {
  try {
    console.log('\n注文追加テストを開始します...');
    
    // テスト用の注文データ (英語のカラム名を使用)
    const testOrder = {
      tableNumber: 'TABLE01',
      orderDate: new Date(),
      status: 'PENDING',
      productId: 12345
    };
    
    // 注文を保存
    const result = await saveOrder(testOrder);
    
    if (result && result.insertedId) {
      console.log('注文追加テスト成功！');
      console.log(`挿入されたID: ${result.insertedId}`);
      return result.insertedId;
    } else {
      console.error('注文追加テスト失敗: 結果が不正です');
    }
  } catch (error) {
    console.error('注文追加テストエラー:', error);
  }
}

async function testGetOrders() {
  try {
    console.log('\n注文一覧取得テストを開始します...');
    
    // 注文一覧を取得
    const orders = await getOrders({}, 10);
    
    console.log(`取得した注文数: ${orders.length}`);
    if (orders.length > 0) {
      console.log('最新の注文:');
      console.log(JSON.stringify(orders[0], null, 2));
      console.log('注文一覧取得テスト成功！');
    } else {
      console.log('注文がまだ保存されていません');
    }
  } catch (error) {
    console.error('注文一覧取得テストエラー:', error);
  }
}

async function runTests() {
  try {
    // 接続テスト
    await testMongoDBConnection();
    
    // 注文追加テスト
    const insertedId = await testAddOrder();
    
    // 注文一覧取得テスト
    await testGetOrders();
    
    // 終了
    await closeMongoDB();
    console.log('\nすべてのテストが完了しました');
  } catch (error) {
    console.error('テスト実行エラー:', error);
    await closeMongoDB();
  }
}

// Run tests
runTests();
