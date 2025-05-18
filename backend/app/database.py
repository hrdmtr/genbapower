from fastapi import HTTPException
from datetime import datetime
import uuid

db = {
    "products": []
}

def add_sample_data():
    if not db["products"]:
        db["products"].append({
            "_id": str(uuid.uuid4()),
            "productId": "P001",
            "name": "醤油ラーメン",
            "price": 800,
            "image": "images/shoyu_ramen.jpg",
            "description": "当店自慢の醤油ベーススープに特製の中太麺が絡む一品",
            "createdAt": datetime.utcnow().isoformat()
        })

async def connect_to_mongo():
    """インメモリデータベースの初期化"""
    add_sample_data()
    print("インメモリデータベース初期化完了")

async def close_mongo_connection():
    """何もしない（互換性のため残す）"""
    pass

def get_collection(collection_name):
    """指定したコレクションを取得する"""
    if collection_name not in db:
        db[collection_name] = []
    return db[collection_name]
