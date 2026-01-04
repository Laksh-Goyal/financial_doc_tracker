document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const tickerInput = document.getElementById('tickerInput');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const profileSection = document.getElementById('profile-section');
    const financialSection = document.getElementById('financial-section');
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    // Handle Search - batch requests in groups of 4 tickers
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
            // Split tickers into batches of 4
            const allTickers = query.split(',').map(t => t.trim()).filter(t => t);
            const BATCH_SIZE = 4;
            const batches = [];
            for (let i = 0; i < allTickers.length; i += BATCH_SIZE) {
                batches.push(allTickers.slice(i, i + BATCH_SIZE));
            }

            // Fetch all batches in parallel
            const batchPromises = batches.map(batch =>
                fetch(`/api/data?tickers=${encodeURIComponent(batch.join(','))}`).then(r => r.json())
            );
            const results = await Promise.all(batchPromises);

            // Merge all results
            const mergedData = {
                profile: [],
                financials: [],
                summary: [],
                valuation: []
            };

            for (const result of results) {
                if (result.status === 'success') {
                    mergedData.profile.push(...(result.data.profile || []));
                    mergedData.financials.push(...(result.data.financials || []));
                    mergedData.summary.push(...(result.data.summary || []));
                    mergedData.valuation.push(...(result.data.valuation || []));
                }
            }

            renderDashboard(mergedData);
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

    // Auto-load default tickers on page load
    async function loadDefaultTickers() {
        try {
            const response = await fetch('/api/default-tickers');
            const result = await response.json();
            if (result.status === 'success' && result.tickers) {
                tickerInput.value = result.tickers;
                handleSearch(); // Trigger the search
            }
        } catch (err) {
            console.error('Failed to load default tickers:', err);
        }
    }

    // Load defaults on page ready
    loadDefaultTickers();

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    }

    function renderDashboard(data) {
        const { profile, financials, summary, valuation } = data;

        // Initialize Modal Events
        initializeModal();

        // 1. Render Profile Cards - use financials as source of truth to ensure all tickers have cards
        if (financials && financials.length > 0) {
            // Create cards for ALL tickers from financials
            profileSection.innerHTML = financials.map(finItem => {
                // Find matching profile data if available
                const profileItem = profile ? profile.find(p => p.ticker.toUpperCase() === finItem.ticker.toUpperCase()) : null;
                // Merge: use profile data if available, otherwise create minimal card from ticker
                const cardData = profileItem || { ticker: finItem.ticker, companyName: finItem.ticker };
                return createCardHTML(cardData, summary);
            }).join('');

            // Add click events to cards
            document.querySelectorAll('.card').forEach(card => {
                card.addEventListener('click', () => {
                    const ticker = card.getAttribute('data-ticker');
                    openChartModal(ticker, financials);
                });
            });

            // Initialize hover scroll for long text
            initializeHoverScroll();
        }

        // 2. Render Financial Table
        if (financials && financials.length > 0) {
            financialSection.classList.remove('hidden');
            renderTable(financials, summary, valuation);
        }
    }

    // Function to check if text is too long and enable scrolling
    function initializeHoverScroll() {
        // Check card titles
        document.querySelectorAll('.card h3').forEach(h3 => {
            const container = h3;
            const text = h3.querySelector('.scrollable-text');
            if (text && text.scrollWidth > container.clientWidth) {
                h3.classList.add('is-long');
                h3.style.setProperty('--scroll-dist', `-${text.scrollWidth - container.clientWidth}px`);
            }
        });

        // Check meta-row (Sector, etc)
        document.querySelectorAll('.meta-row span:last-child').forEach(span => {
            const container = span;
            const text = span.querySelector('.scrollable-text');
            if (text && text.scrollWidth > container.clientWidth) {
                text.classList.add('is-long');
                span.style.setProperty('--scroll-dist-meta', `-${text.scrollWidth - container.clientWidth}px`);
            }
        });

        // Check table cells
        document.querySelectorAll('td').forEach(td => {
            const text = td.querySelector('.scrollable-text');
            if (text && text.scrollWidth > td.clientWidth) {
                text.classList.add('is-long');
                td.style.setProperty('--scroll-dist-table', `-${text.scrollWidth - td.clientWidth}px`);
            }
        });
    }

    // --- Chart & Modal Logic ---
    let charts = []; // Array to hold all 4 chart instances
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

        modalTicker.textContent = `${ticker} - 5 Year Financial Analysis`;
        modal.classList.remove("hidden");
        modal.style.display = "";

        const historicalData = extractHistoricalData(ticker, financialsList);
        if (historicalData) {
            console.log("Historical Data found:", historicalData);
            renderAllCharts(historicalData);
        } else {
            console.warn("No historical data found for", ticker);
        }
    }

    function extractHistoricalData(ticker, financialsList) {
        const targetTicker = ticker.toUpperCase();
        console.log(`Extracting data for ${targetTicker}`);
        const tickerData = financialsList.find(t => t.ticker.toUpperCase() === targetTicker);

        if (!tickerData || !tickerData.financials || tickerData.financials.length === 0) {
            console.warn("Ticker data not found in financials list");
            return null;
        }

        // Helper to find a row by name across all sections
        const findRow = (name) => {
            for (const section of tickerData.financials) {
                const row = section.rows.find(r => r.name === name);
                if (row) return row;
            }
            return null;
        };

        // Find all needed rows
        const rowsNeeded = {
            total_revenue: findRow('total_revenue'),
            cost_revenue: findRow('cost_revenue'),
            gross_profit: findRow('gross_profit'),
            other_operating_exp_total: findRow('other_operating_exp_total'),
            operating_income: findRow('operating_income'),
            ebt_incl_unusual_items: findRow('ebt_incl_unusual_items'),
            net_income: findRow('net_income')
        };

        // Use total_revenue to get labels (years)
        const baseRow = rowsNeeded.total_revenue;
        if (!baseRow) return null;

        const dataPoints = [];
        baseRow.cells.forEach((cell, index) => {
            if (cell.name === 'TTM' || cell.value === false) return; // Skip TTM and locked cells

            const point = { label: cell.name };
            for (const [key, row] of Object.entries(rowsNeeded)) {
                if (row && row.cells[index] && row.cells[index].raw_value !== undefined) {
                    point[key] = parseFloat(row.cells[index].raw_value);
                } else {
                    point[key] = 0; // Default to 0 if no data
                }
            }
            dataPoints.push(point);
        });

        // Take last 5 years
        const last5 = dataPoints.slice(-5);

        return {
            labels: last5.map(d => d.label),
            total_revenue: last5.map(d => d.total_revenue),
            cost_revenue: last5.map(d => d.cost_revenue),
            gross_profit: last5.map(d => d.gross_profit),
            other_operating_exp_total: last5.map(d => d.other_operating_exp_total),
            operating_income: last5.map(d => d.operating_income),
            ebt_incl_unusual_items: last5.map(d => d.ebt_incl_unusual_items),
            net_income: last5.map(d => d.net_income)
        };
    }

    function renderAllCharts(data) {
        // Destroy existing charts
        charts.forEach(c => { if (c) c.destroy(); });
        charts = [];

        if (!data) return;

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e5e7eb', font: { size: 10 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9ca3af',
                        callback: function (value) {
                            if (value >= 1000000000) return '$' + (value / 1000000000).toFixed(0) + 'B';
                            if (value >= 1000000) return '$' + (value / 1000000).toFixed(0) + 'M';
                            return '$' + value;
                        }
                    },
                    grid: { color: '#374151' }
                },
                x: {
                    ticks: { color: '#9ca3af', font: { size: 9 } },
                    grid: { color: '#374151' }
                }
            }
        };

        // Chart 1: Revenue, Cost, Gross Profit
        const ctx1 = document.getElementById('chart1').getContext('2d');
        charts.push(new Chart(ctx1, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Total Revenue', data: data.total_revenue, borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)', borderWidth: 2, tension: 0.3, fill: false },
                    { label: 'Cost of Revenue', data: data.cost_revenue, borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)', borderWidth: 2, tension: 0.3, fill: false },
                    { label: 'Gross Profit', data: data.gross_profit, borderColor: '#60a5fa', backgroundColor: 'rgba(96, 165, 250, 0.1)', borderWidth: 2, tension: 0.3, fill: false }
                ]
            },
            options: chartOptions
        }));

        // Chart 2: Operating Expenses & Operating Income
        const ctx2 = document.getElementById('chart2').getContext('2d');
        charts.push(new Chart(ctx2, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Operating Expenses', data: data.other_operating_exp_total, borderColor: '#fb923c', backgroundColor: 'rgba(251, 146, 60, 0.1)', borderWidth: 2, tension: 0.3, fill: false },
                    { label: 'Operating Income', data: data.operating_income, borderColor: '#a78bfa', backgroundColor: 'rgba(167, 139, 250, 0.1)', borderWidth: 2, tension: 0.3, fill: false }
                ]
            },
            options: chartOptions
        }));

        // Chart 3: Earnings Before Tax (EBT)
        const ctx3 = document.getElementById('chart3').getContext('2d');
        charts.push(new Chart(ctx3, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Earnings Before Tax', data: data.ebt_incl_unusual_items, borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 2, tension: 0.3, fill: true }
                ]
            },
            options: chartOptions
        }));

        // Chart 4: Net Income
        const ctx4 = document.getElementById('chart4').getContext('2d');
        charts.push(new Chart(ctx4, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Net Income', data: data.net_income, borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.2)', borderWidth: 2, tension: 0.3, fill: true }
                ]
            },
            options: chartOptions
        }));
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
                        <h3><span class="scrollable-text">${company}</span></h3>
                        <span class="ticker">${item.ticker}</span>
                    </div>
                    <div class="price-container">
                        <span class="price">$${price}</span>
                    </div>
                </div>
                <div class="meta-info">
                    <div class="meta-row">
                        <span>Sector</span>
                        <span><span class="scrollable-text">${sector}</span></span>
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

        // Get the table element and set dynamic column class
        const table = document.getElementById('financialTable');
        const tickerCount = financialsList.length;

        // Remove any existing column classes
        table.classList.remove('cols-1', 'cols-2', 'cols-3', 'cols-4', 'scrollable');

        // Add appropriate class based on ticker count
        if (tickerCount <= 4) {
            table.classList.add(`cols-${tickerCount}`);
        } else {
            table.classList.add('scrollable');
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
                // Wrap Industry in scrollable-text for hover effect
                if (metric.id === 'primaryname') {
                    rowHtml += `<td><span class="scrollable-text">${val}</span></td>`;
                } else {
                    rowHtml += `<td>${val}</td>`;
                }
            });
            rowHtml += `</tr>`;
            return rowHtml;
        }).join('');

        tableBody.innerHTML = rowsHTML;
    }
});
