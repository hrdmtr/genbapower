const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { connectToMongoDB, saveOrder } = require('./services/database');
const { getProducts, getProductById, saveProduct, updateProduct, deleteProduct } = require('./services/products');
const { getServerSettings, saveServerSettings } = require('./services/server-settings');
const { 
  getUsers, 
  getUserById, 
  saveUser, 
  updateUser, 
  deleteUser, 
  getUserCount,
  deleteAllUsers,
  insertManyUsers
} = require('./services/users');

const app = express();
const PORT = process.env.PORT || 8000;
const APP_MODE = process.env.APP_MODE || 'development';

console.log(`現在の動作モード: ${APP_MODE}`);
if (APP_MODE === 'local') {
  console.log('ローカルモード: LIFF認証をバイパスします');
}

app.use(cors());
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

app.get('/api/users/export', async (req, res) => {
  try {
    const users = await getUsers({}, 0); // limit=0 で全件取得
    
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('ユーザデータエクスポートエラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

app.post('/api/users/import', async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: '有効なユーザデータが必要です'
      });
    }
    
    const deleteResult = await deleteAllUsers();
    const insertResult = await insertManyUsers(users);
    
    res.status(200).json({
      success: true,
      message: 'ユーザデータのインポートが完了しました',
      count: insertResult.insertedCount,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('ユーザデータインポートエラー:', error);
    res.status(500).json({
      success: false,
      message: `インポートに失敗しました: ${error.message}`
    });
  }
});

app.get('/api/users', async (req, res) => {
  const { search, sortField, sortOrder, page = 1, limit = 20 } = req.query;
  console.log('Request query params:', req.query);
  
  try {
    let query = {};
    let sortOptions = {};
    
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { userId: searchRegex },
          { status: searchRegex },
          { rank: searchRegex },
          { memo: searchRegex }
        ]
      };
    }
    
    if (sortField && sortOrder) {
      sortOptions[sortField] = sortOrder === 'desc' ? -1 : 1;
    }
    
    const users = await getUsers(query, limitNum, sortOptions, skip);
    const totalUsers = await getUserCount(query);
    
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum)
      }
    });
  } catch (error) {
    console.error('ユーザデータ取得エラー:', error);
    
    try {
      console.log('Falling back to mock data due to MongoDB connection error');
      
      const mockUsers = [
        { _id: '1', userId: 'user001', points: 1000, registrationDate: new Date('2024-01-15'), status: 'ACTIVE', rank: 'PREMIUM', memo: 'テストユーザー1' },
        { _id: '2', userId: 'user002', points: 500, registrationDate: new Date('2024-02-10'), status: 'INACTIVE', rank: 'REGULAR', memo: 'テストユーザー2' },
        { _id: '3', userId: 'admin001', points: 2000, registrationDate: new Date('2024-01-01'), status: 'ACTIVE', rank: 'ADMIN', memo: '管理者' },
        { _id: '4', userId: 'test123', points: 750, registrationDate: new Date('2024-03-05'), status: 'ACTIVE', rank: 'REGULAR', memo: 'サンプル' }
      ];
      
      let filteredUsers = [...mockUsers];
      
      if (search && search.trim()) {
        console.log('Applying search filter:', search);
        const searchTerm = search.trim().toLowerCase();
        console.log('Search term (lowercase):', searchTerm);
        
        filteredUsers = filteredUsers.filter(user => {
          const matchUserId = user.userId && user.userId.toLowerCase().includes(searchTerm);
          const matchMemo = user.memo && user.memo.toLowerCase().includes(searchTerm);
          
          const matchStatus = user.status && user.status.toLowerCase() === searchTerm;
          const matchRank = user.rank && user.rank.toLowerCase() === searchTerm;
          
          console.log(`Filtering user ${user.userId}:`, {
            matchUserId,
            matchStatus,
            matchRank,
            matchMemo,
            result: matchUserId || matchStatus || matchRank || matchMemo
          });
          
          return matchUserId || matchStatus || matchRank || matchMemo;
        });
      }
      
      if (sortField && sortOrder) {
        console.log('Applying sort:', sortField, sortOrder);
        filteredUsers.sort((a, b) => {
          let aVal = a[sortField];
          let bVal = b[sortField];
          
          if (sortField === 'registrationDate') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
          }
          
          if (sortField === 'points') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
          }
          
          if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;
      const totalUsers = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(skip, skip + limitNum);
      
      console.log('Returning mock data with', filteredUsers.length, 'total users');
      console.log('Paginated users:', paginatedUsers.map(u => u.userId));
      console.log('Pagination:', { page: pageNum, limit: limitNum, total: totalUsers, totalPages: Math.ceil(totalUsers / limitNum) });
      
      return res.status(200).json({
        success: true,
        data: paginatedUsers,
        message: 'Using mock data (MongoDB unavailable)',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limitNum)
        }
      });
    } catch (mockError) {
      console.error('Mock data fallback error:', mockError);
      return res.status(500).json({
        success: false,
        message: 'サーバーエラーが発生しました'
      });
    }
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



app.use('/api/line', require('./routes/line-routes'));

app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  const { closeMongoDB } = require('./services/database');
  await closeMongoDB();
  process.exit(0);
});

app.get('/api/server-settings', async (req, res) => {
  try {
    const settings = await getServerSettings();
    
    res.status(200).json({
      success: true,
      data: settings || {
        appName: 'QRコードリーダー注文システム',
        appNameDescription: 'アプリケーションの名前',
        baseUrl: 'http://localhost:8000',
        baseUrlDescription: 'APIリクエストのベースURL',
        recordsPerPage: 20,
        recordsPerPageDescription: '1ページあたりの表示件数'
      }
    });
  } catch (error) {
    console.error('サーバー設定取得エラー:', error);
    
    res.status(200).json({
      success: true,
      data: {
        appName: 'QRコードリーダー注文システム',
        appNameDescription: 'アプリケーションの名前',
        baseUrl: 'http://localhost:8000',
        baseUrlDescription: 'APIリクエストのベースURL',
        recordsPerPage: 20,
        recordsPerPageDescription: '1ページあたりの表示件数'
      },
      message: 'デフォルト設定を使用しています (MongoDB接続エラー)'
    });
  }
});

app.post('/api/server-settings', async (req, res) => {
  try {
    const result = await saveServerSettings(req.body);
    
    res.status(200).json({
      success: true,
      message: 'サーバー設定が保存されました'
    });
  } catch (error) {
    console.error('サーバー設定保存エラー:', error);
    
    res.status(200).json({
      success: true,
      message: 'サーバー設定が保存されました (モック保存)',
      mockSave: true
    });
  }
});
