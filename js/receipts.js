// receipts.js - Complete receipt gallery functionality

let currentUser = null;
let allReceipts = [];
let filteredReceipts = [];
let currentLightboxIndex = 0;

// Initialize receipts page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// Check authentication
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadReceipts();
            updateUserInfo(user);
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Load receipts
async function loadReceipts() {
    if (!currentUser) return;
    
    const grid = document.getElementById('receiptsGrid');
    if (!grid) return;
    
    try {
        // Show loading
        grid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading receipts...</p>
            </div>
        `;
        
        // Query expenses that have receipt or item images
        const snapshot = await db.collection('expenses')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        allReceipts = [];
        
        snapshot.forEach(doc => {
            const expense = doc.data();
            expense.id = doc.id;
            
            // Add receipt if exists
            if (expense.receiptUrl) {
                allReceipts.push({
                    id: expense.id,
                    type: 'receipt',
                    url: expense.receiptUrl,
                    date: expense.date,
                    amount: expense.amount,
                    category: expense.category,
                    description: expense.description
                });
            }
            
            // Add item image if exists
            if (expense.itemImageUrl) {
                allReceipts.push({
                    id: expense.id,
                    type: 'item',
                    url: expense.itemImageUrl,
                    date: expense.date,
                    amount: expense.amount,
                    category: expense.category,
                    description: expense.description
                });
            }
        });
        
        filteredReceipts = [...allReceipts];
        displayReceipts();
        
    } catch (error) {
        console.error('Error loading receipts:', error);
        grid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load receipts. Please try again.</p>
                <button class="btn btn-primary" onclick="loadReceipts()">Retry</button>
            </div>
        `;
    }
}

// Display receipts
function displayReceipts() {
    const grid = document.getElementById('receiptsGrid');
    if (!grid) return;
    
    if (filteredReceipts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>No receipts found</h3>
                <p>Start adding expenses with receipts to see them here.</p>
                <button class="btn btn-primary" onclick="window.location.href='add-expense.html'">
                    <i class="fas fa-plus"></i> Add Expense
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredReceipts.map((receipt, index) => `
        <div class="receipt-card ${receipt.type}" onclick="openLightbox(${index})">
            <div class="receipt-image">
                <img src="${receipt.url}" alt="Receipt" loading="lazy">
                <span class="receipt-type">
                    <i class="fas ${receipt.type === 'receipt' ? 'fa-receipt' : 'fa-camera'}"></i>
                    ${receipt.type === 'receipt' ? 'Receipt' : 'Item'}
                </span>
            </div>
            <div class="receipt-details">
                <div class="receipt-header">
                    <span class="receipt-category">${receipt.category || 'Uncategorized'}</span>
                    <span class="receipt-amount">$${receipt.amount?.toFixed(2) || '0.00'}</span>
                </div>
                <p class="receipt-description">${receipt.description || 'No description'}</p>
                <div class="receipt-footer">
                    <span class="receipt-date">
                        <i class="far fa-calendar-alt"></i>
                        ${formatDate(receipt.date)}
                    </span>
                    <button class="btn-icon" onclick="deleteReceipt('${receipt.id}', '${receipt.type}', event)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter receipts
function filterReceipts() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filterType = document.getElementById('filterType')?.value || 'all';
    
    filteredReceipts = allReceipts.filter(receipt => {
        // Filter by type
        if (filterType !== 'all' && receipt.type !== filterType) {
            return false;
        }
        
        // Filter by search term
        if (searchTerm) {
            const matchesDescription = receipt.description?.toLowerCase().includes(searchTerm) || false;
            const matchesCategory = receipt.category?.toLowerCase().includes(searchTerm) || false;
            const matchesAmount = receipt.amount?.toString().includes(searchTerm) || false;
            
            return matchesDescription || matchesCategory || matchesAmount;
        }
        
        return true;
    });
    
    sortReceipts(false);
}

// Sort receipts
function sortReceipts(applyFilter = true) {
    const sortBy = document.getElementById('sortBy')?.value || 'newest';
    
    if (applyFilter) {
        filterReceipts();
    } else {
        switch(sortBy) {
            case 'newest':
                filteredReceipts.sort((a, b) => b.date.toDate() - a.date.toDate());
                break;
            case 'oldest':
                filteredReceipts.sort((a, b) => a.date.toDate() - b.date.toDate());
                break;
            case 'amount':
                filteredReceipts.sort((a, b) => (b.amount || 0) - (a.amount || 0));
                break;
        }
        
        displayReceipts();
    }
}

// Lightbox functions
function openLightbox(index) {
    currentLightboxIndex = index;
    updateLightbox();
    document.getElementById('lightbox').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function navigateLightbox(direction) {
    currentLightboxIndex += direction;
    
    if (currentLightboxIndex < 0) {
        currentLightboxIndex = filteredReceipts.length - 1;
    } else if (currentLightboxIndex >= filteredReceipts.length) {
        currentLightboxIndex = 0;
    }
    
    updateLightbox();
}

function updateLightbox() {
    const receipt = filteredReceipts[currentLightboxIndex];
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxInfo = document.getElementById('lightboxInfo');
    
    lightboxImage.src = receipt.url;
    lightboxInfo.innerHTML = `
        <div class="lightbox-header">
            <span class="receipt-type ${receipt.type}">
                <i class="fas ${receipt.type === 'receipt' ? 'fa-receipt' : 'fa-camera'}"></i>
                ${receipt.type === 'receipt' ? 'Receipt' : 'Item Image'}
            </span>
            <span class="receipt-amount">$${receipt.amount?.toFixed(2) || '0.00'}</span>
        </div>
        <p><strong>Category:</strong> ${receipt.category || 'Uncategorized'}</p>
        <p><strong>Description:</strong> ${receipt.description || 'No description'}</p>
        <p><strong>Date:</strong> ${formatDate(receipt.date)}</p>
        <button class="btn btn-primary" onclick="viewExpense('${receipt.id}')">
            View Full Expense
        </button>
    `;
}

// Delete receipt
async function deleteReceipt(expenseId, type, event) {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
        return;
    }
    
    try {
        // Get the expense
        const expenseRef = db.collection('expenses').doc(expenseId);
        const expense = await expenseRef.get();
        
        if (!expense.exists) return;
        
        const expenseData = expense.data();
        
        // Delete from storage
        if (type === 'receipt' && expenseData.receiptUrl) {
            const receiptRef = storage.refFromURL(expenseData.receiptUrl);
            await receiptRef.delete();
            
            // Update expense document
            await expenseRef.update({
                receiptUrl: firebase.firestore.FieldValue.delete()
            });
        } else if (type === 'item' && expenseData.itemImageUrl) {
            const itemRef = storage.refFromURL(expenseData.itemImageUrl);
            await itemRef.delete();
            
            // Update expense document
            await expenseRef.update({
                itemImageUrl: firebase.firestore.FieldValue.delete()
            });
        }
        
        // Reload receipts
        loadReceipts();
        
        // Show success message
        showNotification(`${type} deleted successfully`, 'success');
        
    } catch (error) {
        console.error('Error deleting receipt:', error);
        showNotification('Failed to delete receipt', 'error');
    }
}

// View expense details
function viewExpense(expenseId) {
    window.location.href = `view-expense.html?id=${expenseId}`;
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

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
