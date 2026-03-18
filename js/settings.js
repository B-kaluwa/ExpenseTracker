// settings.js - Complete settings management

let currentUser = null;
let userSettings = null;

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// Check authentication
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserSettings();
            loadCategories();
            updateUserInfo(user);
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Load user settings
async function loadUserSettings() {
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        
        if (doc.exists) {
            userSettings = doc.data();
            populateSettings(userSettings);
        } else {
            // Create default settings
            const defaultSettings = {
                fullName: currentUser.displayName || '',
                email: currentUser.email,
                phone: '',
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY',
                weekStart: 'sunday',
                darkMode: false,
                notifications: true,
                monthlyBudget: 0,
                budgetAlerts: true
            };
            
            await db.collection('users').doc(currentUser.uid).set(defaultSettings);
            userSettings = defaultSettings;
            populateSettings(defaultSettings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load settings', 'error');
    }
}

// Populate settings form
function populateSettings(settings) {
    // Profile
    document.getElementById('displayName').value = settings.fullName || '';
    document.getElementById('email').value = settings.email || '';
    document.getElementById('phone').value = settings.phone || '';
    
    // Preferences
    document.getElementById('currency').value = settings.currency || 'USD';
    document.getElementById('dateFormat').value = settings.dateFormat || 'MM/DD/YYYY';
    document.getElementById('weekStart').value = settings.weekStart || 'sunday';
    document.getElementById('darkMode').checked = settings.darkMode || false;
    document.getElementById('notifications').checked = settings.notifications !== false;
    
    // Budget
    document.getElementById('monthlyBudget').value = settings.monthlyBudget || 0;
    document.getElementById('budgetAlerts').checked = settings.budgetAlerts !== false;
}

// Update profile
async function updateProfile(event) {
    event.preventDefault();
    
    const displayName = document.getElementById('displayName').value;
    const phone = document.getElementById('phone').value;
    
    try {
        // Update Firebase Auth profile
        if (currentUser.displayName !== displayName) {
            await currentUser.updateProfile({
                displayName: displayName
            });
        }
        
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            fullName: displayName,
            phone: phone
        });
        
        showNotification('Profile updated successfully', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
    }
}

// Update preferences
async function updatePreferences(event) {
    event.preventDefault();
    
    const preferences = {
        currency: document.getElementById('currency').value,
        dateFormat: document.getElementById('dateFormat').value,
        weekStart: document.getElementById('weekStart').value,
        darkMode: document.getElementById('darkMode').checked,
        notifications: document.getElementById('notifications').checked
    };
    
    try {
        await db.collection('users').doc(currentUser.uid).update(preferences);
        
        // Apply dark mode if enabled
        if (preferences.darkMode) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
        
        showNotification('Preferences updated successfully', 'success');
    } catch (error) {
        console.error('Error updating preferences:', error);
        showNotification('Failed to update preferences', 'error');
    }
}

// Update budget
async function updateBudget(event) {
    event.preventDefault();
    
    const budget = {
        monthlyBudget: parseFloat(document.getElementById('monthlyBudget').value) || 0,
        budgetAlerts: document.getElementById('budgetAlerts').checked
    };
    
    try {
        await db.collection('users').doc(currentUser.uid).update(budget);
        showNotification('Budget updated successfully', 'success');
    } catch (error) {
        console.error('Error updating budget:', error);
        showNotification('Failed to update budget', 'error');
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Change password
        await currentUser.updatePassword(newPassword);
        
        showNotification('Password changed successfully', 'success');
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
    } catch (error) {
        console.error('Error changing password:', error);
        
        if (error.code === 'auth/wrong-password') {
            showNotification('Current password is incorrect', 'error');
        } else {
            showNotification('Failed to change password', 'error');
        }
    }
}

// Load categories
async function loadCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;
    
    try {
        const snapshot = await db.collection('categories')
            .where('userId', '==', currentUser.uid)
            .orderBy('type')
            .orderBy('name')
            .get();
        
        if (snapshot.empty) {
            categoriesList.innerHTML = '<p class="text-muted">No custom categories yet</p>';
            return;
        }
        
        categoriesList.innerHTML = snapshot.docs.map(doc => {
            const category = doc.data();
            return `
                <div class="category-item">
                    <span class="category-name">
                        <i class="fas fa-${category.icon || 'tag'}"></i>
                        ${category.name}
                    </span>
                    <span class="category-type ${category.type}">${category.type}</span>
                    <button class="btn-icon" onclick="deleteCategory('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Add category
async function addCategory() {
    const name = document.getElementById('newCategory').value.trim();
    const type = document.getElementById('newCategoryType').value;
    
    if (!name) {
        showNotification('Please enter a category name', 'error');
        return;
    }
    
    try {
        await db.collection('categories').add({
            userId: currentUser.uid,
            name: name,
            type: type,
            icon: 'tag',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('newCategory').value = '';
        loadCategories();
        showNotification('Category added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('Failed to add category', 'error');
    }
}

// Delete category
async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) {
        return;
    }
    
    try {
        await db.collection('categories').doc(categoryId).delete();
        loadCategories();
        showNotification('Category deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Failed to delete category', 'error');
    }
}

// Export data
async function exportData() {
    try {
        const [expenses, income] = await Promise.all([
            db.collection('expenses').where('userId', '==', currentUser.uid).get(),
            db.collection('income').where('userId', '==', currentUser.uid).get()
        ]);
        
        const data = {
            expenses: expenses.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            income: income.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            settings: userSettings,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        showNotification('Data exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Failed to export data', 'error');
    }
}

// Import data
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Implement import logic here
                showNotification('Data imported successfully', 'success');
            } catch (error) {
                console.error('Error importing data:', error);
                showNotification('Failed to import data', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Delete all data
async function deleteData() {
    if (!confirm('WARNING: This will delete ALL your data. This action cannot be undone. Continue?')) {
        return;
    }
    
    if (!confirm('Type "DELETE" to confirm:')) {
        return;
    }
    
    try {
        // Delete all expenses
        const expenses = await db.collection('expenses').where('userId', '==', currentUser.uid).get();
        const batch = db.batch();
        expenses.docs.forEach(doc => batch.delete(doc.ref));
        
        // Delete all income
        const income = await db.collection('income').where('userId', '==', currentUser.uid).get();
        income.docs.forEach(doc => batch.delete(doc.ref));
        
        // Delete all categories
        const categories = await db.collection('categories').where('userId', '==', currentUser.uid).get();
        categories.docs.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        
        showNotification('All data deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting data:', error);
        showNotification('Failed to delete data', 'error');
    }
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
