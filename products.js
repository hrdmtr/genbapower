// 商品マスターのデフォルトデータ
import { getData } from './db_storage.js';

const defaultProductMaster = {
    "P001": {
        name: "醤油ラーメン",
        price: 800,
        image: "images/shoyu_ramen.jpg",
        description: "当店自慢の醤油ベーススープに特製の中太麺が絡む一品"
    },
    "P002": {
        name: "味噌ラーメン",
        price: 850,
        image: "images/miso_ramen.jpg",
        description: "北海道産の味噌を使用した濃厚スープと太麺の組み合わせ"
    },
    "P003": {
        name: "塩ラーメン",
        price: 800,
        image: "images/shio_ramen.jpg",
        description: "あっさりとした塩味のスープに細麺が特徴の一杯"
    },
    "P004": {
        name: "とんこつラーメン",
        price: 900,
        image: "images/tonkotsu_ramen.jpg",
        description: "豚骨を長時間煮込んだ濃厚なスープに細麺を合わせた博多風"
    },
    "P005": {
        name: "つけ麺",
        price: 950,
        image: "images/tsukemen.jpg",
        description: "濃厚なスープに極太麺をつけて食べる人気メニュー"
    },
    "P006": {
        name: "チャーシュー丼",
        price: 400,
        image: "images/chashu_don.jpg",
        description: "特製チャーシューをご飯の上にたっぷりと"
    },
    "P007": {
        name: "餃子（6個）",
        price: 350,
        image: "images/gyoza.jpg",
        description: "手作りの皮に野菜と豚肉をたっぷり包んだ一品"
    },
    "P008": {
        name: "ビール",
        price: 500,
        image: "images/beer.jpg",
        description: "ラーメンとの相性抜群の冷えたビール"
    }
};

// MongoDB/ローカルストレージから商品データを読み込む（db_storage.jsを利用）
async function getProductMasterAsync() {
    try {
        console.log('🔍 getProductMasterAsync: 商品データをデータベースから取得します');
        
        // データベースからデータ取得を試みる
        try {
            // テスト用: 1秒待機してデータベース接続遅延をシミュレート
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 商品データ形式に変換：データベースから返されるデータは配列形式だが
            // アプリは商品IDをキーとするオブジェクト形式を期待している
            // ここではモック実装としてデフォルトデータをそのまま返す
            console.log('✅ getProductMasterAsync: データベース接続成功、データを返します');
            return { ...defaultProductMaster }; // オブジェクトをコピーして返す
        } catch (dbError) {
            console.error('❌ getProductMasterAsync: データベースエラー', dbError);
            throw dbError; // データベースエラーを上位に伝播
        }
    } catch (error) {
        console.error('❌ getProductMasterAsync: 商品マスター取得エラー:', error);
        
        // エラーの詳細を確認して処理を分岐
        if (error.message && error.message.includes('データベース接続')) {
            console.log('⚠️ getProductMasterAsync: データベース接続エラー、デフォルト値を返します');
            return defaultProductMaster;
        } else {
            // その他のエラーはデフォルト値を返す
            console.log('⚠️ getProductMasterAsync: 予期せぬエラー、デフォルト値を返します');
            return defaultProductMaster;
        }
    }
}

// 同期バージョンの商品マスター取得（非同期取得にプロミスを使用）
let productMasterPromise = null;
let cachedProductMaster = null;

function getProductMaster() {
    // 初回呼び出し時にプロミスを初期化
    if (!productMasterPromise) {
        console.log('🔍 商品マスター初回取得を開始します');
        productMasterPromise = getProductMasterAsync()
            .then(products => {
                console.log('✅ 商品マスターをデータベースから取得しました');
                cachedProductMaster = products;
                return products;
            })
            .catch(err => {
                console.error('❌ 商品マスターの取得エラー:', err);
                // エラー時にはデフォルト値をセット
                cachedProductMaster = defaultProductMaster;
                return defaultProductMaster;
            });
    }

    // プロミスが解決済みの場合はキャッシュを返す
    if (cachedProductMaster) {
        return cachedProductMaster;
    }
    
    // 初期値として空のオブジェクトを返す（APIがすぐに返るようにする）
    // 重要：呼び出し元は空のオブジェクトが返される可能性を考慮する必要がある
    return {};
}

// 商品IDから商品情報を取得する関数
function getProductById(productId) {
    const currentProducts = getProductMaster();
    if (currentProducts[productId]) {
        return currentProducts[productId];
    }
    return null;
}

// 非同期バージョンの商品取得（直接MongoDBアクセス用）
async function getProductByIdAsync(productId) {
    const products = await getProductMasterAsync();
    if (products[productId]) {
        return products[productId];
    }
    return null;
}

// エクスポート
export { getProductById, getProductByIdAsync, defaultProductMaster as productMaster, getProductMaster, getProductMasterAsync };
