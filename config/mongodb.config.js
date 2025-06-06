/**
 * MongoDB接続設定
 */
module.exports = {
  uri: "mongodb+srv://cluster0.5gmgchv.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority",
  dbName: "genbapower",
  options: {
    tlsCertificateKeyFile: "./config/certs/mongodb.pem",
    serverApi: { version: '1' }
  },
  collection: "orders"
};
