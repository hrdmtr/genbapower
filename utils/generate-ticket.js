const { createChargeTicket, createOrUpdateTestTicket } = require('../services/charge-tickets');
require('dotenv').config();

async function generateTicket() {
  try {
    const args = process.argv.slice(2);
    const isTest = args.includes('--test');
    
    if (isTest) {
      console.log('テスト用チャージ券を生成します...');
      const ticket = await createOrUpdateTestTicket();
      console.log('テスト用チャージ券が生成されました:');
      console.log(`チケットID: ${ticket.ticket_id}`);
      console.log(`パスコード: ${ticket.passcode}`);
      console.log(`金額: ${ticket.amount}円`);
      console.log(`有効期限: ${ticket.expires_at}`);
    } else {
      const amount = parseInt(args[0] || '1000', 10);
      
      if (isNaN(amount) || amount <= 0) {
        console.error('有効な金額を指定してください');
        process.exit(1);
      }
      
      console.log(`${amount}円のチャージ券を生成します...`);
      const ticket = await createChargeTicket(amount);
      
      console.log('チャージ券が生成されました:');
      console.log(`チケットID: ${ticket.ticket_id}`);
      console.log(`パスコード: ${ticket.passcode}`);
      console.log(`金額: ${ticket.amount}円`);
      console.log(`有効期限: ${ticket.expires_at}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

const { connectToMongoDB } = require('../services/database');
connectToMongoDB()
  .then(() => generateTicket())
  .catch(err => {
    console.error('MongoDB接続エラー:', err);
    process.exit(1);
  });
