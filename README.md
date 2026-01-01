# Financial Doc Tracker

A modern web application to track and compare financial documents and stock data using the Seeking Alpha API.

## Features
- **Dashboard UI**: Clean, dark-mode interface for tracking stocks.
- **Multi-Ticker Search**: Fetch data for multiple companies at once (e.g., "AAPL, TSLA, MSFT").
- **Financial Comparison**: Side-by-side table view of key financial metrics (Revenue, Net Income, etc.).
- **Smart API Client**: Automatically handles batching and parsing of financial data.

## Project Structure
```
financial_doc_tracker/
├── src/
│   ├── app.py                 # FastAPI Application functionality
│   ├── main.py                # Legacy CLI entry point
│   ├── api/
│   │   └── rapid_api_client.py # Core API Client
│   ├── templates/
│   │   └── index.html         # Main Dashboard HTML
│   └── static/
│       ├── css/
│       │   └── styles.css     # Dark mode styling
│       └── js/
│           └── main.js        # Frontend logic
├── requirements.txt           # Dependencies
└── .env                       # API Configuration
```

## Setup & Installation

1. **Clone the repository** (if not already done).
2. **Set up the Environment**:
   Ensure you have a `.env` file with your RapidAPI key:
   ```bash
   RAPID_API_KEY=your_api_key_here
   RAPID_API_HOST=seeking-alpha.p.rapidapi.com
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### Web Dashboard (Recommended)
Start the FastAPI server:
```bash
python3 -m src.app
```
Then open your browser to: **http://localhost:8000**

### CLI Version (Legacy)
You can still run the command-line interface:
```bash
python3 -m src.main
```

## Technologies
- **Backend**: Python, FastAPI, Uvicorn
- **Frontend**: HTML5, Vanilla CSS (Dark Theme), JavaScript (ES6+)
- **API**: RapidAPI (Seeking Alpha)
