/**
 * MongoDB接続ユーティリティ
 * データベース接続と接続状態管理のための統一インターフェース
 */

// MongoDB設定
export const mongoConfig = {
  // URI設定（環境変数からの読み込みも検討）
  uri: "mongodb+srv://cluster0.5gmgchv.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=Cluster0",
  dbName: "genbapower",
  options: {
    // 証明書パスを環境に依存しない形に変更
    // 実際の環境ではこのパスを適切に設定するか、環境変数から取得することを推奨
    tlsCertificateKeyFile: "cert/mongodb-cert.pem"
  }
};

// 接続状態
let dbClient = null;
let dbAvailable = false;
let dbTested = false;
let connectionListeners = [];

/**
 * MongoDB接続状態の変更を通知するリスナーを登録
 * @param {Function} listener - 接続状態が変わったときに呼び出される関数
 */
export function addConnectionListener(listener) {
  connectionListeners.push(listener);
}

/**
 * 接続状態を更新して全リスナーに通知
 * @param {boolean} available - 接続可能かどうか
 */
function updateConnectionStatus(available) {
  dbAvailable = available;
  dbTested = true;
  
  // 全てのリスナーに通知
  connectionListeners.forEach(listener => {
    try {
      listener(available);
    } catch (err) {
      console.error('接続リスナーエラー:', err);
    }
  });
}

/**
 * MongoDB接続テスト
 * ブラウザとNode.js環境の両方で動作
 * @returns {Promise<boolean>} 接続成功ならtrue
 */
export async function testConnection() {
  // キャッシュされた接続状態をリセットして強制的に再テスト
  dbTested = false;
  dbAvailable = false;
  
  console.log('MongoDB接続確認中...');

  // ブラウザ環境の場合はモックを使用
  if (typeof window !== 'undefined') {
    return await testBrowserConnection();
  } else {
    return await testNodeConnection();
  }
}

/**
 * ブラウザ環境でのMongoDB接続テスト（モック）
 * @returns {Promise<boolean>} モック接続成功ならtrue
 */
async function testBrowserConnection() {
  console.log('ブラウザ環境でのモックMongoDB接続テスト実行');
  
  try {
    // モックのMongoDBクライアント
    const mockMongoClient = {
      uri: mongoConfig.uri,
      options: mongoConfig.options,
      
      connect: async function() {
        console.log('モックMongoDB接続を試みています...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('モックMongoDB接続成功');
        return this;
      },
      
      db: function(dbName) {
        console.log(`モックデータベース"${dbName}"にアクセス中`);
        return {
          admin: function() {
            return {
              ping: async function() { return { ok: 1 }; }
            };
          },
          collection: function(collectionName) {
            console.log(`モックコレクション"${collectionName}"にアクセス中`);
            return {
              find: function() { 
                console.log(`モックコレクション"${collectionName}"の検索を実行`);
                return { 
                  toArray: async () => {
                    console.log(`モックコレクション"${collectionName}"の検索結果を返します`);
                    if (collectionName === 'products') {
                      // products コレクションの場合はダミーデータを返す
                      return [
                        { _id: 'mock-id-1', productId: 'P001', name: 'モック商品1', price: 1000 },
                        { _id: 'mock-id-2', productId: 'P002', name: 'モック商品2', price: 2000 }
                      ];
                    }
                    return [];
                  } 
                };
              },
              findOne: async function() { return { _id: 'mock-id', name: 'モックデータ' }; },
              insertOne: async function(doc) { return { acknowledged: true, insertedId: 'mock-id' }; },
              updateOne: async function() { return { modifiedCount: 1 }; },
              deleteOne: async function() { return { deletedCount: 1 }; }
            };
          }
        };
      },
      
      close: async function() {
        console.log('モックMongoDB接続を閉じています');
        return true;
      }
    };
    
    // 接続テスト
    try {
      console.log('モックMongoDB接続テストを実行中...');
      dbClient = await mockMongoClient.connect();
      
      // ping テスト
      console.log('モック ping テストを実行中...');
      const adminDb = dbClient.db(mongoConfig.dbName).admin();
      const pingResult = await adminDb.ping();
      
      if (pingResult && pingResult.ok === 1) {
        console.log('モック ping テスト成功');
        
        // コレクションアクセステスト
        console.log('モックコレクションアクセステストを実行中...');
        const testResult = await dbClient.db(mongoConfig.dbName).collection('products').find().toArray();
        console.log(`モックプロダクトコレクションテスト成功: ${testResult.length} 件のデータ`);
        
        updateConnectionStatus(true);
        console.log('✅ MongoDB接続テスト成功（モック）');
        return true;
      } else {
        console.error('❌ モック ping テスト失敗:', pingResult);
        updateConnectionStatus(false);
        return false;
      }
    } catch (connectErr) {
      console.error('❌ MongoDB接続テストエラー（モック）:', connectErr);
      updateConnectionStatus(false);
      return false;
    }
  } catch (err) {
    console.error('❌ MongoDB接続テスト初期化エラー:', err);
    updateConnectionStatus(false);
    return false;
  }
}

/**
 * Node.js環境でのMongoDB接続テスト（実際の接続）
 * @returns {Promise<boolean>} 接続成功ならtrue
 */
async function testNodeConnection() {
  try {
    // Node.js環境では実際のMongoDBクライアントをインポート
    const { MongoClient, ServerApiVersion } = await import('mongodb');
    
    // オプションにServerApiVersionを追加
    const options = {
      ...mongoConfig.options,
      serverApi: ServerApiVersion.v1
    };
    
    console.log('MongoDB接続試行中...');
    const client = new MongoClient(mongoConfig.uri, options);
    
    await client.connect();
    console.log('MongoDB接続成功');
    
    // ping確認
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB pingコマンド成功");
    
    // データベースアクセステスト
    const db = client.db(mongoConfig.dbName);
    await db.collection('orders').find().toArray();
    
    await client.close();
    
    updateConnectionStatus(true);
    return true;
  } catch (err) {
    console.error('MongoDB接続テストエラー:', err);
    updateConnectionStatus(false);
    return false;
  }
}

/**
 * MongoDB接続状態を取得
 * @returns {Object} 接続状態情報
 */
export function getConnectionState() {
  return {
    available: dbAvailable,
    tested: dbTested,
    config: {
      uri: mongoConfig.uri,
      dbName: mongoConfig.dbName
    }
  };
}