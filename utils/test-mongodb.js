const { connectToMongoDB, closeMongoDB } = require('../services/database');

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

testMongoDBConnection();
