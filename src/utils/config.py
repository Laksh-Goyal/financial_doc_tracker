import os
from dotenv import load_dotenv

def load_config():
    """
    Load environment variables from .env file.
    """
    load_dotenv()
    return {
        "RAPID_API_KEY": os.getenv("RAPID_API_KEY"),
        "RAPID_API_HOST": os.getenv("RAPID_API_HOST")
    }
