// ブラウザ環境用のMongoDBモックライブラリ
// このファイルはブラウザでMongoDBモジュールの基本機能をエミュレートします

// グローバル名前空間にmongodbオブジェクトを追加
window.mongodb = {
  // MongoDBクライアント
  MongoClient: class MongoClient {
    constructor(uri, options) {
      this.uri = uri;
      this.options = options;
      this.isConnected = false;
      this.dbList = {};
      console.log('MongoClientをブラウザモードで作成:', uri);
    }

    // 接続
    async connect() {
      console.log('MongoClient.connect() 呼び出し:', this.uri);
      
      try {
        // 接続シミュレーション
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // URI検証
        if (!this.uri || !this.uri.includes('mongodb')) {
          throw new Error('無効なMongoDB URI');
        }
        
        // X509認証チェック
        if (this.uri.includes('authMechanism=MONGODB-X509')) {
          // 証明書パスのチェック
          if (this.options && this.options.tlsCertificateKeyFile) {
            console.log('X509証明書を使用:', this.options.tlsCertificateKeyFile);
            
            // 証明書パスのチェック (ブラウザからファイルシステムにはアクセス不可)
            if (!this.options.tlsCertificateKeyFile.includes('/')) {
              throw new Error('無効な証明書パス');
            }
          } else {
            throw new Error('X509認証に必要な証明書が指定されていません');
          }
        }
        
        // 接続成功
        this.isConnected = true;
        console.log('MongoDBに接続しました（モック）');
        return this;
      } catch (error) {
        console.error('MongoDB接続エラー（モック）:', error);
        throw error;
      }
    }

    // DB参照
    db(dbName) {
      console.log('MongoClient.db() 呼び出し:', dbName);
      
      if (!this.isConnected) {
        console.warn('データベースにアクセスする前に接続してください');
      }
      
      // 既存のDBインスタンスがあればそれを返す
      if (this.dbList[dbName]) {
        return this.dbList[dbName];
      }
      
      // 新しいDBインスタンスを作成
      const db = new DB(dbName, this);
      this.dbList[dbName] = db;
      return db;
    }

    // 切断
    async close() {
      console.log('MongoClient.close() 呼び出し');
      this.isConnected = false;
      return true;
    }
    
    // 接続状態確認用
    topology = {
      isConnected: function() {
        return this.isConnected;
      }
    }
  },
  
  // MongoDBの結果オブジェクト
  InsertOneResult: class InsertOneResult {
    constructor(id) {
      this.insertedId = id || 'mock_id_' + Date.now();
      this.acknowledged = true;
    }
  }
};

// データベースクラス
class DB {
  constructor(name, client) {
    this.name = name;
    this.client = client;
    this.collections = {};
    console.log('DB作成:', name);
  }

  // コレクション取得
  collection(name) {
    console.log('DB.collection() 呼び出し:', name);
    
    // 既存のコレクションがあればそれを返す
    if (this.collections[name]) {
      return this.collections[name];
    }
    
    // 新しいコレクションを作成
    const collection = new Collection(name, this);
    this.collections[name] = collection;
    return collection;
  }

  // コレクション作成
  async createCollection(name) {
    console.log('DB.createCollection() 呼び出し:', name);
    
    // 既存のコレクションがあればそれを返す
    if (this.collections[name]) {
      return this.collections[name];
    }
    
    // 新しいコレクションを作成
    const collection = new Collection(name, this);
    this.collections[name] = collection;
    return collection;
  }

  // コレクション一覧取得
  async listCollections(filter = {}) {
    console.log('DB.listCollections() 呼び出し');
    
    const colNames = Object.keys(this.collections);
    console.log('コレクション数:', colNames.length);
    
    // モックのカーソルオブジェクトを返す
    return {
      toArray: async () => colNames.map(name => ({ name }))
    };
  }

  // 管理者モード
  admin() {
    return new Admin(this);
  }
}

// コレクションクラス
class Collection {
  constructor(name, db) {
    this.name = name;
    this.db = db;
    this.documents = [];
    console.log('Collection作成:', name);
    
    // ローカルストレージから初期データをロード
    this.loadFromLocalStorage();
  }

  // ドキュメント挿入
  async insertOne(document) {
    console.log('Collection.insertOne() 呼び出し:', document);
    
    // _idフィールドがなければ追加
    if (!document._id) {
      document._id = 'mock_id_' + Date.now();
    }
    
    // ドキュメントを追加
    this.documents.push({ ...document });
    
    // ローカルストレージに保存
    this.saveToLocalStorage();
    
    // 結果を返す
    return new window.mongodb.InsertOneResult(document._id);
  }

  // 複数ドキュメント挿入
  async insertMany(documents) {
    console.log('Collection.insertMany() 呼び出し:', documents.length, '件');
    
    const insertedIds = [];
    
    // 各ドキュメントを追加
    for (const doc of documents) {
      // _idフィールドがなければ追加
      if (!doc._id) {
        doc._id = 'mock_id_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      }
      
      // ドキュメントを追加
      this.documents.push({ ...doc });
      insertedIds.push(doc._id);
    }
    
    // ローカルストレージに保存
    this.saveToLocalStorage();
    
    // 結果を返す
    return {
      insertedCount: documents.length,
      insertedIds: insertedIds,
      acknowledged: true
    };
  }

  // ドキュメント検索
  async findOne(filter = {}) {
    console.log('Collection.findOne() 呼び出し:', filter);
    
    // 指定されたフィルタに一致するドキュメントを検索
    const found = this.documents.find(doc => this.matchFilter(doc, filter));
    
    return found ? { ...found } : null;
  }

  // ドキュメント一覧検索
  find(filter = {}) {
    console.log('Collection.find() 呼び出し:', filter);
    
    // 指定されたフィルタに一致するドキュメントを検索
    const foundDocs = this.documents.filter(doc => this.matchFilter(doc, filter));
    
    // モックのカーソルオブジェクトを返す
    return {
      sort: (sortSpec) => {
        console.log('Collection.find().sort() 呼び出し:', sortSpec);
        return this; // ソートは無視
      },
      toArray: async () => foundDocs.map(doc => ({ ...doc }))
    };
  }

  // ドキュメント更新
  async updateOne(filter, update) {
    console.log('Collection.updateOne() 呼び出し:', filter, update);
    
    let modifiedCount = 0;
    
    // 指定されたフィルタに一致する最初のドキュメントを検索して更新
    const index = this.documents.findIndex(doc => this.matchFilter(doc, filter));
    
    if (index !== -1) {
      // $setオペレータの処理
      if (update.$set) {
        for (const [key, value] of Object.entries(update.$set)) {
          this.documents[index][key] = value;
        }
        modifiedCount = 1;
      }
      
      // $pushオペレータの処理
      if (update.$push) {
        for (const [key, value] of Object.entries(update.$push)) {
          if (!Array.isArray(this.documents[index][key])) {
            this.documents[index][key] = [];
          }
          this.documents[index][key].push(value);
        }
        modifiedCount = 1;
      }
      
      // ローカルストレージに保存
      this.saveToLocalStorage();
    }
    
    // 結果を返す
    return {
      matchedCount: index !== -1 ? 1 : 0,
      modifiedCount: modifiedCount,
      acknowledged: true
    };
  }

  // ドキュメント数の取得
  async countDocuments(filter = {}) {
    console.log('Collection.countDocuments() 呼び出し:', filter);
    
    // 指定されたフィルタに一致するドキュメント数を返す
    return this.documents.filter(doc => this.matchFilter(doc, filter)).length;
  }

  // フィルタとドキュメントのマッチング
  matchFilter(doc, filter) {
    // 空のフィルタは全てのドキュメントにマッチ
    if (Object.keys(filter).length === 0) {
      return true;
    }
    
    // 各フィルタ条件をチェック
    for (const [key, value] of Object.entries(filter)) {
      // 特殊クエリ演算子
      if (key === '$and' && Array.isArray(value)) {
        if (!value.every(subFilter => this.matchFilter(doc, subFilter))) {
          return false;
        }
        continue;
      }
      
      if (key === '$or' && Array.isArray(value)) {
        if (!value.some(subFilter => this.matchFilter(doc, subFilter))) {
          return false;
        }
        continue;
      }
      
      // 範囲クエリ
      if (typeof value === 'object' && value !== null) {
        if (value.$gt !== undefined && !(doc[key] > value.$gt)) return false;
        if (value.$gte !== undefined && !(doc[key] >= value.$gte)) return false;
        if (value.$lt !== undefined && !(doc[key] < value.$lt)) return false;
        if (value.$lte !== undefined && !(doc[key] <= value.$lte)) return false;
        if (value.$ne !== undefined && doc[key] === value.$ne) return false;
        if (value.$in !== undefined && !value.$in.includes(doc[key])) return false;
        
        // 他の演算子は省略
        continue;
      }
      
      // 通常の等価比較
      if (doc[key] !== value) {
        return false;
      }
    }
    
    return true;
  }

  // ローカルストレージからデータ読み込み
  loadFromLocalStorage() {
    try {
      const key = `mongodb_mock_${this.db.name}_${this.name}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        this.documents = JSON.parse(stored);
        console.log(`${this.name}コレクションをローカルストレージから読み込み:`, this.documents.length, '件');
      } else {
        console.log(`${this.name}コレクションのデータがローカルストレージにありません`);
      }
    } catch (error) {
      console.error('ローカルストレージからの読み込みエラー:', error);
    }
  }

  // ローカルストレージにデータ保存
  saveToLocalStorage() {
    try {
      const key = `mongodb_mock_${this.db.name}_${this.name}`;
      localStorage.setItem(key, JSON.stringify(this.documents));
      console.log(`${this.name}コレクションをローカルストレージに保存:`, this.documents.length, '件');
    } catch (error) {
      console.error('ローカルストレージへの保存エラー:', error);
    }
  }
}

// Admin操作クラス
class Admin {
  constructor(db) {
    this.db = db;
  }
  
  // Ping操作
  async ping() {
    console.log('Admin.ping() 呼び出し');
    
    // 常に成功
    return { ok: 1 };
  }
}

console.log('ブラウザ用MongoDBモックライブラリが初期化されました');