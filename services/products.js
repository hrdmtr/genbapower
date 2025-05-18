const { MongoClient, ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./database');
const mongoConfig = require('../config/mongodb.config');

/**
 * 商品データを取得する関数
 * @param {object} query 検索クエリ（オプション）
 * @param {number} limit 取得件数の上限（オプション）
 * @returns {Promise<Array>} 商品データの配列
 */
async function getProducts(query = {}, limit = 100) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('products');
    
    const products = await collection.find(query).limit(limit).toArray();
    return products;
  } catch (error) {
    console.error('商品データの取得エラー:', error);
    throw error;
  }
}

/**
 * 商品データを取得する関数
 * @param {string} productId 商品IDまたはObjectID
 * @returns {Promise<object>} 商品データ
 */
async function getProductById(productId) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('products');
    
    let query = { productId };
    
    if (ObjectId.isValid(productId)) {
      const product = await collection.findOne({ _id: new ObjectId(productId) });
      if (product) return product;
    }
    
    return await collection.findOne(query);
  } catch (error) {
    console.error('商品データの取得エラー:', error);
    throw error;
  }
}

/**
 * 商品データを保存する関数
 * @param {object} productData 商品データ
 * @returns {Promise<object>} 保存結果
 */
async function saveProduct(productData) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('products');
    
    const productWithTimestamp = {
      ...productData,
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(productWithTimestamp);
    console.log(`商品データをMongoDBに保存しました。ID: ${result.insertedId}`);
    return result;
  } catch (error) {
    console.error('商品データの保存エラー:', error);
    throw error;
  }
}

/**
 * 商品データを更新する関数
 * @param {string} productId 商品IDまたはObjectID
 * @param {object} productData 更新する商品データ
 * @returns {Promise<object>} 更新結果
 */
async function updateProduct(productId, productData) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('products');
    
    let filter = { productId };
    
    if (ObjectId.isValid(productId)) {
      filter = { _id: new ObjectId(productId) };
    }
    
    const result = await collection.updateOne(
      filter,
      { $set: productData }
    );
    
    if (result.matchedCount === 0) {
      throw new Error(`商品ID ${productId} が見つかりません`);
    }
    
    console.log(`商品データを更新しました。ID: ${productId}`);
    return result;
  } catch (error) {
    console.error('商品データの更新エラー:', error);
    throw error;
  }
}

/**
 * 商品データを削除する関数
 * @param {string} productId 商品IDまたはObjectID
 * @returns {Promise<object>} 削除結果
 */
async function deleteProduct(productId) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('products');
    
    let filter = { productId };
    
    if (ObjectId.isValid(productId)) {
      filter = { _id: new ObjectId(productId) };
    }
    
    const result = await collection.deleteOne(filter);
    
    if (result.deletedCount === 0) {
      throw new Error(`商品ID ${productId} が見つかりません`);
    }
    
    console.log(`商品データを削除しました。ID: ${productId}`);
    return result;
  } catch (error) {
    console.error('商品データの削除エラー:', error);
    throw error;
  }
}

module.exports = {
  getProducts,
  getProductById,
  saveProduct,
  updateProduct,
  deleteProduct
};
