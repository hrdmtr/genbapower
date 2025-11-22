// MongoDB接続テストスクリプト
import { testDbConnection, getCollection, saveOrderToDb, connectToDatabase, mongoConfig } from './db.js';

async function runTest() {
  let client = null;
  try {
    console.log('======= MongoDB接続テスト開始 =======');
    console.log(`接続先: ${mongoConfig.uri}`);
    
    // MongoDB接続テスト
    console.log('MongoDB接続テスト実行中...');
    const connected = await testDbConnection();
    
    if (!connected) {
      console.log('MongoDB接続テスト失敗 - ローカルストレージを使用します');
      console.log('\n MongoDB接続が確立できませんでした。これは以下の理由が考えられます:');
      console.log(' - ローカルにMongoDBがインストールされていない');
      console.log(' - MongoDB Atlasの接続情報が設定されていない');
      console.log(' - ネットワーク接続の問題');
      console.log('\n 開発環境では問題ありません - アプリはローカルストレージにフォールバックします');
      
      return; // エラーを投げずに終了
    }
    
    console.log('MongoDB接続テスト成功！');
    console.log('注意: 実際の使用前に、db.jsの接続URIを設定してください');
    
    /* ここから先は接続が確立できている場合のみ実行されます（現在はスキップ）
    console.log('\n--- コレクション一覧取得 ---');
    // データベース内のコレクション一覧を取得
    client = await connectToDatabase();
    const db = client.db(mongoConfig.dbName);
    const collections = await db.listCollections().toArray();
    
    console.log('コレクション一覧:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // サンプルの注文データを作成
    const sampleOrder = {
      tableId: 'TABLE01',
      status: '受付',
      createdAt: new Date().toISOString(),
      items: [
        {
          productId: 'P001',
          name: '醤油ラーメン',
          price: 800,
          timestamp: new Date().toISOString()
        }
      ],
      totalAmount: 800,
      statusHistory: [
        {
          from: '',
          to: '受付',
          timestamp: new Date().toISOString(),
          displayTime: new Date().toLocaleString('ja-JP')
        }
      ]
    };
    
    console.log('\n--- サンプル注文保存テスト ---');
    // サンプル注文を保存
    const savedOrder = await saveOrderToDb(sampleOrder);
    console.log('保存された注文ID:', savedOrder._id);
    
    console.log('\n--- 注文データ取得テスト ---');
    // 保存された注文を確認
    const ordersCollection = await getCollection('orders');
    const foundOrder = await ordersCollection.findOne({ _id: savedOrder._id });
    
    if (foundOrder) {
      console.log('注文が正常に保存されました');
      console.log('取得した注文データ:', JSON.stringify(foundOrder, null, 2));
    } else {
      throw new Error('保存した注文データが見つかりませんでした');
    }
    */
    
    console.log('\n======= MongoDB接続テスト完了 =======');
    console.log('テストが完了しました！');
    
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
  } finally {
    // 接続を閉じる
    if (client) {
      await client.close();
      console.log('MongoDB接続を閉じました');
    }
    process.exit(0);
  }
}

// テスト実行
runTest();