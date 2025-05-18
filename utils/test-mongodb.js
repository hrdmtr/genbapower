const { connectToMongoDB, closeMongoDB, saveOrder } = require('../services/database');

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
    
    await closeMongoDB();
    
  } catch (error) {
    console.error('MongoDB接続テストエラー:', error);
  }
}

async function testAddOrder() {
  try {
    console.log('\n注文追加テストを開始します...');
    
    // テスト用の注文データ
    const testOrder = {
      orderId: 'TEST123',
      table: 'TABLE01',
      menu: 'RAMEN_SHOYU'
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
    
    const db = await connectToMongoDB();
    const mongoConfig = require('../config/mongodb.config');
    const collection = db.collection(mongoConfig.collection);
    
    // 注文一覧を取得
    const orders = await collection.find({}).limit(10).toArray();
    
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

runTests();
