# Financial Doc Tracker 📈

A high-performance, modern web application for tracking and comparing stock market data and financial documents. This project leverages the Seeking Alpha API (via RapidAPI) to provide a clean, dashboard-style interface for both fundamental analysis and visual trend tracking.

> **First project done with vibe coding.** ✨

## Key Features

### 🏢 Dashboard & Comparison
- **Multi-Card Dashboard**: View key profile data (Market Cap, Dividend Yield, Sector) in a sleek horizontal slider.
- **Deep Financial Comparison**: compare across dozens of metrics (Income Statement, Margins, Valuation, etc.) with dynamic column scaling.
- **Default Tickers**: Configurable pre-loading (via `default_tickers.txt`) to have your favorite stocks ready on boot.

### 📊 Advanced Visualization
- **Multi-Chart Modal**: Interactive 4-chart analysis dashboard including:
    - Revenue & Profitability Trends
    - Operating Performance
    - Earnings Before Tax
    - Net Income History (5 Years)
- **Responsive Animations**: "Smart" hover-autoscrolling for long corporation and industry names ensures a perfectly aligned UI regardless of content length.

### ⚙️ Engine & Integration
- **Parallel Batch Loading**: Intelligent request manager that chunks tickers (4 max) and fetches them in parallel to maximize speed and API reliability.
- **Unified Data Source**: Enriched profiles combining data from Financials, Summary, Valuation, and Profile endpoints.
- **FastAPI Backend**: Robust Python backend with static file serving and template rendering.

## Project Structure
```
financial_doc_tracker/
├── default_tickers.txt        # Config for pre-loaded stocks
├── src/
│   ├── app.py                 # FastAPI Web Server
│   ├── api/
│   │   └── rapid_api_client.py # Core API Client (Batched requests)
│   ├── static/
│   │   ├── css/               # Modern Dark Theme & Animations
│   │   └── js/                # Dashboard Controller & Charting logic
│   ├── templates/
│   │   └── index.html         # SPA Dashboard Template
│   └── utils/                 # Formatting & Config Utilities
├── .env                       # API Configuration (Secrets)
└── requirements.txt           # Dependencies
```

## Setup & Installation

1. **Prerequisites**: Python 3.8+
2. **Configuration**: Create a `.env` file from `.env.example`:
   ```env
   RAPID_API_KEY=your_key_here
   RAPID_API_HOST=seeking-alpha.p.rapidapi.com
   ```
3. **Installation**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Launch**:
   ```bash
   python3 -m src.app
   ```
   Access at: **http://localhost:8000**

## Technologies
- **Backend**: Python, FastAPI, Uvicorn (StatReload enabled)
- **Frontend**: ES6+ JavaScript, Vanilla CSS (Modern Aesthetics), Chart.js
- **API**: RapidAPI (Seeking Alpha Endpoint)
