// expenses.js - Complete expenses management

let currentUser = null;
let allExpenses = [];
let filteredExpenses = [];
let currentPage = 1;
let itemsPerPage = 20;
let currentExpenseId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadExpenses();
            updateUserInfo(user);
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Update user info in navbar
function updateUserInfo(user) {
    const navUser = document.getElementById('navUser');
    if (navUser && user) {
        navUser.innerHTML = `
            <div class="user-dropdown">
                <span>${user.displayName || user.email}</span>
                <button onclick="logout()" class="btn-logout">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
    }
}

// Logout
async function logout() {
    try {
        await firebase.auth().signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Real-time search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', debounce(filterExpenses, 300));
    }
}

// Load expenses from Firestore
async function loadExpenses() {
    if (!currentUser) return;
    
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) return;
    
    try {
        // Show loading
        expensesList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading expenses...</p>
            </div>
        `;
        
        // Get all expenses for the user
        const snapshot = await db.collection('expenses')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        allExpenses = [];
        snapshot.forEach(doc => {
            allExpenses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredExpenses = [...allExpenses];
        
        // Update summary
        updateSummary();
        
        // Display expenses
        displayExpenses();
        
    } catch (error) {
        console.error('Error loading expenses:', error);
        showNotification('Failed to load expenses', 'error');
        expensesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Expenses</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadExpenses()">Retry</button>
            </div>
        `;
    }
}

// Update summary statistics
function updateSummary() {
    // Calculate monthly total
    const now = new Date();
    const monthlyExpenses = allExpenses.filter(expense => {
        const expenseDate = expense.date.toDate();
        return expenseDate.getMonth() === now.getMonth() &&
               expenseDate.getFullYear() === now.getFullYear();
    });
    
    const monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Calculate average expense
    const average = allExpenses.length > 0 
        ? allExpenses.reduce((sum, exp) => sum + exp.amount, 0) / allExpenses.length 
        : 0;
    
    // Get unique categories
    const categories = new Set(allExpenses.map(exp => exp.category));
    
    // Update UI
    document.getElementById('monthlyTotal').textContent = formatCurrency(monthlyTotal);
    document.getElementById('averageExpense').textContent = formatCurrency(average);
    document.getElementById('categoryCount').textContent = categories.size;
    document.getElementById('totalCount').textContent = allExpenses.length;
}

// Display expenses with pagination
function displayExpenses() {
    const expensesList = document.getElementById('expensesList');
    const paginationDiv = document.getElementById('pagination');
    
    if (!expensesList) return;
    
    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>No expenses found</h3>
                <p>Start tracking your expenses by adding your first expense.</p>
                <button class="btn btn-primary" onclick="window.location.href='add-expense.html'">
                    <i class="fas fa-plus"></i> Add Expense
                </button>
            </div>
        `;
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }
    
    // Calculate pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedExpenses = filteredExpenses.slice(start, end);
    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    
    // Generate HTML
    expensesList.innerHTML = paginatedExpenses.map(expense => `
        <div class="expense-item" onclick="viewExpense('${expense.id}')">
            <div class="expense-category">
                <span class="category-badge">${expense.category || 'Uncategorized'}</span>
                <span class="expense-description">${expense.description || 'No description'}</span>
            </div>
            <div class="expense-date">${formatDate(expense.date)}</div>
            <div class="expense-amount">
                $${expense.amount.toFixed(2)}
                ${expense.receiptUrl ? '<i class="fas fa-image receipt-indicator" title="Has receipt"></i>' : ''}
                ${expense.itemImageUrl ? '<i class="fas fa-camera receipt-indicator" title="Has item image"></i>' : ''}
            </div>
            <div class="expense-actions" onclick="event.stopPropagation()">
                <button class="action-btn" onclick="editExpense('${expense.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteExpense('${expense.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Generate pagination
    if (paginationDiv) {
        let paginationHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="changePage(${i})">${i}</button>
            `;
        }
        paginationDiv.innerHTML = paginationHtml;
    }
}

// Filter expenses
function filterExpenses() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || 'all';
    const sortBy = document.getElementById('sortFilter')?.value || 'newest';
    
    filteredExpenses = allExpenses.filter(expense => {
        // Search filter
        const matchesSearch = searchTerm === '' || 
            (expense.description && expense.description.toLowerCase().includes(searchTerm)) ||
            (expense.category && expense.category.toLowerCase().includes(searchTerm));
        
        // Category filter
        const matchesCategory = category === '' || expense.category === category;
        
        // Date filter
        let matchesDate = true;
        const expenseDate = expense.date.toDate();
        const now = new Date();
        
        if (dateFilter === 'today') {
            matchesDate = expenseDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            matchesDate = expenseDate >= weekAgo;
        } else if (dateFilter === 'month') {
            matchesDate = expenseDate.getMonth() === now.getMonth() &&
                         expenseDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'year') {
            matchesDate = expenseDate.getFullYear() === now.getFullYear();
        }
        
        return matchesSearch && matchesCategory && matchesDate;
    });
    
    // Sort
    filteredExpenses.sort((a, b) => {
        if (sortBy === 'newest') {
            return b.date.toDate() - a.date.toDate();
        } else if (sortBy === 'oldest') {
            return a.date.toDate() - b.date.toDate();
        } else if (sortBy === 'highest') {
            return b.amount - a.amount;
        } else if (sortBy === 'lowest') {
            return a.amount - b.amount;
        }
    });
    
    currentPage = 1;
    displayExpenses();
}

// Change page
function changePage(page) {
    currentPage = page;
    displayExpenses();
}

// View expense details
async function viewExpense(expenseId) {
    const expense = allExpenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    currentExpenseId = expenseId;
    
    const modalBody = document.getElementById('expenseDetailBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">$${expense.amount.toFixed(2)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Category:</span>
            <span class="detail-value">${expense.category || 'Uncategorized'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${formatDate(expense.date, 'full')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Description:</span>
            <span class="detail-value">${expense.description || 'No description'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">${expense.paymentMethod || 'Not specified'}</span>
        </div>
        ${expense.notes ? `
        <div class="detail-row">
            <span class="detail-label">Notes:</span>
            <span class="detail-value">${expense.notes}</span>
        </div>
        ` : ''}
        ${expense.receiptUrl ? `
        <div class="detail-row">
            <span class="detail-label">Receipt:</span>
            <div class="detail-value">
                <img src="${expense.receiptUrl}" class="receipt-image" onclick="window.open('${expense.receiptUrl}')">
            </div>
        </div>
        ` : ''}
        ${expense.itemImageUrl ? `
        <div class="detail-row">
            <span class="detail-label">Item Image:</span>
            <div class="detail-value">
                <img src="${expense.itemImageUrl}" class="receipt-image" onclick="window.open('${expense.itemImageUrl}')">
            </div>
        </div>
        ` : ''}
    `;
    
    document.getElementById('expenseModal').classList.add('active');
}

// Edit expense
function editExpense(expenseId) {
    window.location.href = `edit-expense.html?id=${expenseId}`;
}

// Delete expense
async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        // Get expense data first to check for images
        const expenseDoc = await db.collection('expenses').doc(expenseId).get();
        const expenseData = expenseDoc.data();
        
        // Delete images from storage if they exist
        if (expenseData.receiptUrl) {
            try {
                const receiptRef = storage.refFromURL(expenseData.receiptUrl);
                await receiptRef.delete();
            } catch (e) {
                console.log('Receipt not found in storage');
            }
        }
        
        if (expenseData.itemImageUrl) {
            try {
                const itemRef = storage.refFromURL(expenseData.itemImageUrl);
                await itemRef.delete();
            } catch (e) {
                console.log('Item image not found in storage');
            }
        }
        
        // Delete expense document
        await db.collection('expenses').doc(expenseId).delete();
        
        // Reload expenses
        await loadExpenses();
        
        showNotification('Expense deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('Failed to delete expense', 'error');
    }
}

// Delete current expense (from modal)
async function deleteCurrentExpense() {
    if (currentExpenseId) {
        closeModal();
        await deleteExpense(currentExpenseId);
    }
}

// Close modal
function closeModal() {
    document.getElementById('expenseModal').classList.remove('active');
    currentExpenseId = null;
}

// Export expenses
function exportExpenses() {
    if (filteredExpenses.length === 0) {
        showNotification('No expenses to export', 'error');
        return;
    }
    
    // Prepare CSV data
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Notes'];
    const csvData = filteredExpenses.map(expense => [
        formatDate(expense.date, 'full'),
        expense.category || 'Uncategorized',
        expense.description || '',
        expense.amount,
        expense.paymentMethod || '',
        expense.notes || ''
    ]);
    
    csvData.unshift(headers);
    
    // Convert to CSV
    const csv = csvData.map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showNotification('Expenses exported successfully', 'success');
}

// Helper: Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

// Helper: Format date
function formatDate(timestamp, format = 'short') {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    if (format === 'full') {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// Helper: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions globally available
window.filterExpenses = filterExpenses;
window.changePage = changePage;
window.viewExpense = viewExpense;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.deleteCurrentExpense = deleteCurrentExpense;
window.closeModal = closeModal;
window.exportExpenses = exportExpenses;
window.logout = logout;
