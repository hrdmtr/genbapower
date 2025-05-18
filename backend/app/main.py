from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from .database import connect_to_mongo, close_mongo_connection
from .routers import products

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

app.include_router(products.router, prefix="/api/products", tags=["products"])

@app.on_event("startup")
async def startup_db_client():
    asyncio.create_task(connect_to_mongo())

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()
