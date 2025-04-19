// 商品マスターデータ
const productMaster = {
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

// 商品IDから商品情報を取得する関数
function getProductById(productId) {
    if (productMaster[productId]) {
        return productMaster[productId];
    }
    return null;
}

// ローカルストレージから商品データを読み込む
function getProductMaster() {
    const storedProducts = localStorage.getItem('productMaster');
    if (storedProducts) {
        return JSON.parse(storedProducts);
    }
    return productMaster;
}

// 商品IDから商品情報を取得する関数（ローカルストレージ対応版）
function getProductById(productId) {
    const currentProducts = getProductMaster();
    if (currentProducts[productId]) {
        return currentProducts[productId];
    }
    return null;
}

// エクスポート
export { getProductById, productMaster, getProductMaster };
