from fastapi import FastAPI, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import os
from functools import lru_cache

from src.utils.config import load_config
from src.api.rapid_api_client import RapidApiClient

app = FastAPI(title="Financial Doc Tracker")

# Mount static files
app.mount("/static", StaticFiles(directory="src/static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="src/templates")

# Load config once
config = load_config()
api_key = config.get("RAPID_API_KEY")

@lru_cache(maxsize=32)
def get_client():
    if not api_key:
        raise ValueError("RAPID_API_KEY not found in environment")
    return RapidApiClient(api_key=api_key)

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/data")
async def get_financial_data(tickers: str = Query(..., description="Comma-separated list of tickers")):
    try:
        client = get_client()
        # Fetch profile info
        profile_info = client.get_profile_info(tickers)
        
        # Fetch financial info
        financials_info = client.get_financial_info(tickers)

        # Fetch summary info
        summary_info = client.get_summary_info(tickers)

        # Fetch valuation info
        valuation_info = client.get_valuation_info(tickers)
        
        return JSONResponse({
            "status": "success",
            "data": {
                "profile": profile_info,
                "financials": financials_info,
                "summary": summary_info,
                "valuation": valuation_info
            }
        })
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.app:app", host="0.0.0.0", port=8000, reload=True)
