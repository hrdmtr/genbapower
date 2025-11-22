// MongoDB版オーダーデータベース操作モジュール
import { getCollection, connectToDatabase, testDbConnection } from './db.js';

// 初期接続テスト実行（結果はフラグに保存）
let dbAvailable = false;
let dbTested = false;

// DB接続テスト関数
async function checkDbConnection() {
  if (dbTested) {
    console.log('DB接続は既にテスト済み:', dbAvailable ? '接続成功' : '接続失敗');
    return dbAvailable; // すでにテスト済みならその結果を返す
  }
  
  try {
    console.log('MongoDB接続確認中...');
    console.log('MongoDB URI:', mongoConfig.uri);
    console.log('MongoDB DB名:', mongoConfig.dbName);
    console.log('MongoDB オプション:', JSON.stringify(mongoConfig.options, null, 2));
    
    // ブラウザ環境チェック (windowオブジェクトがある場合のみlocalStorageを使用)
    const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    console.log('実行環境:', isBrowser ? 'ブラウザ' : 'Node.js');
    
    // ブラウザ環境でない場合は例外が発生するのを防ぐ
    if (!isBrowser) {
      console.log('ブラウザ環境でないため、ローカルストレージは使用しません');
    }
    
    console.log('testDbConnection()を呼び出します...');
    const result = await testDbConnection();
    console.log('testDbConnection()から戻りました。結果:', result);
    
    dbAvailable = result;
    dbTested = true;
    
    console.log('MongoDB接続テスト結果:', dbAvailable ? '接続成功' : '接続失敗');
    console.log('MongoDB接続状態:', dbAvailable ? '利用可能' : '利用不可（ローカルストレージ使用）');
    return dbAvailable;
  } catch (err) {
    console.error('MongoDB接続テストエラー:', err);
    console.error('エラー詳細:', err.stack);
    dbAvailable = false;
    dbTested = true;
    return false;
  }
}

// アプリケーション起動時に接続チェックを実行
checkDbConnection().catch(err => {
  console.error('初期接続チェックエラー:', err);
});

// ローカルストレージからデータを取得する関数（フォールバック用）
function getLocalStorageOrders() {
  console.log('【ローカルストレージから注文履歴を取得】');
  const orders = localStorage.getItem('orders');
  
  if (orders) {
    try {
      const parsedOrders = JSON.parse(orders);
      console.log(`✓ 注文履歴取得成功: ${parsedOrders.length}件の注文データを取得`);
      return parsedOrders;
    } catch (e) {
      console.error('✗ 注文履歴のパース失敗:', e);
      return [];
    }
  } else {
    console.log('✗ 注文履歴なし - localStorageにordersが見つかりません');
    return [];
  }
}

// MongoDBオーダーデータベース操作関数
export const OrderDB = {
  // オーダー一覧の取得
  getOrders: async function() {
    console.log('【OrderDB.getOrders】注文履歴を取得します');
    
    // MongoDB接続状態を確認（未テスト時は接続テスト実行）
    if (!dbTested) {
      console.log('DB接続テストを実行します');
      await checkDbConnection();
      console.log('DB接続テスト結果:', dbAvailable ? '成功' : '失敗');
    }
    
    if (dbAvailable) {
      try {
        console.log('MongoDBから注文履歴を取得します');
        const collection = await getCollection('orders');
        // 最新の注文が先に来るようにソート
        const orders = await collection.find({}).sort({ createdAt: -1 }).toArray();
        
        console.log(`✓ MongoDB注文履歴取得成功: ${orders.length}件の注文データを取得`);
        
        // 注文ステータスの内訳を計算（デバッグ用）
        const statusCounts = {};
        orders.forEach(order => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        
        // ステータス別の件数を出力
        const statusSummary = Object.keys(statusCounts)
          .map(status => `${status}: ${statusCounts[status]}件`)
          .join(', ');
        
        console.log(`  ステータス内訳: ${statusSummary}`);
        return orders;
      } catch (error) {
        console.error('MongoDB注文取得エラー:', error);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
        
        // ローカルストレージにフォールバック
        console.log('ローカルストレージにフォールバックします');
        return getLocalStorageOrders();
      }
    } else {
      // MongoDB利用不可の場合はローカルストレージから取得
      console.log('MongoDB利用不可のためローカルストレージから取得します');
      return getLocalStorageOrders();
    }
  },
  
  // 新規オーダーの追加
  addOrder: async function(order) {
    // MongoDB接続状態を確認
    if (!dbTested) {
      await checkDbConnection();
    }
    
    // 注文IDとタイムスタンプの設定
    order.id = `ORD${Date.now()}`;
    order.createdAt = new Date().toISOString();
    
    // timestamp も設定（互換性のため）
    if (!order.timestamp) {
      order.timestamp = order.createdAt;
    }
    
    // 注文ステータスの設定
    order.status = '受付';
    
    // ステータス変更履歴の初期化
    if (!order.statusHistory) {
      order.statusHistory = [{
        from: '',
        to: '受付',
        timestamp: order.createdAt,
        displayTime: new Date().toLocaleString('ja-JP')
      }];
    }
    
    if (dbAvailable) {
      try {
        console.log('MongoDBに注文を保存します');
        const collection = await getCollection('orders');
        const result = await collection.insertOne(order);
        
        if (result.acknowledged) {
          console.log(`MongoDB注文保存成功: ${order.id}`);
          
          // LocalStorageにも同期（バックアップ）
          try {
            const localOrders = getLocalStorageOrders();
            localOrders.push(order);
            localStorage.setItem('orders', JSON.stringify(localOrders));
            console.log('注文をMongoDBとLocalStorageの両方に保存しました');
          } catch (lsError) {
            console.warn('LocalStorage同期エラー:', lsError);
          }
          
          return { ...order, _id: result.insertedId };
        } else {
          throw new Error('MongoDB注文保存失敗');
        }
      } catch (error) {
        console.error('MongoDB注文保存エラー:', error);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
        
        // ローカルストレージにフォールバック
        console.log('ローカルストレージにフォールバックします');
        const localOrders = getLocalStorageOrders();
        localOrders.push(order);
        localStorage.setItem('orders', JSON.stringify(localOrders));
        
        return order;
      }
    } else {
      // MongoDB利用不可の場合はローカルストレージに保存
      console.log('MongoDB利用不可のためローカルストレージに保存します');
      const localOrders = getLocalStorageOrders();
      localOrders.push(order);
      localStorage.setItem('orders', JSON.stringify(localOrders));
      
      return order;
    }
  },
  
  // オーダーのステータス更新
  updateOrderStatus: async function(orderId, newStatus) {
    // MongoDB接続状態を確認
    if (!dbTested) {
      await checkDbConnection();
    }
    
    const now = new Date();
    const timestamp = now.toISOString();
    const displayTime = now.toLocaleString('ja-JP');
    
    if (dbAvailable) {
      try {
        console.log(`MongoDB注文ステータス更新: ${orderId} -> ${newStatus}`);
        const collection = await getCollection('orders');
        
        // 現在の注文データを取得
        const order = await collection.findOne({ id: orderId });
        
        if (!order) {
          console.error(`注文ID ${orderId} が見つかりません`);
          return false;
        }
        
        const prevStatus = order.status;
        
        // ステータス変更履歴の追加
        if (!order.statusHistory) {
          order.statusHistory = [];
        }
        
        // 履歴にステータス変更を追加
        const statusHistoryEntry = {
          from: prevStatus,
          to: newStatus,
          timestamp: timestamp,
          displayTime: displayTime
        };
        
        // MongoDB更新
        const result = await collection.updateOne(
          { id: orderId },
          { 
            $set: { 
              status: newStatus,
              updatedAt: timestamp
            },
            $push: {
              statusHistory: statusHistoryEntry
            }
          }
        );
        
        if (result.modifiedCount === 1) {
          console.log(`✓ MongoDB注文ステータス更新成功: ${orderId}`);
          
          // LocalStorageも更新（同期）
          try {
            const localOrders = getLocalStorageOrders();
            const orderIndex = localOrders.findIndex(order => order.id === orderId);
            
            if (orderIndex >= 0) {
              if (!localOrders[orderIndex].statusHistory) {
                localOrders[orderIndex].statusHistory = [];
              }
              
              localOrders[orderIndex].statusHistory.push(statusHistoryEntry);
              localOrders[orderIndex].status = newStatus;
              localOrders[orderIndex].updatedAt = timestamp;
              
              localStorage.setItem('orders', JSON.stringify(localOrders));
              console.log('LocalStorageの注文ステータスも更新しました');
            }
          } catch (lsError) {
            console.warn('LocalStorage更新エラー:', lsError);
          }
          
          return true;
        } else {
          console.error(`MongoDB注文ステータス更新失敗: ${orderId}`);
          return false;
        }
      } catch (error) {
        console.error('MongoDB注文ステータス更新エラー:', error);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
        
        // ローカルストレージにフォールバック
        console.log('ローカルストレージにフォールバックします');
        const localOrders = getLocalStorageOrders();
        const orderIndex = localOrders.findIndex(order => order.id === orderId);
        
        if (orderIndex >= 0) {
          const prevStatus = localOrders[orderIndex].status;
          
          // ステータス変更履歴の追加
          if (!localOrders[orderIndex].statusHistory) {
            localOrders[orderIndex].statusHistory = [];
          }
          
          // 履歴にステータス変更を追加
          localOrders[orderIndex].statusHistory.push({
            from: prevStatus,
            to: newStatus,
            timestamp: timestamp,
            displayTime: displayTime
          });
          
          // ステータス更新
          localOrders[orderIndex].status = newStatus;
          localOrders[orderIndex].updatedAt = timestamp;
          localStorage.setItem('orders', JSON.stringify(localOrders));
          return true;
        }
        return false;
      }
    } else {
      // MongoDB利用不可の場合はローカルストレージを更新
      console.log('MongoDB利用不可のためローカルストレージを更新します');
      const localOrders = getLocalStorageOrders();
      const orderIndex = localOrders.findIndex(order => order.id === orderId);
      
      if (orderIndex >= 0) {
        const prevStatus = localOrders[orderIndex].status;
        
        // ステータス変更履歴の追加
        if (!localOrders[orderIndex].statusHistory) {
          localOrders[orderIndex].statusHistory = [];
        }
        
        // 履歴にステータス変更を追加
        localOrders[orderIndex].statusHistory.push({
          from: prevStatus,
          to: newStatus,
          timestamp: timestamp,
          displayTime: displayTime
        });
        
        // ステータス更新
        localOrders[orderIndex].status = newStatus;
        localOrders[orderIndex].updatedAt = timestamp;
        localStorage.setItem('orders', JSON.stringify(localOrders));
        return true;
      }
      return false;
    }
  },
  
  // 特定のオーダーの取得
  getOrderById: async function(orderId) {
    // MongoDB接続状態を確認
    if (!dbTested) {
      await checkDbConnection();
    }
    
    if (dbAvailable) {
      try {
        console.log(`MongoDBから注文ID ${orderId} を取得します`);
        const collection = await getCollection('orders');
        const order = await collection.findOne({ id: orderId });
        
        if (order) {
          console.log(`✓ MongoDB注文取得成功: ${orderId}`);
          return order;
        } else {
          console.log(`MongoDB注文が見つかりません: ${orderId}`);
          // ローカルストレージから検索
          const localOrders = getLocalStorageOrders();
          return localOrders.find(order => order.id === orderId) || null;
        }
      } catch (error) {
        console.error('MongoDB注文取得エラー:', error);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
        
        // ローカルストレージにフォールバック
        console.log('ローカルストレージにフォールバックします');
        const localOrders = getLocalStorageOrders();
        return localOrders.find(order => order.id === orderId) || null;
      }
    } else {
      // MongoDB利用不可の場合はローカルストレージから取得
      console.log('MongoDB利用不可のためローカルストレージから取得します');
      const localOrders = getLocalStorageOrders();
      return localOrders.find(order => order.id === orderId) || null;
    }
  },
  
  // テーブル番号で注文を取得
  getOrdersByTable: async function(tableId) {
    // MongoDB接続状態を確認
    if (!dbTested) {
      await checkDbConnection();
    }
    
    if (dbAvailable) {
      try {
        console.log(`MongoDBからテーブル ${tableId} の注文を取得します`);
        const collection = await getCollection('orders');
        const orders = await collection.find({ tableId: tableId }).sort({ createdAt: -1 }).toArray();
        
        console.log(`✓ MongoDB注文取得成功: テーブル ${tableId} で ${orders.length}件`);
        return orders;
      } catch (error) {
        console.error('MongoDB注文取得エラー:', error);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
        
        // ローカルストレージにフォールバック
        console.log('ローカルストレージにフォールバックします');
        const localOrders = getLocalStorageOrders();
        return localOrders.filter(order => order.tableId === tableId);
      }
    } else {
      // MongoDB利用不可の場合はローカルストレージから取得
      console.log('MongoDB利用不可のためローカルストレージから取得します');
      const localOrders = getLocalStorageOrders();
      return localOrders.filter(order => order.tableId === tableId);
    }
  },
  
  // 特定のステータスの注文を取得
  getOrdersByStatus: async function(status) {
    // MongoDB接続状態を確認
    if (!dbTested) {
      await checkDbConnection();
    }
    
    if (dbAvailable) {
      try {
        console.log(`MongoDBからステータス ${status} の注文を取得します`);
        const collection = await getCollection('orders');
        const orders = await collection.find({ status: status }).sort({ createdAt: -1 }).toArray();
        
        console.log(`✓ MongoDB注文取得成功: ステータス ${status} で ${orders.length}件`);
        return orders;
      } catch (error) {
        console.error('MongoDB注文取得エラー:', error);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
        
        // ローカルストレージにフォールバック
        console.log('ローカルストレージにフォールバックします');
        const localOrders = getLocalStorageOrders();
        return localOrders.filter(order => order.status === status);
      }
    } else {
      // MongoDB利用不可の場合はローカルストレージから取得
      console.log('MongoDB利用不可のためローカルストレージから取得します');
      const localOrders = getLocalStorageOrders();
      return localOrders.filter(order => order.status === status);
    }
  },
  
  // 本日の注文を取得
  getTodaysOrders: async function() {
    // MongoDB接続状態を確認
    if (!dbTested) {
      await checkDbConnection();
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    if (dbAvailable) {
      try {
        console.log(`MongoDB から本日 ${today} の注文を取得します`);
        const collection = await getCollection('orders');
        
        // 日付の開始と終了を設定
        const startOfDay = new Date(today + 'T00:00:00.000Z');
        const endOfDay = new Date(today + 'T23:59:59.999Z');
        
        // createdAtフィールドで日付範囲を検索
        const orders = await collection.find({
          createdAt: {
            $gte: startOfDay.toISOString(),
            $lte: endOfDay.toISOString()
          }
        }).sort({ createdAt: -1 }).toArray();
        
        console.log(`✓ MongoDB注文取得成功: 本日 ${today} で ${orders.length}件`);
        return orders;
      } catch (error) {
        console.error('MongoDB注文取得エラー:', error);
        dbAvailable = false; // エラー発生時は以降のリクエストでフォールバック
        
        // ローカルストレージにフォールバック
        console.log('ローカルストレージにフォールバックします');
        const localOrders = getLocalStorageOrders();
        return localOrders.filter(order => 
          order.createdAt && order.createdAt.startsWith(today)
        );
      }
    } else {
      // MongoDB利用不可の場合はローカルストレージから取得
      console.log('MongoDB利用不可のためローカルストレージから取得します');
      const localOrders = getLocalStorageOrders();
      return localOrders.filter(order => 
        order.createdAt && order.createdAt.startsWith(today)
      );
    }
  },
  
  // データベース利用状況を確認
  checkDatabaseStatus: async function() {
    console.log('OrderDB.checkDatabaseStatus: DB状態確認を開始');
    
    // MongoDB接続状態を確認
    if (!dbTested) {
      console.log('DB接続テストを実行します');
      await checkDbConnection();
      console.log('DB接続テスト結果:', dbAvailable ? '成功' : '失敗');
    } else {
      console.log('既存のDB接続テスト結果を使用:', dbAvailable ? '成功' : '失敗');
    }
    
    // 注文統計情報を取得
    console.log('注文統計情報を取得します');
    const orderStats = await this.getOrderStats();
    console.log('注文統計情報取得完了:', orderStats);
    
    const result = {
      // データベース状態
      dbAvailable: dbAvailable,
      dbType: dbAvailable ? 'MongoDB' : 'LocalStorage',
      
      // 注文データ統計
      orderStats: orderStats
    };
    
    console.log('DB状態確認結果:', result);
    return result;
  },
  
  // 注文データの統計情報を取得
  getOrderStats: async function() {
    try {
      console.log('OrderDB.getOrderStats: 注文統計情報の取得開始');
      
      // 接続状態を確認
      if (!dbTested) {
        console.log('DB接続テストを実行します');
        await checkDbConnection();
      }
      
      // 全注文を取得（接続エラー時はローカルストレージから）
      console.log('全注文データを取得中...');
      let allOrders = [];
      
      if (dbAvailable) {
        try {
          // MongoDBから取得を試みる
          const collection = await getCollection('orders');
          allOrders = await collection.find({}).toArray();
          console.log(`MongoDBから${allOrders.length}件の注文を取得しました`);
        } catch (error) {
          console.error('MongoDB注文取得エラー:', error);
          // ローカルストレージにフォールバック
          const storedOrders = localStorage.getItem('orders');
          if (storedOrders) {
            allOrders = JSON.parse(storedOrders);
            console.log(`LocalStorageから${allOrders.length}件の注文を取得しました`);
          }
        }
      } else {
        // ローカルストレージから取得
        const storedOrders = localStorage.getItem('orders');
        if (storedOrders) {
          allOrders = JSON.parse(storedOrders);
          console.log(`LocalStorageから${allOrders.length}件の注文を取得しました`);
        }
      }
      
      // ステータス別の集計
      const statusCounts = {};
      allOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      
      // テーブル別の集計
      const tableCounts = {};
      allOrders.forEach(order => {
        tableCounts[order.tableId] = (tableCounts[order.tableId] || 0) + 1;
      });
      
      // 本日の注文数を計算
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = allOrders.filter(order => 
        order.createdAt && order.createdAt.startsWith(today)
      );
      
      const result = {
        totalOrders: allOrders.length,
        todayOrders: todayOrders.length,
        statusCounts,
        tableCounts
      };
      
      console.log('注文統計情報:', result);
      return result;
    } catch (error) {
      console.error('注文統計情報取得エラー:', error);
      // エラー時は最小限の情報を返す
      return {
        totalOrders: 0,
        todayOrders: 0,
        statusCounts: {},
        tableCounts: {}
      };
    }
  }
};

// OrderDBオブジェクトをエクスポート
// 明示的な接続テスト用関数（UIボタン用）
export async function testConnection() {
  console.log('OrderDB.testConnection: 明示的な接続テストを実行します');
  
  // テスト済みフラグをリセット（強制的に再テスト）
  dbTested = false;
  
  try {
    // 接続テスト実行
    console.log('MongoDB接続再テスト開始');
    await checkDbConnection();
    console.log('MongoDB接続再テスト完了: 結果=', dbAvailable ? '成功' : '失敗');
    return dbAvailable;
  } catch (error) {
    console.error('MongoDB接続テストエラー:', error);
    dbAvailable = false;
    dbTested = true;
    return false;
  }
}

export default OrderDB;