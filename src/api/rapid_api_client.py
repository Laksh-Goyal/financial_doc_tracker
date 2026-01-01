import http.client
import json

class RapidApiClient:
    def __init__(self, api_key: str, host: str = "seeking-alpha.p.rapidapi.com"):
        self.api_key = api_key
        self.host = host
        self.headers = {
            'x-rapidapi-host': self.host,
            'x-rapidapi-key': self.api_key
        }
        self.conn = http.client.HTTPSConnection(self.host)

    def _process_response(self, response_data):
        """
        Helper to extract attributes and inject ticker ID.
        """
        try:
            data = json.loads(response_data.decode("utf-8"))
            if "data" not in data:
                return []
            
            results = []
            for item in data["data"]:
                attrs = item.get("attributes", {})
                attrs["ticker"] = item.get("id") # Inject ticker ID
                results.append(attrs)
            return results
        except Exception as e:
            print(f"Error parsing response: {e}")
            return []

    def get_profile_info(self, ticker: str):
        """
        Fetch stock information for a given ticker.
        """
        print(f"Fetching info for {ticker}...")
        self.conn.request("GET", f"/symbols/get-profile?symbols={ticker}", headers=self.headers)
        response = self.conn.getresponse()
        return self._process_response(response.read())

    def get_summary_info(self, ticker: str):
        """
        Fetch stock summary information for a given ticker.
        """
        print(f"Fetching summary info for {ticker}...")
        self.conn.request("GET", f"/symbols/get-summary?symbols={ticker}", headers=self.headers)
        response = self.conn.getresponse()
        return self._process_response(response.read())

    def get_financial_info(self, tickers: str):
        """
        Fetch stock financial information for one or more tickers.
        Args:
            tickers: A single ticker or comma-separated list of tickers (e.g. "AAPL" or "AAPL%2CTSLA")
        """
        # Handle encoded commas if passed directly
        if "%2C" in tickers:
             ticker_list = [t.strip() for t in tickers.split("%2C") if t.strip()]
        else:
             ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]

        if not ticker_list:
            return []
            
        all_results = []
        for ticker in ticker_list:
            print(f"Fetching financial info for {ticker}...")
            try:
                self.conn.request("GET", f"/symbols/get-financials?symbol={ticker}&target_currency=USD&period_type=annual&statement_type=income-statement", headers=self.headers)
                response = self.conn.getresponse()
                data = json.loads(response.read().decode("utf-8"))
                # Financial info returns a list of sections directly
                all_results.append({"ticker": ticker, "financials": data})
            except Exception as e:
                 print(f"Failed to fetch financial info for {ticker}: {e}")
                 
        return all_results

    def get_valuation_info(self, ticker: str):
        """
        Fetch stock valuation information for a given ticker.
        """
        print(f"Fetching valuation info for {ticker}...")
        self.conn.request("GET", f"/symbols/get-valuation?symbols={ticker}", headers=self.headers)
        response = self.conn.getresponse()
        return self._process_response(response.read())