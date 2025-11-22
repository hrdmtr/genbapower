// MongoDB版注文処理モジュール
import { saveOrderToDb, getProductFromDb, getTableFromDb } from './db.js';
import { testConnection, getConnectionState } from './mongo_connection.js';

// 初期接続テスト実行（結果はフラグに保存）
let dbAvailable = false;
let dbTested = false;

// DB接続テスト関数
async function checkDbConnection() {
  if (dbTested) return dbAvailable; // すでにテスト済みならその結果を返す
  
  try {
    console.log('MongoDB接続確認中...');
    const result = await testConnection();
    dbAvailable = result;
    dbTested = true;
    console.log('MongoDB接続状態:', dbAvailable ? '利用可能' : '利用不可（ローカルストレージ使用）');
    return dbAvailable;
  } catch (err) {
    console.error('MongoDB接続テストエラー:', err);
    dbAvailable = false;
    dbTested = true;
    return false;
  }
}

// アプリケーション起動時に接続チェックを実行
checkDbConnection().catch(err => {
  console.error('初期接続チェックエラー:', err);
});

/**
 * QRコード形式を解析する関数 (id=002,tab=02)
 * @param {string} code QRコードの内容
 * @returns {Object|null} 解析結果（productId, tableId）または無効な場合はnull
 */
export function parseQRCode(code) {
  try {
    const result = {
      productId: null,
      tableId: null
    };
    
    // パラメータを分割
    const params = code.split(',');
    
    for (const param of params) {
      const [key, value] = param.split('=');
      
      if (key === 'id') {
        // 商品IDをP形式に変換（001→P001）
        result.productId = `P${value.padStart(3, '0')}`;
      } else if (key === 'tab') {
        // テーブルIDをTABLE形式に変換（01→TABLE01）
        result.tableId = `TABLE${value.padStart(2, '0')}`;
      }
    }
    
    // 両方のIDが存在する場合のみ有効
    if (result.productId && result.tableId) {
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('QRコード解析エラー:', error);
    return null;
  }
}

/**
 * 注文をMongoDBに保存する関数
 * @param {string} productId 商品ID
 * @param {string} tableId テーブルID
 * @returns {Promise<Object>} 保存された注文情報
 */
export async function saveOrder(productId, tableId) {
  try {
    // MongoDB接続状態を確認（未テスト時は接続テスト実行）
    if (!dbTested) {
      await checkDbConnection();
    } else {
      // 接続状態を取得
      const state = getConnectionState();
      dbAvailable = state.available;
    }
    
    // 商品情報を取得（MongoDB優先、フォールバックあり）
    let product;
    if (dbAvailable) {
      try {
        product = await getProductFromDb(productId);
        console.log('MongoDB から商品情報を取得しました:', productId);
      } catch (dbError) {
        console.warn('MongoDB商品情報取得エラー:', dbError);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
      }
    }
    
    // DBから取得できなかった場合はローカルのマスターデータを使用
    if (!product) {
      console.log('ローカルの商品マスターを使用します');
      const { getProductById } = await import('./products.js');
      product = getProductById(productId);
    }
    
    if (!product) {
      throw new Error(`商品ID ${productId} は見つかりません`);
    }
    
    // テーブル情報をDBから取得（オプション - 存在確認用）
    let tableInfo = null;
    try {
      tableInfo = await getTableFromDb(tableId);
      if (!tableInfo) {
        console.warn(`テーブルID ${tableId} はDBに存在しませんが、処理を続行します`);
      }
    } catch (tableError) {
      console.warn('テーブル情報取得エラー、処理を続行します:', tableError);
    }
    
    // 注文データを作成
    const newOrder = {
      id: `ORD${Date.now()}`,  // システム内部の注文ID
      tableId: tableId,
      status: '受付',
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      items: [
        {
          productId,
          name: product.name || 'Unknown Product',
          price: product.price || 0,
          timestamp: new Date().toISOString()
        }
      ],
      totalAmount: product.price || 0,
      statusHistory: [
        {
          from: '',
          to: '受付',
          timestamp: new Date().toISOString(),
          displayTime: new Date().toLocaleString('ja-JP')
        }
      ]
    };
    
    // MongoDB接続状態に応じて保存先を選択
    if (dbAvailable) {
      try {
        // MongoDBに保存を試みる
        const savedOrder = await saveOrderToDb(newOrder);
        console.log('注文をMongoDBに保存しました:', savedOrder);
        return savedOrder;
      } catch (saveError) {
        // エラー発生時はローカルストレージにフォールバック
        console.warn('MongoDB保存エラー、ローカルストレージにフォールバック:', saveError);
        dbAvailable = false; // 以降はフォールバック
      }
    }
    
    // ローカルストレージに保存 (MongoDB利用不可またはエラー時)
    console.log('注文をローカルストレージに保存します');
    let orders = [];
    try {
      const storedOrders = localStorage.getItem('orders');
      if (storedOrders) {
        orders = JSON.parse(storedOrders);
      }
    } catch (lsError) {
      console.warn('ローカルストレージ読み込みエラー:', lsError);
    }
    
    // 注文を追加
    orders.push(newOrder);
    
    // localStorageに保存
    try {
      localStorage.setItem('orders', JSON.stringify(orders));
      console.log('注文をローカルストレージに保存しました');
    } catch (lsError) {
      console.error('ローカルストレージ保存エラー:', lsError);
    }
    
    return newOrder;
  } catch (error) {
    console.error('注文処理エラー:', error);
    throw error;
  }
}