// Authentication Functions
let currentUser = null;

// Check authentication state
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // Redirect to dashboard if on auth page
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname.includes('signup.html')) {
            window.location.href = 'dashboard.html';
        }
        loadUserData(user.uid);
    } else {
        currentUser = null;
        // Redirect to login if on protected page
        if (window.location.pathname.includes('dashboard.html') ||
            window.location.pathname.includes('expenses.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    const loginBtn = document.getElementById('loginBtn');
    
    // Show loading state
    toggleButtonLoading(loginBtn, true);
    
    try {
        const persistence = rememberMe ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
        
        await firebase.auth().setPersistence(persistence);
        
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Log successful login
        console.log('User logged in:', userCredential.user.email);
        
        // Show success message
        showNotification('Login successful! Redirecting...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        handleAuthError(error);
    } finally {
        toggleButtonLoading(loginBtn, false);
    }
}

// Handle Signup
async function handleSignup(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const signupBtn = document.getElementById('signupBtn');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'error');
        return;
    }
    
    // Show loading state
    toggleButtonLoading(signupBtn, true);
    
    try {
        // Create user in Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile with display name
        await user.updateProfile({
            displayName: fullName
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            fullName: fullName,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            currency: 'USD',
            monthlyBudget: 0,
            settings: {
                darkMode: false,
                notifications: true,
                language: 'en'
            }
        });
        
        // Create default categories
        await createDefaultCategories(user.uid);
        
        // Show success message
        showNotification('Account created successfully!', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Signup error:', error);
        handleAuthError(error);
    } finally {
        toggleButtonLoading(signupBtn, false);
    }
}

// Handle Google Login
async function handleGoogleLogin() {
    const googleBtn = document.querySelector('.btn-google');
    toggleButtonLoading(googleBtn, true);
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create new user document
            await db.collection('users').doc(user.uid).set({
                fullName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                currency: 'USD',
                monthlyBudget: 0,
                settings: {
                    darkMode: false,
                    notifications: true,
                    language: 'en'
                }
            });
            
            // Create default categories
            await createDefaultCategories(user.uid);
        }
        
        showNotification('Google login successful!', 'success');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Google login error:', error);
        handleAuthError(error);
    } finally {
        toggleButtonLoading(googleBtn, false);
    }
}

// Handle Google Signup (similar to login)
function handleGoogleSignup() {
    handleGoogleLogin();
}

// Forgot Password
async function forgotPassword() {
    const email = prompt('Please enter your email address:');
    
    if (!email) return;
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showNotification('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        handleAuthError(error);
    }
}

// Logout
async function logout() {
    try {
        await firebase.auth().signOut();
        showNotification('Logged out successfully', 'success');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Create default categories for new users
async function createDefaultCategories(userId) {
    const categories = [
        { name: 'Food & Dining', type: 'expense', color: '#FF6B6B', icon: 'utensils' },
        { name: 'Transportation', type: 'expense', color: '#4ECDC4', icon: 'car' },
        { name: 'Shopping', type: 'expense', color: '#45B7D1', icon: 'shopping-bag' },
        { name: 'Entertainment', type: 'expense', color: '#96CEB4', icon: 'film' },
        { name: 'Bills & Utilities', type: 'expense', color: '#FFE194', icon: 'bolt' },
        { name: 'Healthcare', type: 'expense', color: '#E6B89C', icon: 'heartbeat' },
        { name: 'Education', type: 'expense', color: '#A2D9CE', icon: 'book' },
        { name: 'Salary', type: 'income', color: '#81C784', icon: 'money-bill-wave' },
        { name: 'Freelance', type: 'income', color: '#64B5F6', icon: 'laptop' },
        { name: 'Investment', type: 'income', color: '#FFB74D', icon: 'chart-line' }
    ];
    
    const batch = db.batch();
    
    categories.forEach((category) => {
        const categoryRef = db.collection('categories').doc();
        batch.set(categoryRef, {
            ...category,
            userId: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    
    await batch.commit();
    console.log('Default categories created');
}

// Handle authentication errors
function handleAuthError(error) {
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'No user found with this email.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password.';
            break;
        case 'auth/email-already-in-use':
            message = 'Email already in use.';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak.';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Check your connection.';
            break;
        case 'auth/popup-closed-by-user':
            message = 'Sign-in popup was closed.';
            break;
    }
    
    showNotification(message, 'error');
}

// Toggle button loading state
function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        button.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (btnLoader) btnLoader.classList.remove('hidden');
    } else {
        button.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notification container exists
    let container = document.querySelector('.notification-container');
    
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.currentTarget.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Check password strength
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthIndicator) {
        passwordInput.addEventListener('input', function() {
            const strength = checkPasswordStrength(this.value);
            updateStrengthIndicator(strength);
        });
    }
});

function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;
    
    return strength;
}

function updateStrengthIndicator(strength) {
    const indicator = document.getElementById('passwordStrength');
    const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#ff4444', '#ff7744', '#ffaa44', '#44ff88', '#44ff44'];
    
    indicator.textContent = texts[strength];
    indicator.style.color = colors[strength];
}
