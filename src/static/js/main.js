document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const tickerInput = document.getElementById('tickerInput');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const profileSection = document.getElementById('profile-section');
    const financialSection = document.getElementById('financial-section');
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    // Handle Search
    const handleSearch = async () => {
        const query = tickerInput.value.trim();
        if (!query) return;

        // Reset UI
        errorDiv.classList.add('hidden');
        profileSection.innerHTML = '';
        tableBody.innerHTML = '';
        financialSection.classList.add('hidden');
        loading.classList.remove('hidden');

        try {
            const response = await fetch(`/api/data?tickers=${encodeURIComponent(query)}`);
            const result = await response.json();

            if (result.status === 'success') {
                renderDashboard(result.data);
            } else {
                showError(result.message || 'Failed to fetch data');
            }
        } catch (err) {
            showError('Network error. Please try again.');
            console.error(err);
        } finally {
            loading.classList.add('hidden');
        }
    };

    searchBtn.addEventListener('click', handleSearch);
    tickerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    }

    function renderDashboard(data) {
        const { profile, financials } = data;

        // 1. Render Profile Cards
        if (profile && profile.length > 0) {
            profileSection.innerHTML = profile.map(item => createCardHTML(item)).join('');
        }

        // 2. Render Financial Table
        if (financials && financials.length > 0) {
            financialSection.classList.remove('hidden');
            renderTable(financials);
        }
    }

    function createCardHTML(item) {
        // The API returns a flat object, not nested in attributes for some endpoints
        // Based on debug output:
        // Company: item.companyName
        // Ticker: item.ticker
        // Price: item.lastDaily.last
        // Sector: item.sectorname
        // Market Cap: item.marketCap

        const company = item.companyName || item.ticker;
        const price = item.lastDaily ? item.lastDaily.last : "N/A";
        const sector = item.sectorname || "Unknown";

        // Format Market Cap
        let marketCapStr = "N/A";
        if (item.marketCap) {
            marketCapStr = `$${(item.marketCap / 1000000000).toFixed(2)}B`;
        }

        return `
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3>${company}</h3>
                        <span class="ticker">${item.ticker}</span>
                    </div>
                    <div class="price-container">
                        <span class="price">$${price}</span>
                    </div>
                </div>
                <div class="meta-info">
                    <div class="meta-row">
                        <span>Sector</span>
                        <span>${sector}</span>
                    </div>
                    <div class="meta-row">
                        <span>Market Cap</span>
                        <span>${marketCapStr}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTable(financialsList) {
        // Clear previous headers (keep first 'Metric' th)
        while (tableHeader.children.length > 1) {
            tableHeader.removeChild(tableHeader.lastChild);
        }

        // Add Ticker Headers
        financialsList.forEach(item => {
            const th = document.createElement('th');
            th.textContent = item.ticker;
            tableHeader.appendChild(th);
        });

        const metricsOfInterest = [
            { id: "total_revenue", label: "Total Revenue (USD)" },
            { id: "cost_revenue", label: "Cost of Revenue (USD)" },
            { id: "gross_profit", label: "Gross Profit (USD)" },
            { id: "operating_income", label: "Operating Income (USD)" },
            { id: "net_income", label: "Net Income (USD)" }
        ];

        // Helper to format large numbers
        const formatMoney = (val) => {
            if (val === '-' || val === null || val === undefined) return '-';
            const num = parseFloat(val.toString().replace(/,/g, ''));
            if (isNaN(num)) return val;

            // If > 1 Billion
            if (num > 1000000000) {
                return `$${(num / 1000000000).toFixed(2)}B`;
            }
            // If > 1 Million
            if (num > 1000000) {
                return `$${(num / 1000000).toFixed(2)}M`;
            }
            return `$${num.toLocaleString()}`;
        };

        // Helper to find value for a metric in a ticker's data
        const getValue = (tickerData, metricId) => {
            if (!tickerData) return '-';
            // tickerData is a list of sections. Traverse it.
            for (const section of tickerData) {
                for (const row of section.rows) {
                    if (row.name === metricId) {
                        // Get the most recent TTM or latest year value
                        // Prefer TTM if available
                        const ttmCell = row.cells.find(c => c.name === 'TTM');
                        if (ttmCell) return ttmCell.raw_value || ttmCell.value;

                        // Otherwise get the last cell (latest year)
                        const latetCell = row.cells[row.cells.length - 1];
                        return latetCell ? (latetCell.raw_value || latetCell.value) : '-';
                    }
                }
            }
            return '-';
        };

        const rowsHTML = metricsOfInterest.map(metric => {
            let rowHtml = `<tr><td>${metric.label}</td>`;
            financialsList.forEach(item => {
                const val = getValue(item.financials, metric.id);
                rowHtml += `<td>${formatMoney(val)}</td>`;
            });
            rowHtml += `</tr>`;
            return rowHtml;
        }).join('');

        tableBody.innerHTML = rowsHTML;
    }
});
