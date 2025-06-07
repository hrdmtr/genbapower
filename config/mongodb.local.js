/**
 * MongoDB接続設定（ローカルモード用）
 */
module.exports = {
  uri: "mongodb://localhost:27017",
  dbName: "genbapower",
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  collection: "orders"
};
