// expenses.js - Complete expense management functionality

// Global variables
let currentUser = null;
let selectedReceiptFile = null;
let selectedItemFile = null;

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
            loadCategories();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Drag and drop for receipt upload
    const receiptContainer = document.getElementById('receiptUploadContainer');
    if (receiptContainer) {
        receiptContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            receiptContainer.classList.add('dragover');
        });

        receiptContainer.addEventListener('dragleave', () => {
            receiptContainer.classList.remove('dragover');
        });

        receiptContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            receiptContainer.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleReceiptFile(files[0]);
            }
        });
    }

    // Drag and drop for item upload
    const itemContainer = document.getElementById('itemUploadContainer');
    if (itemContainer) {
        itemContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            itemContainer.classList.add('dragover');
        });

        itemContainer.addEventListener('dragleave', () => {
            itemContainer.classList.remove('dragover');
        });

        itemContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            itemContainer.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleItemFile(files[0]);
            }
        });
    }
}

// Load user categories
async function loadCategories() {
    if (!currentUser) return;
    
    try {
        const categoriesRef = db.collection('categories')
            .where('userId', '==', currentUser.uid)
            .where('type', '==', 'expense');
        
        const snapshot = await categoriesRef.get();
        
        if (!snapshot.empty) {
            const categorySelect = document.getElementById('category');
            if (categorySelect) {
                // Clear existing options except first
                while (categorySelect.options.length > 1) {
                    categorySelect.remove(1);
                }
                
                snapshot.forEach(doc => {
                    const category = doc.data();
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Handle expense form submission
async function handleExpenseSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Show loading state
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    submitBtn.disabled = true;
    
    try {
        // Get form values
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = new Date(document.getElementById('date').value);
        const description = document.getElementById('description').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const location = document.getElementById('location').value;
        const notes = document.getElementById('notes').value;
        
        // Validate
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
        }
        
        if (!category) {
            throw new Error('Please select a category');
        }
        
        // Prepare expense data
        const expenseData = {
            userId: currentUser.uid,
            amount: amount,
            category: category,
            date: date,
            description: description || '',
            paymentMethod: paymentMethod || 'Cash',
            tags: tags,
            location: location || '',
            notes: notes || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Upload images if selected
        if (selectedReceiptFile) {
            updateLoadingStatus('Uploading receipt...');
            expenseData.receiptUrl = await uploadImage(selectedReceiptFile, 'receipts');
        }
        
        if (selectedItemFile) {
            updateLoadingStatus('Uploading item image...');
            expenseData.itemImageUrl = await uploadImage(selectedItemFile, 'items');
        }
        
        // Save to Firestore
        updateLoadingStatus('Saving expense...');
        const docRef = await db.collection('expenses').add(expenseData);
        
        console.log('Expense saved with ID:', docRef.id);
        
        // Show success modal
        showSuccessModal();
        
    } catch (error) {
        console.error('Error saving expense:', error);
        showError(error.message || 'Failed to save expense');
    } finally {
        // Hide loading state
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

// Upload image to Firebase Storage
async function uploadImage(file, folder) {
    if (!file || !currentUser) return null;
    
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = storage.ref();
    const imageRef = storageRef.child(`users/${currentUser.uid}/${folder}/${fileName}`);
    
    // Upload file
    const snapshot = await imageRef.put(file);
    
    // Get download URL
    const downloadUrl = await snapshot.ref.getDownloadURL();
    
    return downloadUrl;
}

// Handle receipt file selection
function previewReceipt(input) {
    const file = input.files[0];
    if (file) {
        handleReceiptFile(file);
    }
}

function handleReceiptFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
    }
    
    selectedReceiptFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('receiptPreview');
        const placeholder = document.getElementById('receiptPlaceholder');
        const img = preview.querySelector('img');
        
        img.src = e.target.result;
        placeholder.classList.add('hidden');
        preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeReceipt() {
    selectedReceiptFile = null;
    document.getElementById('receiptImage').value = '';
    document.getElementById('receiptPreview').classList.add('hidden');
    document.getElementById('receiptPlaceholder').classList.remove('hidden');
}

// Handle item file selection
function previewItem(input) {
    const file = input.files[0];
    if (file) {
        handleItemFile(file);
    }
}

function handleItemFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
    }
    
    selectedItemFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('itemPreview');
        const placeholder = document.getElementById('itemPlaceholder');
        const img = preview.querySelector('img');
        
        img.src = e.target.result;
        placeholder.classList.add('hidden');
        preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeItem() {
    selectedItemFile = null;
    document.getElementById('itemImage').value = '';
    document.getElementById('itemPreview').classList.add('hidden');
    document.getElementById('itemPlaceholder').classList.remove('hidden');
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Show error message
function showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update loading status
function updateLoadingStatus(status) {
    const statusEl = document.getElementById('loadingStatus');
    if (statusEl) {
        statusEl.textContent = status;
    }
}

// Load expenses list (for expenses.html)
async function loadExpensesList() {
    if (!currentUser) return;
    
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) return;
    
    try {
        // Show loading
        expensesList.innerHTML = '<div class="loading">Loading expenses...</div>';
        
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Query expenses
        const snapshot = await db.collection('expenses')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        if (snapshot.empty) {
            expensesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>No expenses yet</h3>
                    <p>Start tracking your expenses by adding your first expense.</p>
                    <button class="btn btn-primary" onclick="window.location.href='add-expense.html'">
                        <i class="fas fa-plus"></i> Add Expense
                    </button>
                </div>
            `;
            return;
        }
        
        // Group expenses by date
        let html = '';
        let currentDate = '';
        
        snapshot.forEach(doc => {
            const expense = doc.data();
            expense.id = doc.id;
            
            const expenseDate = expense.date.toDate();
            const dateStr = expenseDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            if (dateStr !== currentDate) {
                if (currentDate) {
                    html += '</div>';
                }
                currentDate = dateStr;
                html += `<h3 class="date-header">${dateStr}</h3><div class="expenses-group">`;
            }
            
            html += `
                <div class="expense-item" onclick="viewExpense('${expense.id}')">
                    <div class="expense-icon">
                        ${expense.receiptUrl ? '<i class="fas fa-image"></i>' : '<i class="fas fa-receipt"></i>'}
                    </div>
                    <div class="expense-details">
                        <span class="expense-category">${expense.category}</span>
                        <span class="expense-description">${expense.description || 'No description'}</span>
                        ${expense.tags && expense.tags.length ? 
                            `<span class="expense-tags">${expense.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</span>` 
                            : ''}
                    </div>
                    <div class="expense-amount">
                        $${expense.amount.toFixed(2)}
                        ${expense.receiptUrl ? '<i class="fas fa-paperclip"></i>' : ''}
                    </div>
                </div>
            `;
        });
        
        if (currentDate) {
            html += '</div>';
        }
        
        expensesList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading expenses:', error);
        expensesList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load expenses. Please try again.</p>
                <button class="btn btn-primary" onclick="loadExpensesList()">Retry</button>
            </div>
        `;
    }
}

// View expense details
function viewExpense(expenseId) {
    window.location.href = `view-expense.html?id=${expenseId}`;
}
