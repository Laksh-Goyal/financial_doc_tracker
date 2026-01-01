def format_stock_data(data: dict) -> str:
    """
    Format the stock profile data into a readable string with columnar layout.
    """
    if "data" not in data or not data["data"]:
        return "No data found."

    # Define the rows we want to show
    headers = [
        "Company",
        "Sector",
        "Price",
        "Market Cap"
    ]
    
    # Extract data for each company
    columns = []
    
    # Add Row Labels column
    label_column = ["Attribute"] + headers
    columns.append(label_column)

    for item in data["data"]:
        attrs = item.get("attributes", {})
        ticker = item.get("id", "N/A")
        
        # extracted fields
        company_name = f"{attrs.get('companyName', 'N/A')} ({ticker})"
        sector = attrs.get("sectorname", "N/A")
        
        price_info = attrs.get("lastDaily", {})
        current_price = price_info.get("last", "N/A")
        if current_price != "N/A":
            current_price = f"${current_price}"
            
        market_cap = attrs.get("marketCap", "N/A")
        # format market cap
        if isinstance(market_cap, (int, float)):
             if market_cap >= 1e9:
                 market_cap_str = f"${market_cap / 1e9:.2f}B"
             elif market_cap >= 1e6:
                 market_cap_str = f"${market_cap / 1e6:.2f}M"
             else:
                 market_cap_str = f"${market_cap:,.2f}"
        else:
            market_cap_str = str(market_cap)

        # Build column for this company
        col = [
            ticker, # Header for the column (Ticker)
            company_name,
            sector,
            current_price,
            market_cap_str
        ]
        columns.append(col)

    # Determine width for each column
    col_widths = []
    for col in columns:
        max_width = max(len(str(val)) for val in col)
        col_widths.append(max_width + 2) # Add some padding

    # Build the output string row by row
    num_rows = len(columns[0])
    output_lines = []
    
    for row_idx in range(num_rows):
        row_values = []
        for col_idx, col in enumerate(columns):
            val = str(col[row_idx])
            width = col_widths[col_idx]
            # Left align
            row_values.append(val.ljust(width))
        
        # Join with vertical separator
        line = "|".join(row_values)
        output_lines.append(line)
        
        # Add a separator line after the header (row 0)
        if row_idx == 0:
            sep_values = ["-" * width for width in col_widths]
            output_lines.append("+".join(sep_values))

    return "\n".join(output_lines)
