from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pathlib import Path

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA = BASE_DIR / "data" / "processed"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def read_csv(name):
    path = DATA / name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return pd.read_csv(path).to_dict(orient="records")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/revenue")
def revenue():
    return read_csv("monthly_revenue.csv")

@app.get("/api/top-customers")
def top_customers():
    return read_csv("top_customers.csv")

@app.get("/api/categories")
def categories():
    return read_csv("category_performance.csv")

@app.get("/api/regions")
def regions():
    return read_csv("regional_analysis.csv")