const express = require('express');
const path = require('path');
const { connectToMongoDB, saveOrder } = require('./services/database');
const { getProducts, getProductById, saveProduct, updateProduct, deleteProduct } = require('./services/products');
const { getUsers, getUserById, saveUser, updateUser, deleteUser } = require('./services/users');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '/')));

connectToMongoDB().catch(console.error);

app.post('/api/orders', async (req, res) => {
  try {
    const result = await saveOrder(req.body);
    
    res.status(200).json({
      success: true,
      message: '注文が保存されました',
      id: result.insertedId
    });
  } catch (error) {
    console.error('API処理エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { getOrders } = require('./services/database');
    const orders = await getOrders();
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('注文データ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});


app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('商品データ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.get('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await getProductById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品が見つかりません'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('商品データ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const result = await saveProduct(req.body);
    
    res.status(201).json({
      success: true,
      message: '商品が保存されました',
      id: result.insertedId
    });
  } catch (error) {
    console.error('商品データ保存エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.put('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    await updateProduct(productId, req.body);
    
    res.status(200).json({
      success: true,
      message: '商品が更新されました'
    });
  } catch (error) {
    console.error('商品データ更新エラー:', error);
    
    if (error.message.includes('見つかりません')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.delete('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    await deleteProduct(productId);
    
    res.status(200).json({
      success: true,
      message: '商品が削除されました'
    });
  } catch (error) {
    console.error('商品データ削除エラー:', error);
    
    if (error.message.includes('見つかりません')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = await getUsers({}, page, pageSize);
    
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('ユーザデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ユーザが見つかりません'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('ユーザデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const result = await saveUser(req.body);
    
    res.status(201).json({
      success: true,
      message: 'ユーザが保存されました',
      id: result.insertedId
    });
  } catch (error) {
    console.error('ユーザデータ保存エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await updateUser(userId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'ユーザが更新されました'
    });
  } catch (error) {
    console.error('ユーザデータ更新エラー:', error);
    
    if (error.message.includes('見つかりません')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await deleteUser(userId);
    
    res.status(200).json({
      success: true,
      message: 'ユーザが削除されました'
    });
  } catch (error) {
    console.error('ユーザデータ削除エラー:', error);
    
    if (error.message.includes('見つかりません')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  const { closeMongoDB } = require('./services/database');
  await closeMongoDB();
  process.exit(0);
});
