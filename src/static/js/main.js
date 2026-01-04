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
        const { profile, financials, summary, valuation } = data;

        // Initialize Modal Events
        initializeModal();

        // 1. Render Profile Cards
        if (profile && profile.length > 0) {
            profileSection.innerHTML = profile.map(item => createCardHTML(item, summary)).join('');

            // Add click events to cards
            document.querySelectorAll('.card').forEach(card => {
                card.addEventListener('click', () => {
                    const ticker = card.getAttribute('data-ticker');
                    openChartModal(ticker, financials);
                });
            });
        }

        // 2. Render Financial Table
        if (financials && financials.length > 0) {
            financialSection.classList.remove('hidden');
            // ... renderTable is called here normally ...
            renderTable(financials, summary, valuation);
        }
    }

    // --- Chart & Modal Logic ---
    let myChart = null;
    let isModalInitialized = false;

    function initializeModal() {
        if (isModalInitialized) return;

        const modal = document.getElementById("chartModal");
        const span = document.querySelector(".close-btn");

        if (!modal || !span) {
            console.error("Modal elements not found!");
            return;
        }

        span.onclick = function () {
            modal.classList.add("hidden");
        }

        window.onclick = function (event) {
            if (event.target == modal) {
                modal.classList.add("hidden");
            }
        }

        isModalInitialized = true;
        console.log("Modal initialized");
    }

    function openChartModal(ticker, financialsList) {
        console.log(`Opening chart for ${ticker}`);
        const modal = document.getElementById("chartModal");
        const modalTicker = document.getElementById("modalTicker");

        if (!modal || !modalTicker) {
            console.error("Modal DOM elements missing");
            return;
        }

        modalTicker.textContent = `${ticker} - 5 Year Analysis`;
        modal.classList.remove("hidden");
        // Ensure display is cleared in case inline style was set previously
        modal.style.display = "";

        const historicalData = extractHistoricalData(ticker, financialsList);
        if (historicalData) {
            console.log("Historical Data found:", historicalData);
            renderChart(historicalData);
        } else {
            console.warn("No historical data found for", ticker);
            // Optionally clear/hide chart??
        }
    }

    function extractHistoricalData(ticker, financialsList) {
        // Normalize ticker
        const targetTicker = ticker.toUpperCase();
        console.log(`Extracting data for ${targetTicker}`);
        const tickerData = financialsList.find(t => t.ticker.toUpperCase() === targetTicker);

        if (!tickerData) {
            console.warn("Ticker data not found in financials list");
            return null;
        }

        // We need: Years (labels), Revenue, Net Income
        // Find 'total_revenue' and 'net_income' rows in 'Income Statement' (usually first section)

        const labels = [];
        const revenueData = [];
        const profitData = [];

        // Income Statement Section
        if (!tickerData.financials || tickerData.financials.length === 0) return null;
        const section = tickerData.financials[0];
        if (!section) return null; // Safety check

        // Find header row for years (usually first row is header-like or we check row columns)
        // Actually, rows have 'cells'. Each cell has a name (e.g. 'Sep 2024').

        // Let's find the 'total_revenue' row first to get the columns
        const revRow = section.rows.find(r => r.name === 'total_revenue');
        const netRow = section.rows.find(r => r.name === 'net_income');

        if (revRow) {
            // Filter for actual date columns (ignore 'TTM' for history chart, or include it as last point?)
            // User asked for "last five years". Let's assume standard columns.
            // We want the last 5 columns excluding TTM if possible, or just the last 5 available.

            // Extract all cells that look like dates (e.g. "Sep 20XX" or "Dec 20XX")
            // reversing to have oldest to newest left-to-right

            // The API often returns [Oldest ... Newest, TTM]. 
            // Let's grab the last 5 columns BEFORE TTM.

            const cells = revRow.cells;
            // Filter out TTM for the trend line, or keep it? TTM is useful. Let's keep it as the latest point.
            // Actually, usually charts show annual history. Let's grab last 5 Annual columns.

            const dataPoints = [];

            cells.forEach((cell, index) => {
                if (cell.name === 'TTM') return; // Skip TTM for pure annual history, or keep? Let's skip to show closed years.

                // Get corresponding net income
                let netVal = 0;
                if (netRow && netRow.cells[index]) {
                    netVal = parseFloat(netRow.cells[index].raw_value || netRow.cells[index].value);
                }

                const revVal = parseFloat(cell.raw_value || cell.value);

                dataPoints.push({
                    label: cell.name,
                    revenue: revVal,
                    profit: netVal
                });
            });

            // Sort by date components? Usually they are ordered.
            // Take last 5
            const last5 = dataPoints.slice(-5);

            return {
                labels: last5.map(d => d.label),
                revenue: last5.map(d => d.revenue),
                profit: last5.map(d => d.profit)
            };
        }

        return null;
    }

    function renderChart(data) {
        const ctx = document.getElementById('financialChart').getContext('2d');

        if (myChart) {
            myChart.destroy();
        }

        if (!data) return; // Handle no data case

        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Total Revenue',
                        data: data.revenue,
                        borderColor: '#4ade80', // Green
                        backgroundColor: 'rgba(74, 222, 128, 0.2)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Net Income',
                        data: data.profit,
                        borderColor: '#60a5fa', // Blue
                        backgroundColor: 'rgba(96, 165, 250, 0.2)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Fit container
                plugins: {
                    legend: {
                        labels: { color: '#e5e7eb' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9ca3af',
                            callback: function (value) {
                                if (value >= 1000000000) return '$' + (value / 1000000000).toFixed(1) + 'B';
                                if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                                return '$' + value;
                            }
                        },
                        grid: { color: '#374151' }
                    },
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: '#374151' }
                    }
                }
            }
        });
    }

    function createCardHTML(item, summaryList) {
        // ... (existing code, but added data-ticker attribute)
        // The API returns a flat object, not nested in attributes for some endpoints
        // Based on debug output:
        // Company: item.companyName
        // Ticker: item.ticker
        // Price: item.lastDaily.last
        // Sector: item.sectorname
        // Market Cap: item.marketCap

        // Find matching summary for extra data if needed
        const summaryItem = summaryList ? summaryList.find(s => s.ticker.toUpperCase() === item.ticker.toUpperCase()) : null;

        // Safe access to attributes
        const company = item.companyName || item.ticker;
        const price = item.lastDaily ? item.lastDaily.last : "N/A";
        const sector = item.sectorname || "Unknown";

        // Format Market Cap
        let marketCapStr = "N/A";
        if (item.marketCap) {
            marketCapStr = `$${(item.marketCap / 1000000000).toFixed(2)}B`;
        }

        // Add Div Rate if available
        let divInfo = "";
        if (summaryItem && summaryItem.divYield) {
            divInfo = `<div class="meta-row"><span>Div Yield</span><span>${summaryItem.divYield}%</span></div>`;
        }

        return `
            <div class="card" data-ticker="${item.ticker}">
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
                    ${divInfo}
                </div>
            </div>
        `;
    }

    function renderTable(financialsList, summaryList, valuationList) {
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
            // --- Income Statement ---
            { id: "total_revenue", label: "Sales / Revenue (USD)", type: "financial" },
            { id: "gross_profit", label: "Gross Profit (USD)", type: "financial" },
            { id: "operating_income", label: "Operating Income (USD)", type: "financial" },
            { id: "net_income", label: "Net Income (USD)", type: "financial" },

            // --- Margins & profitability ---
            { id: "grossMargin", label: "Gross Margin %", type: "summary" },
            { id: "netMargin", label: "Net Margin %", type: "summary" },
            { id: "roe", label: "Return on Equity (ROE) %", type: "summary" },
            { id: "roa", label: "Return on Assets (ROA) %", type: "summary" },

            // --- Growth ---
            { id: "revenueGrowth", label: "Revenue Growth (YoY) %", type: "summary" },
            { id: "dilutedEpsGrowth", label: "EPS Growth (YoY) %", type: "summary" },

            // --- Per Share Data ---
            { id: "dilutedEpsExclExtraItmes", label: "EPS (Diluted)", type: "summary" },
            { id: "estimateEps", label: "EPS (Forward Estimate)", type: "summary" },

            // --- Valleation ---
            { id: "peRatioFwd", label: "P/E Ratio (Forward)", type: "valuation" },
            { id: "lastClosePriceEarningsRatio", label: "P/E Ratio (TTM)", type: "summary" },
            { id: "pegRatio", label: "PEG Ratio", type: "valuation" },
            { id: "priceSales", label: "Price / Sales", type: "valuation" },
            { id: "priceBook", label: "Price / Book", type: "valuation" },
            { id: "evEbitda", label: "EV / EBITDA", type: "valuation" },
            { id: "divYield", label: "Dividend Yield %", type: "summary" },

            // --- Company Profile ---
            { id: "marketCap", label: "Market Cap", type: "summary" },
            { id: "numberOfEmployees", label: "Employees", type: "summary" },
            { id: "primaryname", label: "Industry", type: "summary" }
        ];

        // Helper to format large numbers
        const formatMoney = (val) => {
            if (val === '-' || val === null || val === undefined) return '-';
            const num = parseFloat(val.toString().replace(/,/g, ''));
            if (isNaN(num)) return val;

            if (num > 1000000000) {
                return `$${(num / 1000000000).toFixed(2)}B`;
            }
            if (num > 1000000) {
                return `$${(num / 1000000).toFixed(2)}M`;
            }
            return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
        };

        const formatNumber = (val, metricId) => {
            if (val === '-' || val === null || val === undefined) return '-';
            const num = parseFloat(val);
            if (isNaN(num)) return val;

            // Special handling for Market Cap in summary (it's raw number)
            if (metricId === 'marketCap') return formatMoney(val);
            // Employees (no decimals)
            if (metricId === 'numberOfEmployees') return num.toLocaleString(undefined, { maximumFractionDigits: 0 });

            return num.toFixed(2);
        }

        // Helper to find value
        const getValue = (ticker, metric) => {
            // Normalize ticker for lookup
            const targetTicker = ticker.toUpperCase();

            if (metric.type === 'financial') {
                const tickerData = financialsList.find(t => t.ticker.toUpperCase() === targetTicker);
                if (!tickerData) return '-';

                for (const section of tickerData.financials) {
                    for (const row of section.rows) {
                        if (row.name === metric.id) {
                            const ttmCell = row.cells.find(c => c.name === 'TTM');
                            const val = ttmCell ? (ttmCell.raw_value || ttmCell.value) : (row.cells[row.cells.length - 1].raw_value || row.cells[row.cells.length - 1].value);
                            return formatMoney(val);
                        }
                    }
                }
                return '-';
            } else if (metric.type === 'valuation') {
                const valItem = valuationList ? valuationList.find(v => v.ticker.toUpperCase() === targetTicker) : null;
                return valItem ? formatNumber(valItem[metric.id], metric.id) : '-';
            } else if (metric.type === 'summary') {
                const sumItem = summaryList ? summaryList.find(s => s.ticker.toUpperCase() === targetTicker) : null;
                // Handle Industry string separately
                if (metric.id === 'primaryname') return sumItem ? sumItem[metric.id] : '-';

                return sumItem ? formatNumber(sumItem[metric.id], metric.id) : '-';
            }
            return '-';
        };

        const rowsHTML = metricsOfInterest.map(metric => {
            let rowHtml = `<tr><td>${metric.label}</td>`;
            financialsList.forEach(item => {
                const val = getValue(item.ticker, metric);
                rowHtml += `<td>${val}</td>`;
            });
            rowHtml += `</tr>`;
            return rowHtml;
        }).join('');

        tableBody.innerHTML = rowsHTML;
    }
});
