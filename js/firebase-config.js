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
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable persistence for offline support
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistence failed');
        } else if (err.code == 'unimplemented') {
            console.log('Persistence not available');
        }
    });

// Authentication Providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const emailProvider = new firebase.auth.EmailAuthProvider();

export { auth, db, storage, googleProvider, emailProvider };
