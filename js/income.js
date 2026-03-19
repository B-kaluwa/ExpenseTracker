// income.js - Complete income management

let currentUser = null;
let allIncome = [];
let filteredIncome = [];
let currentPage = 1;
let itemsPerPage = 20;
let currentIncomeId = null;

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
            loadIncome();
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
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', debounce(filterIncome, 300));
    }
}

// Load income from Firestore
async function loadIncome() {
    if (!currentUser) return;
    
    const incomeList = document.getElementById('incomeList');
    if (!incomeList) return;
    
    try {
        // Show loading
        incomeList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading income...</p>
            </div>
        `;
        
        // Get all income for the user
        const snapshot = await db.collection('income')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        allIncome = [];
        snapshot.forEach(doc => {
            allIncome.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredIncome = [...allIncome];
        
        // Update summary
        updateSummary();
        
        // Display income
        displayIncome();
        
    } catch (error) {
        console.error('Error loading income:', error);
        showNotification('Failed to load income', 'error');
        incomeList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Income</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadIncome()">Retry</button>
            </div>
        `;
    }
}

// Update summary statistics
function updateSummary() {
    // Calculate monthly total
    const now = new Date();
    const monthlyIncome = allIncome.filter(income => {
        const incomeDate = income.date.toDate();
        return incomeDate.getMonth() === now.getMonth() &&
               incomeDate.getFullYear() === now.getFullYear();
    });
    
    const monthlyTotal = monthlyIncome.reduce((sum, inc) => sum + inc.amount, 0);
    
    // Calculate average income
    const average = allIncome.length > 0 
        ? allIncome.reduce((sum, inc) => sum + inc.amount, 0) / allIncome.length 
        : 0;
    
    // Get unique sources
    const sources = new Set(allIncome.map(inc => inc.source));
    
    // Update UI
    document.getElementById('monthlyTotal').textContent = formatCurrency(monthlyTotal);
    document.getElementById('averageIncome').textContent = formatCurrency(average);
    document.getElementById('sourceCount').textContent = sources.size;
    document.getElementById('totalCount').textContent = allIncome.length;
}

// Display income with pagination
function displayIncome() {
    const incomeList = document.getElementById('incomeList');
    const paginationDiv = document.getElementById('pagination');
    
    if (!incomeList) return;
    
    if (filteredIncome.length === 0) {
        incomeList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-arrow-up"></i>
                <h3>No income found</h3>
                <p>Start tracking your income by adding your first income source.</p>
                <button class="btn btn-primary" onclick="window.location.href='add-income.html'">
                    <i class="fas fa-plus"></i> Add Income
                </button>
            </div>
        `;
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }
    
    // Calculate pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedIncome = filteredIncome.slice(start, end);
    const totalPages = Math.ceil(filteredIncome.length / itemsPerPage);
    
    // Generate HTML
    incomeList.innerHTML = paginatedIncome.map(income => `
        <div class="expense-item" onclick="viewIncome('${income.id}')">
            <div class="expense-category">
                <span class="category-badge">${income.source || 'Uncategorized'}</span>
                <span class="expense-description">${income.description || 'No description'}</span>
            </div>
            <div class="expense-date">${formatDate(income.date)}</div>
            <div class="expense-amount">
                $${income.amount.toFixed(2)}
            </div>
            <div class="expense-actions" onclick="event.stopPropagation()">
                <button class="action-btn" onclick="editIncome('${income.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteIncome('${income.id}')">
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

// Filter income
function filterIncome() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const source = document.getElementById('sourceFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || 'all';
    const sortBy = document.getElementById('sortFilter')?.value || 'newest';
    
    filteredIncome = allIncome.filter(income => {
        // Search filter
        const matchesSearch = searchTerm === '' || 
            (income.description && income.description.toLowerCase().includes(searchTerm)) ||
            (income.source && income.source.toLowerCase().includes(searchTerm));
        
        // Source filter
        const matchesSource = source === '' || income.source === source;
        
        // Date filter
        let matchesDate = true;
        const incomeDate = income.date.toDate();
        const now = new Date();
        
        if (dateFilter === 'today') {
            matchesDate = incomeDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            matchesDate = incomeDate >= weekAgo;
        } else if (dateFilter === 'month') {
            matchesDate = incomeDate.getMonth() === now.getMonth() &&
                         incomeDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'year') {
            matchesDate = incomeDate.getFullYear() === now.getFullYear();
        }
        
        return matchesSearch && matchesSource && matchesDate;
    });
    
    // Sort
    filteredIncome.sort((a, b) => {
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
    displayIncome();
}

// Change page
function changePage(page) {
    currentPage = page;
    displayIncome();
}

// View income details
async function viewIncome(incomeId) {
    const income = allIncome.find(i => i.id === incomeId);
    if (!income) return;
    
    currentIncomeId = incomeId;
    
    const modalBody = document.getElementById('incomeDetailBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">$${income.amount.toFixed(2)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Source:</span>
            <span class="detail-value">${income.source || 'Not specified'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${formatDate(income.date, 'full')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Description:</span>
            <span class="detail-value">${income.description || 'No description'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">${income.paymentMethod || 'Not specified'}</span>
        </div>
        ${income.category ? `
        <div class="detail-row">
            <span class="detail-label">Category:</span>
            <span class="detail-value">${income.category}</span>
        </div>
        ` : ''}
        ${income.notes ? `
        <div class="detail-row">
            <span class="detail-label">Notes:</span>
            <span class="detail-value">${income.notes}</span>
        </div>
        ` : ''}
    `;
    
    document.getElementById('incomeModal').classList.add('active');
}

// Edit income
function editIncome(incomeId) {
    window.location.href = `edit-income.html?id=${incomeId}`;
}

// Delete income
async function deleteIncome(incomeId) {
    if (!confirm('Are you sure you want to delete this income record?')) {
        return;
    }
    
    try {
        await db.collection('income').doc(incomeId).delete();
        
        // Reload income
        await loadIncome();
        
        showNotification('Income deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting income:', error);
        showNotification('Failed to delete income', 'error');
    }
}

// Delete current income (from modal)
async function deleteCurrentIncome() {
    if (currentIncomeId) {
        closeModal();
        await deleteIncome(currentIncomeId);
    }
}

// Close modal
function closeModal() {
    document.getElementById('incomeModal').classList.remove('active');
    currentIncomeId = null;
}

// Handle income form submission (for add-income.html)
async function handleIncomeSubmit(event) {
    event.preventDefault();
    
    // Check authentication
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification('You must be logged in', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    try {
        // Get form values
        const amount = parseFloat(document.getElementById('amount').value);
        const source = document.getElementById('source').value;
        const date = new Date(document.getElementById('date').value);
        const description = document.getElementById('description').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const category = document.getElementById('category').value;
        const notes = document.getElementById('notes').value;
        
        // Validate
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
        }
        
        if (!source) {
            throw new Error('Please select a source');
        }
        
        // Prepare income data
        const incomeData = {
            userId: user.uid,
            amount: amount,
            source: source,
            date: date,
            description: description || '',
            paymentMethod: paymentMethod || 'Bank Transfer',
            category: category || '',
            notes: notes || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Saving income:', incomeData);
        
        // Save to Firestore
        const docRef = await db.collection('income').add(incomeData);
        console.log('Income saved with ID:', docRef.id);
        
        // Show success modal
        document.getElementById('successModal').classList.add('active');
        
    } catch (error) {
        console.error('Error saving income:', error);
        
        if (error.code === 'permission-denied') {
            showNotification('Permission denied. Please check Firebase rules.', 'error');
        } else {
            showNotification(error.message || 'Failed to save income', 'error');
        }
    } finally {
        // Hide loading state
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Export income
function exportIncome() {
    if (filteredIncome.length === 0) {
        showNotification('No income to export', 'error');
        return;
    }
    
    // Prepare CSV data
    const headers = ['Date', 'Source', 'Description', 'Amount', 'Payment Method', 'Category', 'Notes'];
    const csvData = filteredIncome.map(income => [
        formatDate(income.date, 'full'),
        income.source || 'Uncategorized',
        income.description || '',
        income.amount,
        income.paymentMethod || '',
        income.category || '',
        income.notes || ''
    ]);
    
    csvData.unshift(headers);
    
    // Convert to CSV
    const csv = csvData.map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showNotification('Income exported successfully', 'success');
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
window.filterIncome = filterIncome;
window.changePage = changePage;
window.viewIncome = viewIncome;
window.editIncome = editIncome;
window.deleteIncome = deleteIncome;
window.deleteCurrentIncome = deleteCurrentIncome;
window.closeModal = closeModal;
window.handleIncomeSubmit = handleIncomeSubmit;
window.exportIncome = exportIncome;
window.logout = logout;
