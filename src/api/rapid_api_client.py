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

    def get_profile_info(self, ticker: str):
        """
        Fetch stock information for a given ticker.
        """
        print(f"Fetching info for {ticker}...")
        self.conn.request("GET", f"/symbols/get-profile?symbols={ticker}", headers=self.headers)
        response = self.conn.getresponse()
        data = response.read()
        return json.loads(data.decode("utf-8"))

    def get_summary_info(self, ticker: str):
        """
        Fetch stock summary information for a given ticker.
        """
        print(f"Fetching summary info for {ticker}...")
        self.conn.request("GET", f"/symbols/get-summary?symbols={ticker}", headers=self.headers)
        response = self.conn.getresponse()
        data = response.read()
        return json.loads(data.decode("utf-8"))

    def get_financial_info(self, ticker: str):
        """
        Fetch stock financial information for a given ticker.
        """
        print(f"Fetching financial info for {ticker}...")
        self.conn.request("GET", f"/symbols/get-financials?symbols={ticker}&target_currency=USD&period_type=annual&statement_type=income-statement", headers=self.headers)
        response = self.conn.getresponse()
        data = response.read()
        return json.loads(data.decode("utf-8"))