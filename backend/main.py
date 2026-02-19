from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src import database, models
from src.api import assets, market, transactions
from src.config import firebase

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Finance Dashboard Backend")

origins = ["http://localhost:4200"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assets.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(market.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Wealth Manager API is running!"}