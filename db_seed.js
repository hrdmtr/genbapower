// MongoDBにテストデータをシードするスクリプト
import { connectToDatabase, mongoConfig, getCollection } from './db.js';
import { productMaster } from './products.js';

async function seedDatabase() {
  let client = null;
  try {
    console.log('======= MongoDB テストデータ作成開始 =======');
    
    // MongoDBに接続
    client = await connectToDatabase();
    console.log(`MongoDB接続成功: ${mongoConfig.uri}`);
    
    // 商品コレクションにテストデータを挿入
    const productsCollection = await getCollection('products');
    
    // 既存のデータを確認
    const existingProducts = await productsCollection.countDocuments({});
    console.log(`既存の商品データ数: ${existingProducts}`);
    
    if (existingProducts > 0) {
      console.log('商品データはすでに存在します。スキップします。');
    } else {
      console.log('商品データをインポートします...');
      
      // ローカルの商品マスタからMongoDB形式に変換
      const products = Object.entries(productMaster).map(([id, product]) => ({
        productId: id,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description,
        createdAt: new Date().toISOString()
      }));
      
      // 一括挿入
      const result = await productsCollection.insertMany(products);
      console.log(`${result.insertedCount}件の商品データを挿入しました`);
    }
    
    // テーブルのテストデータ
    const tablesCollection = await getCollection('tables');
    const existingTables = await tablesCollection.countDocuments({});
    
    if (existingTables > 0) {
      console.log('テーブルデータはすでに存在します。スキップします。');
    } else {
      console.log('テーブルデータをインポートします...');
      
      const tables = [];
      for (let i = 1; i <= 10; i++) {
        tables.push({
          tableId: `TABLE${i.toString().padStart(2, '0')}`,
          name: `テーブル${i}`,
          status: 'available',
          seats: i <= 5 ? 2 : 4,
          createdAt: new Date().toISOString()
        });
      }
      
      const result = await tablesCollection.insertMany(tables);
      console.log(`${result.insertedCount}件のテーブルデータを挿入しました`);
    }
    
    console.log('\n======= MongoDB テストデータ作成完了 =======');
    
  } catch (error) {
    console.error('テストデータ作成中にエラーが発生しました:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB接続を閉じました');
    }
    process.exit(0);
  }
}

// スクリプト実行
seedDatabase();