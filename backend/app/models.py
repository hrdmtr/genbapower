from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    productId: str
    name: str
    price: int
    image: str
    description: str

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    productId: Optional[str] = None
    name: Optional[str] = None
    price: Optional[int] = None
    image: Optional[str] = None
    description: Optional[str] = None

class ProductInDB(ProductBase):
    id: str = Field(alias="_id")
    createdAt: datetime

class Product(ProductInDB):
    pass
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        populate_by_name = True
