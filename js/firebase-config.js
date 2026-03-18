// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDKWJ7ev6WjwuY7L6BtEgUb00VDdA5DBBI",
    authDomain: "expense-tracker-aebb1.firebaseapp.com",
    projectId: "expense-tracker-aebb1",
    storageBucket: "expense-tracker-aebb1.firebasestorage.app",
    messagingSenderId: "220896439984",
    appId: "1:220896439984:web:645c8656c3ba1d39991575",
    measurementId: "G-82GS854XPS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable persistence for offline support
db.enablePersistence({
    synchronizeTabs: true
})
.then(() => {
    console.log('Offline persistence enabled');
})
.catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Persistence not available in this browser');
    }
});

// Authentication Providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const emailProvider = new firebase.auth.EmailAuthProvider();

// Configure Google Provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Make services globally available
window.auth = auth;
window.db = db;
window.storage = storage;
window.googleProvider = googleProvider;
window.emailProvider = emailProvider;

// Add connection state monitoring
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
        // Update last active timestamp
        db.collection('users').doc(user.uid).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    } else {
        console.log('User is signed out');
    }
});

// Monitor connection state
firebase.firestore().enableNetwork()
    .then(() => console.log('Firestore network enabled'))
    .catch((err) => console.error('Firestore network error:', err));

console.log('Firebase initialized successfully');
