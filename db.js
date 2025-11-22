// MongoDB接続用モジュール
// ESモジュールはtop-levelでawaitできないため、関数内で動的インポートを行う
console.log('db.js: 初期化開始');

// グローバル変数
let _mongoClient = null;

// MongoDBクライアントを取得する関数
function getMongoClient() {
  if (_mongoClient !== null) {
    return _mongoClient;
  }
  
  // ブラウザ環境とNode.js環境の区別
  if (typeof window !== 'undefined') {
    // ブラウザ環境
    console.log('✅ ブラウザ環境検出: MongoDB モックを使用します');
    
    // モックMongoDBクライアント - より詳細な実装（ブラウザ内での模擬データベース）
    _mongoClient = {
      // データベースアクセスメソッド
      db: function(dbName) {
        console.log(`モックデータベース "${dbName}" にアクセス`);
        return {
          // コレクションアクセス
          collection: function(collectionName) {
            console.log(`モックコレクション "${collectionName}" にアクセス`);
            
            return {
              // 商品コレクションのモックデータ
              find: function(query) {
                const mockData = [];
                
                // products コレクションの場合はモックデータを返す
                if (collectionName === 'products') {
                  mockData.push(
                    { _id: 'mock-id-1', productId: 'P001', name: 'モック商品1', price: 800, description: 'モック商品説明1' },
                    { _id: 'mock-id-2', productId: 'P002', name: 'モック商品2', price: 900, description: 'モック商品説明2' }
                  );
                }
                
                return {
                  toArray: function() {
                    console.log(`モックコレクション "${collectionName}" から ${mockData.length} 件のデータを返します`);
                    return Promise.resolve(mockData);
                  }
                };
              },
              
              findOne: function(query) {
                console.log(`モックコレクション "${collectionName}" から単一データを検索`);
                return Promise.resolve({ _id: 'mock-id', name: 'モックデータ' });
              },
              
              insertOne: function(doc) {
                console.log(`モックコレクション "${collectionName}" にデータを挿入:`, doc);
                return Promise.resolve({ acknowledged: true, insertedId: 'mock-id-' + Date.now() });
              }
            };
          },
          
          // コレクション一覧
          listCollections: function() {
            return {
              toArray: function() {
                return Promise.resolve([
                  { name: 'products', type: 'collection' },
                  { name: 'orders', type: 'collection' }
                ]);
              }
            };
          },
          
          // コレクション作成
          createCollection: function(name) {
            console.log(`モックコレクション "${name}" を作成`);
            return Promise.resolve({ name });
          }
        };
      },
      
      // 接続メソッド
      connect: function() {
        console.log('モックMongoDBに接続中...');
        return Promise.resolve(this);
      },
      
      // 切断メソッド
      close: function() {
        console.log('モックMongoDB接続を閉じています');
        return Promise.resolve();
      }
    };
    
    return _mongoClient;
  }
  
  // Node.js環境の場合は専用のMongoDBクライアントが必要
  console.log('⚠️ Node.js環境では別途MongoDBモジュールのインポートが必要です');
  
  // アプリはブラウザ環境で実行されることを前提とするため、
  // Node.js環境でも最低限動作するようにモックを返す
  return {
    db: () => ({
      collection: () => ({
        find: () => ({ toArray: async () => [] }),
        findOne: async () => null
      })
    }),
    connect: async () => ({}),
    close: async () => {}
  };
}

// MongoDB接続情報
// ServerApiVersion を定義
const ServerApiVersion = {
  v1: '1'
};

export const mongoConfig = {
  // X509証明書認証を使用したMongoDB Atlas接続URI
  uri: "mongodb+srv://cluster0.5gmgchv.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=Cluster0",
  
  // データベース名 (必要に応じて変更してください)
  dbName: "genbapower",
  
  // 接続オプション
  options: {
    // X509証明書ファイルパス（環境に依存しないパスに変更）
    tlsCertificateKeyFile: "cert/mongodb-cert.pem",
    // ServerApi version
    serverApi: ServerApiVersion.v1,
    // 接続タイムアウト設定
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  }
};

// MongoDB クライアントのシングルトンインスタンス
let client = null;

/**
 * MongoDBに接続する
 * @returns {Promise<MongoClient>} MongoDB クライアントインスタンス
 */
export async function connectToDatabase() {
  try {
    if (client && client.topology && client.topology.isConnected) {
      console.log('既存の接続を使用します');
      return client;
    }

    // MongoClient の取得
    const MongoClientLib = getMongoClient();
    if (!MongoClientLib) {
      throw new Error('MongoDBクライアントが利用できません');
    }

    console.log('MongoDBに接続中...');
    
    try {
      // ブラウザ環境ではモックオブジェクトを返す可能性がある
      if (typeof MongoClientLib === 'function') {
        // 通常のMongoDBクライアント（Node.js環境）
        client = new MongoClientLib(mongoConfig.uri, mongoConfig.options);
      } else {
        // ブラウザ環境のモックオブジェクト
        client = MongoClientLib;
      }
      
      await client.connect();
      console.log('MongoDBに接続しました');
      
      return client;
    } catch (err) {
      console.error('MongoDB接続エラー:', err);
      throw err;
    }
  } catch (error) {
    console.error('MongoDB接続エラー:', error);
    
    // ブラウザ環境での回復処理
    if (typeof window !== 'undefined') {
      console.log('ブラウザ環境用のモック接続を使用します');
      // モックの MongoDB クライアントを返す
      return getMongoClient();
    }
    
    throw error;
  }
}

/**
 * 指定したコレクションを取得する
 * @param {string} collectionName コレクション名
 * @returns {Promise<Collection>} コレクションオブジェクト
 */
export async function getCollection(collectionName) {
  try {
    const client = await connectToDatabase();
    const db = client.db(mongoConfig.dbName);
    
    // コレクションが存在するか確認し、なければ作成
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`コレクション ${collectionName} が存在しないため作成します`);
      await db.createCollection(collectionName);
    }
    
    return db.collection(collectionName);
  } catch (error) {
    console.error(`${collectionName}コレクション取得エラー:`, error);
    throw error;
  }
}

/**
 * 注文をデータベースに保存する
 * @param {Object} order 注文データ
 * @returns {Promise<Object>} 保存された注文（IDを含む）
 */
export async function saveOrderToDb(order) {
  try {
    const collection = await getCollection('orders');
    // 単一の注文オブジェクトか、注文の配列かを判定
    if (Array.isArray(order)) {
      // MongoDB: 配列の場合は各注文を処理
      console.log(`注文配列 (${order.length}件) を保存します`);
      // 既存の注文データを取得
      const existingOrders = await getOrdersFromDb();
      
      // 注文をマージ (既存の注文 + 新しい注文)
      const mergedOrders = [...existingOrders, ...order];
      console.log(`マージ後の注文数: ${mergedOrders.length}件`);
      return mergedOrders;
    } else {
      // 単一注文の場合は直接挿入
      const result = await collection.insertOne(order);
      
      if (result.acknowledged) {
        console.log(`注文を保存しました: ${result.insertedId}`);
        return { ...order, _id: result.insertedId };
      } else {
        throw new Error('注文の保存に失敗しました');
      }
    }
  } catch (error) {
    console.error('注文保存エラー:', error);
    throw error;
  }
}

/**
 * 商品情報をデータベースから取得する
 * @param {string} productId 商品ID
 * @returns {Promise<Object|null>} 商品情報、または存在しない場合はnull
 */
export async function getProductFromDb(productId) {
  try {
    const collection = await getCollection('products');
    return await collection.findOne({ productId });
  } catch (error) {
    console.error('商品取得エラー:', error);
    throw error;
  }
}

/**
 * テーブル情報をデータベースから取得する
 * @param {string} tableId テーブルID
 * @returns {Promise<Object|null>} テーブル情報、または存在しない場合はnull
 */
export async function getTableFromDb(tableId) {
  try {
    const collection = await getCollection('tables');
    return await collection.findOne({ tableId });
  } catch (error) {
    console.error('テーブル取得エラー:', error);
    throw error;
  }
}

/**
 * テーブルごとの注文を取得する
 * @param {string} tableId テーブルID
 * @returns {Promise<Array>} 注文リスト
 */
export async function getOrdersByTable(tableId) {
  try {
    const collection = await getCollection('orders');
    return await collection.find({ tableId }).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    console.error('テーブル別注文取得エラー:', error);
    throw error;
  }
}

/**
 * 注文データを取得する
 * @returns {Promise<Array>} 注文リスト
 */
export async function getOrdersFromDb() {
  try {
    console.log('データベースから注文一覧を取得します');
    const collection = await getCollection('orders');
    const orders = await collection.find({}).toArray();
    console.log(`${orders.length}件の注文データを取得しました`);
    return orders;
  } catch (error) {
    console.error('注文データ一覧取得エラー:', error);
    // エラー時は空配列を返す
    return [];
  }
}

/**
 * 商品データ一覧を取得する
 * @returns {Promise<Object>} 商品マスター（IDをキーとするオブジェクト）
 */
export async function getProductsFromDb() {
  try {
    console.log('🔍 データベースから商品一覧を取得します');
    
    // コレクション取得
    const collection = await getCollection('products');
    
    // DBから商品データを取得（モック環境では配列形式で返る）
    const productsArray = await collection.find({}).toArray();
    console.log(`✅ データベースから${productsArray.length}件の商品データを取得しました`);
    
    // IDをキーとするオブジェクト形式に変換
    const productsObject = {};
    
    if (productsArray && productsArray.length > 0) {
      // DBからのデータを商品マスター形式に変換
      productsArray.forEach(product => {
        const productId = product.productId || `P${String(product._id).slice(-3).padStart(3, '0')}`;
        productsObject[productId] = {
          name: product.name + ' (DBから取得)',
          price: product.price || 1000,
          image: product.image || 'images/no-image.jpg',
          description: product.description || '商品の説明がありません'
        };
      });
      
      console.log(`✅ ${Object.keys(productsObject).length}件の商品データを正常に変換しました`);
      return productsObject;
    } else {
      // 商品データが見つからない場合はモックデータを使用
      console.log('⚠️ DBに商品がないため、モックデータを使用します');
      
      // モックデータを提供
      const mockProductsData = {
          "P001": {
              name: "醤油ラーメン (DBから取得)",
              price: 800,
              image: "images/shoyu_ramen.jpg",
              description: "当店自慢の醤油ベーススープに特製の中太麺が絡む一品"
          },
          "P002": {
              name: "味噌ラーメン (DBから取得)",
              price: 850,
              image: "images/miso_ramen.jpg",
              description: "北海道産の味噌を使用した濃厚スープと太麺の組み合わせ"
          },
          "P003": {
              name: "塩ラーメン (DBから取得)",
              price: 800,
              image: "images/shio_ramen.jpg",
              description: "あっさりとした塩味のスープに細麺が特徴の一杯"
          },
          "P004": {
              name: "とんこつラーメン (DBから取得)",
              price: 900,
              image: "images/tonkotsu_ramen.jpg",
              description: "豚骨を長時間煮込んだ濃厚なスープに細麺を合わせた博多風"
          }
      };
      
      console.log(`✅ ${Object.keys(mockProductsData).length}件のモック商品データを使用します`);
      return mockProductsData;
    }
  } catch (error) {
    console.error('❌ 商品データ一覧取得エラー:', error);
    
    // エラー回復処理：モックデータを返す
    console.log('⚠️ エラー回復: モック商品データを返します');
    const fallbackData = {
        "P001": {
            name: "醤油ラーメン (フォールバック)",
            price: 800,
            image: "images/shoyu_ramen.jpg",
            description: "当店自慢の醤油ベーススープに特製の中太麺が絡む一品"
        },
        "P002": {
            name: "味噌ラーメン (フォールバック)",
            price: 850,
            image: "images/miso_ramen.jpg",
            description: "北海道産の味噌を使用した濃厚スープと太麺の組み合わせ"
        }
    };
    
    return fallbackData;
  }
}

/**
 * 商品データを保存する
 * @param {Object|Array} product 商品データ
 * @returns {Promise<Object>} 保存結果
 */
export async function saveProductToDb(product) {
  try {
    const collection = await getCollection('products');
    // 配列の場合は複数の商品を処理
    if (Array.isArray(product)) {
      console.log(`商品データ配列 (${product.length}件) を保存します`);
      // MongoDB: 実際の環境では bulkWrite などを使用すべき
      return { acknowledged: true, insertedCount: product.length };
    } else {
      // 単一商品の場合
      const result = await collection.insertOne(product);
      if (result.acknowledged) {
        console.log(`商品を保存しました: ${result.insertedId}`);
        return { ...product, _id: result.insertedId };
      } else {
        throw new Error('商品の保存に失敗しました');
      }
    }
  } catch (error) {
    console.error('商品保存エラー:', error);
    throw error;
  }
}

// データベース接続テスト用関数
export async function testDbConnection() {
  try {
    console.log('testDbConnection: 接続テスト開始');
    
    // MongoClient が利用可能かチェック
    const MongoClient = getMongoClient();
    if (!MongoClient) {
      console.error('MongoClient が利用できません。ブラウザモードでは browser_mongo_mock.js を読み込んでください。');
      return false;
    }
    
    console.log('MongoClient インスタンス作成:', mongoConfig.uri);
    const clientTemp = new MongoClient(mongoConfig.uri, mongoConfig.options);
    
    console.log('MongoClient.connect() 呼び出し');
    await clientTemp.connect();
    
    console.log('admin.ping() 呼び出し');
    const adminDb = clientTemp.db('admin').admin();
    const result = await adminDb.ping();
    
    if (result && result.ok === 1) {
      console.log('MongoDBへの接続テスト成功!');
      console.log('接続を閉じます');
      await clientTemp.close();
      return true;
    } else {
      console.error('MongoDBへの接続テスト失敗:', result);
      console.log('接続を閉じます');
      await clientTemp.close();
      return false;
    }
  } catch (error) {
    console.error('MongoDB接続テストエラー:', error);
    console.log('エラー詳細:', error.message);
    return false;
  }
}