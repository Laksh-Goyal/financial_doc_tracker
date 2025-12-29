from dataclasses import dataclass

@dataclass
class Stock:
    ticker: str
    price: float
    company_name: str
    # Add more fields as needed
