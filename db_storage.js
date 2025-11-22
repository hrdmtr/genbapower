/**
 * 一元化されたストレージアクセスユーティリティ
 * MongoDBとlocalStorageを統一的に扱うためのモジュール
 */

import { testConnection, getConnectionState } from './mongo_connection.js';
import { saveOrderToDb, getOrdersFromDb, getProductsFromDb, saveProductToDb } from './db.js';

// 一時的なメモリキャッシュ
const memoryCache = new Map();

// MongoDB接続状態
let dbTested = false;
let dbAvailable = false;

/**
 * MongoDB接続状態を確認する
 * @returns {Promise<boolean>} 接続可能ならtrue
 */
export async function checkConnection() {
  if (dbTested) {
    return dbAvailable;
  }
  
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

/**
 * データを保存する（MongoDB優先、フォールバックあり）
 * @param {string} key ストレージキー
 * @param {any} data 保存するデータ
 * @param {string} collection MongoDBのコレクション名
 * @returns {Promise<boolean>} 保存成功ならtrue
 */
export async function saveData(key, data, collection = 'generic') {
  try {
    // 接続状態を確認
    if (!dbTested) {
      await checkConnection();
    } else {
      // 接続状態を取得
      const state = getConnectionState();
      dbAvailable = state.available;
    }
    
    // メモリキャッシュに保存（操作が速い）
    memoryCache.set(key, data);
    
    // MongoDB接続時はMongoDBに保存
    if (dbAvailable) {
      try {
        // コレクションに応じた処理を行う
        if (collection === 'orders') {
          await saveOrderToDb(data);
        } else if (collection === 'products') {
          await saveProductToDb(data);
        } else {
          // 汎用コレクションに保存
          await saveToGenericCollection(collection, { key, data });
        }
        console.log(`データをMongoDBに保存しました: [${collection}] ${key}`);
        return true;
      } catch (err) {
        console.warn(`MongoDB保存エラー: [${collection}] ${key}`, err);
        dbAvailable = false; // エラー発生時は以降ローカルストレージを使用
      }
    }
    
    // MongoDBに保存できない場合はローカルストレージを使用
    console.log(`データをローカルストレージに保存します: ${key}`);
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`データ保存エラー: ${key}`, error);
    // 最終手段としてローカルストレージに保存を試みる
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('ローカルストレージ保存も失敗:', e);
      return false;
    }
  }
}

/**
 * データを取得する（MongoDB優先、フォールバックあり）
 * @param {string} key ストレージキー
 * @param {string} collection MongoDBのコレクション名
 * @returns {Promise<any>} 取得したデータ
 */
export async function getData(key, collection = 'generic') {
  try {
    console.log(`getData: [${collection}] ${key} の取得を開始`);
    
    // メモリキャッシュを無効化（常に最新データを取得するため）
    if (memoryCache.has(key)) {
      console.log(`メモリキャッシュを削除: [${collection}] ${key}`);
      memoryCache.delete(key);
    }
    
    // 接続状態を確認（強制的に再テスト）
    try {
      await testConnection();
      dbAvailable = getConnectionState().available;
      console.log(`MongoDB接続状態: ${dbAvailable ? '✅ 接続成功' : '❌ 接続失敗'}`);
    } catch (connErr) {
      console.error('❌ 接続テストエラー:', connErr);
      dbAvailable = false;
    }
    
    // MongoDB接続時はMongoDBから取得
    if (dbAvailable) {
      try {
        console.log(`MongoDB からデータを取得します: [${collection}] ${key}`);
        let data = null;
        
        // コレクションに応じた処理を行う
        if (collection === 'orders') {
          data = await getOrdersFromDb();
        } else if (collection === 'products') {
          data = await getProductsFromDb();
          console.log('✅ 商品データ取得完了:', data ? Object.keys(data).length + '件' : '0件');
        } else {
          // 汎用コレクションから取得
          data = await getFromGenericCollection(collection, key);
        }
        
        // データが存在する場合
        if (data) {
          console.log(`✅ データをMongoDBから取得しました: [${collection}] ${key}`);
          return data;
        }
      } catch (err) {
        console.error(`❌ MongoDB取得エラー: [${collection}] ${key}`, err);
        // エラーをスローせず、ローカルストレージからの取得を試みる
        dbAvailable = false;
      }
    }
    
    // MongoDBから取得できなかった場合はローカルストレージを使用
    console.log(`⚠️ ローカルストレージからデータを取得します: ${key}`);
    try {
      const storedData = localStorage.getItem(key);
      
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          console.log(`✅ ローカルストレージからデータを取得しました: ${key}`);
          return parsedData;
        } catch (parseError) {
          console.error(`❌ JSONパースエラー: ${key}`, parseError);
        }
      }
    } catch (localErr) {
      console.error(`❌ ローカルストレージ読み込みエラー: ${key}`, localErr);
    }
    
    // 最終手段：products コレクションの場合はデフォルト値を返す
    if (collection === 'products' && key === 'productMaster') {
      console.log('⚠️ データが見つからないため、デフォルト商品データを使用します');
      // デフォルト商品データを返す（db.jsで定義されているはず）
      try {
        // products.jsからデフォルト商品データをインポート
        return await import('./products.js').then(module => {
          console.log('✅ デフォルト商品データをロードしました');
          return module.productMaster || {};
        });
      } catch (importErr) {
        console.error('❌ デフォルト商品データのインポートに失敗:', importErr);
      }
    }
    
    // データが見つからない場合は空オブジェクトを返す
    console.warn(`⚠️ データが見つかりませんでした: [${collection}] ${key}`);
    return {};
  } catch (error) {
    console.error(`❌ データ取得エラー: ${key}`, error);
    // エラーをスローせず、空データを返す
    console.warn('⚠️ エラーが発生したため、空データを返します');
    return {};
  }
}

/**
 * データを削除する（MongoDB優先、フォールバックあり）
 * @param {string} key ストレージキー
 * @param {string} collection MongoDBのコレクション名
 * @returns {Promise<boolean>} 削除成功ならtrue
 */
export async function removeData(key, collection = 'generic') {
  try {
    // メモリキャッシュから削除
    memoryCache.delete(key);
    
    // 接続状態を確認
    if (!dbTested) {
      await checkConnection();
    } else {
      // 接続状態を取得
      const state = getConnectionState();
      dbAvailable = state.available;
    }
    
    // MongoDB接続時はMongoDBから削除
    if (dbAvailable) {
      try {
        // コレクションに応じた処理を行う
        if (collection === 'orders' || collection === 'products') {
          // コレクション固有の削除は個別に実装
          await removeFromCollection(collection, key);
        } else {
          // 汎用コレクションから削除
          await removeFromGenericCollection(collection, key);
        }
        console.log(`データをMongoDBから削除しました: [${collection}] ${key}`);
      } catch (err) {
        console.warn(`MongoDB削除エラー: [${collection}] ${key}`, err);
        dbAvailable = false; // エラー発生時は以降ローカルストレージを使用
      }
    }
    
    // ローカルストレージからも削除
    console.log(`データをローカルストレージから削除します: ${key}`);
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`データ削除エラー: ${key}`, error);
    return false;
  }
}

/**
 * MongoDB汎用コレクションにデータを保存する実装
 * 注：実際のMongoDBクライアントに合わせて実装が必要
 */
async function saveToGenericCollection(collection, data) {
  // 実際のMongoDBクライアントに合わせて実装
  // ここではモック実装
  console.log(`MongoDB ${collection} にデータを保存しました`);
  return true;
}

/**
 * MongoDB汎用コレクションからデータを取得する実装
 * 注：実際のMongoDBクライアントに合わせて実装が必要
 */
async function getFromGenericCollection(collection, key) {
  // 実際のMongoDBクライアントに合わせて実装
  // ここではモック実装
  console.log(`MongoDB ${collection} からデータを取得しました`);
  return null;
}

/**
 * MongoDB汎用コレクションからデータを削除する実装
 * 注：実際のMongoDBクライアントに合わせて実装が必要
 */
async function removeFromGenericCollection(collection, key) {
  // 実際のMongoDBクライアントに合わせて実装
  // ここではモック実装
  console.log(`MongoDB ${collection} からデータを削除しました`);
  return true;
}

/**
 * MongoDBから特定のコレクションのデータを削除
 * 注：実際のMongoDBクライアントに合わせて実装が必要
 */
async function removeFromCollection(collection, key) {
  // 実際のMongoDBクライアントに合わせて実装
  // ここではモック実装
  console.log(`MongoDB ${collection} からデータを削除しました`);
  return true;
}

// バックグラウンドで接続状態を確認
checkConnection().catch(console.error);