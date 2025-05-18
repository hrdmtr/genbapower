const express = require('express');
const path = require('path');
const { connectToMongoDB, saveOrder } = require('./services/database');

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

app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  const { closeMongoDB } = require('./services/database');
  await closeMongoDB();
  process.exit(0);
});
