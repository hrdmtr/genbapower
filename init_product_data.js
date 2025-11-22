// 初期商品データをMongoDBに登録するスクリプト
import { saveData } from './db_storage.js';
import { testConnection, getConnectionState } from './mongo_connection.js';

// 商品マスターのデフォルトデータ
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
    },
    // 追加商品
    "P009": {
        name: "ライス",
        price: 200,
        image: "images/rice.jpg",
        description: "ラーメンのお供に欠かせない白米"
    },
    "P010": {
        name: "唐揚げ",
        price: 450,
        image: "images/karaage.jpg",
        description: "外はカリッと中はジューシーな特製唐揚げ"
    },
    "P011": {
        name: "杏仁豆腐",
        price: 300,
        image: "images/annin_tofu.jpg",
        description: "まろやかな口当たりの杏仁豆腐"
    },
    "P012": {
        name: "ウーロン茶",
        price: 250,
        image: "images/oolong_tea.jpg",
        description: "さっぱりとした後味のウーロン茶"
    }
};

// 初期データをMongoDBに登録する関数
async function initializeProductData() {
    console.log('商品マスター初期化を開始します...');
    
    try {
        // MongoDB接続テスト
        console.log('MongoDB接続テスト中...');
        const connected = await testConnection();
        
        if (connected) {
            console.log('MongoDB接続成功！データを登録します。');
            
            // productMasterとして商品データを登録
            await saveData('productMaster', defaultProductMaster, 'products');
            console.log('商品マスターデータの登録が完了しました。');
            
            // 各商品の画像パスを確認
            console.log('商品画像パスの確認:');
            for (const [productId, product] of Object.entries(defaultProductMaster)) {
                console.log(`${productId}: ${product.name} - 画像パス: ${product.image}`);
            }
            
            return true;
        } else {
            console.error('MongoDB接続に失敗しました。データは登録されませんでした。');
            return false;
        }
    } catch (error) {
        console.error('データ初期化中にエラーが発生しました:', error);
        return false;
    }
}

// 実行
initializeProductData().then(success => {
    if (success) {
        console.log('初期化処理が正常に完了しました。');
    } else {
        console.log('初期化処理は失敗しました。');
    }
}).catch(err => {
    console.error('実行中に予期せぬエラーが発生しました:', err);
});