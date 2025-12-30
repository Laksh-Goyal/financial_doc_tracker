import http.client
import os

# Hardcoded key from .env check
API_KEY = "21b02fdb7fmshc7f05693d0c69f4p181013jsndcb677767666"
HOST = "seeking-alpha.p.rapidapi.com"

conn = http.client.HTTPSConnection(HOST)

headers = {
    'x-rapidapi-host': HOST,
    'x-rapidapi-key': API_KEY
}

print(f"Testing API with Key: {API_KEY}")
print(f"Target: https://{HOST}/symbols/get-profile?symbols=AAPL")

try:
    conn.request("GET", "/symbols/get-profile?symbols=AAPL", headers=headers)
    res = conn.getresponse()
    data = res.read()
    print(f"Status: {res.status}")
    print(f"Reason: {res.reason}")
    print("Response Body:")
    print(data.decode("utf-8"))
    
    with open("debug_output.txt", "w") as f:
        f.write(f"Status: {res.status}\n")
        f.write(f"Reason: {res.reason}\n")
        f.write("Response Body:\n")
        f.write(data.decode("utf-8"))
except Exception as e:
    print(f"Error: {e}")
