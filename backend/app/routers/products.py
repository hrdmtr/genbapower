from fastapi import APIRouter, HTTPException, Body, Path, Query
from typing import List, Dict, Any
import datetime
import uuid
from ..database import get_collection
from ..models import ProductCreate, ProductUpdate, Product

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
async def get_products():
    products = get_collection("products")
    return products

@router.post("", status_code=201)
async def create_product(product: ProductCreate = Body(...)):
    products = get_collection("products")
    
    new_product = product.dict()
    new_product["_id"] = str(uuid.uuid4())
    new_product["createdAt"] = datetime.datetime.utcnow().isoformat()
    
    products.append(new_product)
    
    return new_product

@router.get("/{product_id}")
async def get_product(product_id: str = Path(...)):
    products = get_collection("products")
    
    for product in products:
        if product["_id"] == product_id or product["productId"] == product_id:
            return product
    
    raise HTTPException(status_code=404, detail=f"ID {product_id} の商品が見つかりません")

@router.put("/{product_id}")
async def update_product(
    product_id: str = Path(...),
    product_data: ProductUpdate = Body(...)
):
    products = get_collection("products")
    
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="更新するデータがありません")
    
    for i, product in enumerate(products):
        if product["_id"] == product_id or product["productId"] == product_id:
            products[i].update(update_data)
            return products[i]
    
    raise HTTPException(status_code=404, detail=f"ID {product_id} の商品が見つかりません")

@router.delete("/{product_id}")
async def delete_product(product_id: str = Path(...)):
    products = get_collection("products")
    
    for i, product in enumerate(products):
        if product["_id"] == product_id or product["productId"] == product_id:
            del products[i]
            return {"message": "商品が正常に削除されました"}
    
    raise HTTPException(status_code=404, detail=f"ID {product_id} の商品が見つかりません")
