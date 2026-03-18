// reports.js - Complete reporting and analytics functionality

let currentUser = null;
let chartInstances = {};

// Initialize reports page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupDateRange();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadReports();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Setup date range
function setupDateRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    if (startDate) {
        startDate.value = firstDay.toISOString().split('T')[0];
    }
    if (endDate) {
        endDate.value = lastDay.toISOString().split('T')[0];
    }
}

// Setup event listeners
function setupEventListeners() {
    const applyBtn = document.getElementById('applyDateRange');
    if (applyBtn) {
        applyBtn.addEventListener('click', loadReports);
    }
    
    const exportBtn = document.getElementById('exportReport');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReport);
    }
}

// Load reports data
async function loadReports() {
    if (!currentUser) return;
    
    try {
        showLoading(true);
        
        // Get date range
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        endDate.setHours(23, 59, 59, 999);
        
        // Load data
        const [expenses, income] = await Promise.all([
            loadExpensesInRange(startDate, endDate),
            loadIncomeInRange(startDate, endDate)
        ]);
        
        // Update summary
        updateSummary(expenses, income);
        
        // Update charts
        updateCharts(expenses, income);
        
        // Update tables
        updateTables(expenses, income);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Failed to load reports');
        showLoading(false);
    }
}

// Load expenses in date range
async function loadExpensesInRange(startDate, endDate) {
    const snapshot = await db.collection('expenses')
        .where('userId', '==', currentUser.uid)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc')
        .get();
    
    const expenses = [];
    snapshot.forEach(doc => {
        expenses.push({ id: doc.id, ...doc.data() });
    });
    
    return expenses;
}

// Load income in date range
async function loadIncomeInRange(startDate, endDate) {
    const snapshot = await db.collection('income')
        .where('userId', '==', currentUser.uid)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc')
        .get();
    
    const income = [];
    snapshot.forEach(doc => {
        income.push({ id: doc.id, ...doc.data() });
    });
    
    return income;
}

// Update summary cards
function updateSummary(expenses, income) {
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netBalance = totalIncome - totalExpenses;
    
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('netBalance').textContent = formatCurrency(netBalance);
    
    // Update change indicators
    const lastMonth = getLastMonthTotals();
    updateChangeIndicator('incomeChange', totalIncome, lastMonth.income);
    updateChangeIndicator('expenseChange', totalExpenses, lastMonth.expenses);
    updateChangeIndicator('balanceChange', netBalance, lastMonth.netBalance);
}

// Get last month totals
async function getLastMonthTotals() {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    lastMonthEnd.setHours(23, 59, 59, 999);
    
    const [expenses, income] = await Promise.all([
        loadExpensesInRange(lastMonthStart, lastMonthEnd),
        loadIncomeInRange(lastMonthStart, lastMonthEnd)
    ]);
    
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    
    return {
        income: totalIncome,
        expenses: totalExpenses,
        netBalance: totalIncome - totalExpenses
    };
}

// Update change indicator
function updateChangeIndicator(elementId, current, previous) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const change = previous ? ((current - previous) / previous * 100) : 0;
    const isPositive = change > 0;
    
    element.innerHTML = `
        <i class="fas fa-${isPositive ? 'arrow-up' : 'arrow-down'}"></i>
        ${Math.abs(change).toFixed(1)}%
    `;
    element.className = `change-indicator ${isPositive ? 'positive' : 'negative'}`;
}

// Update charts
function updateCharts(expenses, income) {
    updateIncomeExpenseChart(expenses, income);
    updateCategoryChart(expenses);
    updateTrendChart(expenses, income);
}

// Update income vs expense chart
function updateIncomeExpenseChart(expenses, income) {
    const ctx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    if (!ctx) return;
    
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    
    // Destroy existing chart
    if (chartInstances.incomeExpense) {
        chartInstances.incomeExpense.destroy();
    }
    
    chartInstances.incomeExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                label: 'Amount',
                data: [totalIncome, totalExpenses],
                backgroundColor: ['#00C853', '#FF3D00'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `$${context.raw.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `$${value}`
                    }
                }
            }
        }
    });
}

// Update category chart
function updateCategoryChart(expenses) {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    
    // Group expenses by category
    const categories = {};
    expenses.forEach(expense => {
        const cat = expense.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + expense.amount;
    });
    
    // Destroy existing chart
    if (chartInstances.category) {
        chartInstances.category.destroy();
    }
    
    chartInstances.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                    '#FFE194', '#E6B89C', '#A2D9CE', '#81C784',
                    '#FFB347', '#A05195', '#2A9D8F', '#E76F51'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: $${context.raw.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update trend chart
function updateTrendChart(expenses, income) {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;
    
    // Group by day
    const dailyData = {};
    
    expenses.forEach(expense => {
        const date = expense.date.toDate().toLocaleDateString();
        if (!dailyData[date]) {
            dailyData[date] = { income: 0, expenses: 0 };
        }
        dailyData[date].expenses += expense.amount;
    });
    
    income.forEach(inc => {
        const date = inc.date.toDate().toLocaleDateString();
        if (!dailyData[date]) {
            dailyData[date] = { income: 0, expenses: 0 };
        }
        dailyData[date].income += inc.amount;
    });
    
    const sortedDates = Object.keys(dailyData).sort((a, b) => 
        new Date(a) - new Date(b)
    );
    
    // Destroy existing chart
    if (chartInstances.trend) {
        chartInstances.trend.destroy();
    }
    
    chartInstances.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Income',
                    data: sortedDates.map(date => dailyData[date].income),
                    borderColor: '#00C853',
                    backgroundColor: 'rgba(0, 200, 83, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: sortedDates.map(date => dailyData[date].expenses),
                    borderColor: '#FF3D00',
                    backgroundColor: 'rgba(255, 61, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: $${context.raw.toFixed(2)}`
                    }
                }
            }
        }
    });
}

// Update tables
function updateTables(expenses, income) {
    updateExpensesTable(expenses);
    updateIncomeTable(income);
    updateTopCategories(expenses);
}

// Update expenses table
function updateExpensesTable(expenses) {
    const tbody = document.querySelector('#expensesTable tbody');
    if (!tbody) return;
    
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No expenses in this period</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = expenses.slice(0, 10).map(expense => `
        <tr onclick="viewExpense('${expense.id}')">
            <td>${formatDate(expense.date)}</td>
            <td>${expense.category}</td>
            <td>${expense.description || '-'}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>
                ${expense.receiptUrl ? '<i class="fas fa-image" title="Has receipt"></i>' : ''}
                ${expense.itemImageUrl ? '<i class="fas fa-camera" title="Has image"></i>' : ''}
            </td>
        </tr>
    `).join('');
}

// Update income table
function updateIncomeTable(income) {
    const tbody = document.querySelector('#incomeTable tbody');
    if (!tbody) return;
    
    if (income.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No income in this period</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = income.slice(0, 10).map(inc => `
        <tr onclick="viewIncome('${inc.id}')">
            <td>${formatDate(inc.date)}</td>
            <td>${inc.source || inc.category || 'Income'}</td>
            <td>${inc.description || '-'}</td>
            <td>$${inc.amount.toFixed(2)}</td>
        </tr>
    `).join('');
}

// Update top categories
function updateTopCategories(expenses) {
    const container = document.getElementById('topCategories');
    if (!container) return;
    
    // Calculate category totals
    const categoryTotals = {};
    expenses.forEach(expense => {
        const cat = expense.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;
    });
    
    // Sort and get top 5
    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    if (topCategories.length === 0) {
        container.innerHTML = '<p class="text-muted">No expense data</p>';
        return;
    }
    
    container.innerHTML = topCategories.map(([category, amount]) => {
        const percentage = (amount / totalExpenses * 100).toFixed(1);
        return `
            <div class="category-item">
                <div class="category-header">
                    <span class="category-name">${category}</span>
                    <span class="category-amount">$${amount.toFixed(2)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${percentage}%"></div>
                </div>
                <span class="category-percentage">${percentage}%</span>
            </div>
        `;
    }).join('');
}

// Export report
function exportReport() {
    const format = document.getElementById('exportFormat').value;
    
    switch(format) {
        case 'csv':
            exportToCSV();
            break;
        case 'pdf':
            exportToPDF();
            break;
        case 'excel':
            exportToExcel();
            break;
    }
}

// Export to CSV
function exportToCSV() {
    // Implementation for CSV export
    alert('CSV export feature coming soon!');
}

// Export to PDF
function exportToPDF() {
    // Implementation for PDF export
    alert('PDF export feature coming soon!');
}

// Export to Excel
function exportToExcel() {
    // Implementation for Excel export
    alert('Excel export feature coming soon!');
}

// Helper: Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

// Helper: Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Show/hide loading
function showLoading(show) {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
        loadingEl.style.display = show ? 'flex' : 'none';
    }
}

// Show error
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}
