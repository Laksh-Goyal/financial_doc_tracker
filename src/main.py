import os
from src.utils.config import load_config
from src.api.rapid_api_client import RapidApiClient

def main():
    """
    Main entry point for the financial doc tracker.
    """
    print("Starting Financial Doc Tracker...")
    
    # Load configuration
    config = load_config()
    api_key = config.get("RAPID_API_KEY")
    
     
    if not api_key:
        print("Error: RAPID_API_KEY not found in environment variables. Please set it in the .env file.")
        return

    # Initialize API client
    client = RapidApiClient(api_key=api_key)
    
    # Placeholder for user interaction
    print("Ready to fetch stock information.")
    
    # Get user input for tickers
    tickers = []
    print("Enter stock tickers one by one. Press Enter without typing anything to finish.")
    while True:
        ticker_input = input("Enter ticker: ").strip()
        if not ticker_input:
            break
        tickers.append(ticker_input)

    if not tickers:
        print("No tickers entered. Exiting.")
        return

    # Concatenate tickers with URL-encoded comma
    ticker_string = "%2C".join(tickers)
    print(f"Fetching info for: {ticker_string}")

    try:
        # Fetch profile info
        profile_info = client.get_profile_info(ticker_string)
        
        # Fetch financial info (client now handles multiple tickers loop)
        financial_info = client.get_financial_info(ticker_string)
        print(financial_info) # optional debug print
        
        # Display formatted info
        from src.utils.formatter import format_stock_data
        print("\n" + format_stock_data(profile_info))
        
    except Exception as e:
        print(f"Failed to fetch info: {e}")

if __name__ == "__main__":
    main()
