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
        print("Error: RAPID_API_KEY not found in environment variables.")
        return

    # Initialize API client
    client = RapidApiClient(api_key=api_key)
    
    # Placeholder for user interaction
    print("Ready to fetch stock information.")
    
    # Test the client
    ticker = "AAPL"
    try:
        info = client.get_profile_info(ticker)
        print(f"Profile info for {ticker}: {info}")
    except Exception as e:
        print(f"Failed to fetch info for {ticker}: {e}")

if __name__ == "__main__":
    main()
