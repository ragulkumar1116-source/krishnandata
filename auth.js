import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserLocalPersistence, 
    browserSessionPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQRKnsV0aFglvXU52V8LkeRmb3godaKyg",
    authDomain: "rk-tech-eb179.firebaseapp.com",
    databaseURL: "https://rk-tech-eb179-default-rtdb.firebaseio.com",
    projectId: "rk-tech-eb179",
    storageBucket: "rk-tech-eb179.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Security State
let userTurnstileToken = null;
let adminTurnstileToken = null;
let loginAttempts = { count: 0, lockedUntil: 0 };

// Rate limiting
const SECURITY = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 300000, // 5 minutes
    
    isLocked() {
        if (Date.now() < loginAttempts.lockedUntil) {
            const remaining = Math.ceil((loginAttempts.lockedUntil - Date.now()) / 1000);
            throw new Error(`Too many attempts. Wait ${remaining} seconds.`);
        }
        loginAttempts = { count: 0, lockedUntil: 0 };
        return false;
    },
    
    recordFailure() {
        loginAttempts.count++;
        if (loginAttempts.count >= this.MAX_ATTEMPTS) {
            loginAttempts.lockedUntil = Date.now() + this.LOCKOUT_DURATION;
        }
    }
};

// Turnstile Callbacks
window.onUserTurnstileSuccess = function(token) {
    userTurnstileToken = token;
    document.getElementById('userLoginBtn').disabled = false;
    document.getElementById('userBtnText').textContent = 'Login Securely';
};

window.onAdminTurnstileSuccess = function(token) {
    adminTurnstileToken = token;
    document.getElementById('adminLoginBtn').disabled = false;
    document.getElementById('adminBtnText').textContent = 'Access Admin Panel';
};

// UI Functions
window.showSelection = () => {
    document.getElementById('selectionScreen').classList.remove('hidden');
    document.getElementById('userLoginScreen').classList.add('hidden');
    document.getElementById('adminLoginScreen').classList.add('hidden');
    
    if (typeof turnstile !== 'undefined') {
        turnstile.reset('#userTurnstile');
        turnstile.reset('#adminTurnstile');
    }
    userTurnstileToken = null;
    adminTurnstileToken = null;
};

window.showUserLogin = () => {
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('userLoginScreen').classList.remove('hidden');
    clearErrors('user');
    resetButton('user');
};

window.showAdminLogin = () => {
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('adminLoginScreen').classList.remove('hidden');
    clearErrors('admin');
    resetButton('admin');
};

function clearErrors(type) {
    const errorBox = document.getElementById(`${type}Error`);
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
}

function resetButton(type) {
    const btn = document.getElementById(`${type}LoginBtn`);
    const btnText = document.getElementById(`${type}BtnText`);
    btn.disabled = true;
    btnText.textContent = 'Complete CAPTCHA First';
}

// Secure Login Handler using Firebase Auth
async function handleSecureLogin(email, password, type, turnstileToken, rememberMe) {
    const errorBox = document.getElementById(`${type}Error`);
    const btn = document.getElementById(`${type}LoginBtn`);
    const btnText = document.getElementById(`${type}BtnText`);
    const loader = document.getElementById(`${type}BtnLoader`);
    
    try {
        // Security checks
        SECURITY.isLocked();
        
        if (!turnstileToken) {
            throw new Error('Complete the human verification');
        }
        
        if (!email.includes('@')) {
            throw new Error('Enter a valid email');
        }
        
        if (password.length < 6) {
            throw new Error('Password too short');
        }
        
        // UI Loading
        btn.disabled = true;
        btnText.textContent = 'Verifying...';
        loader.classList.remove('hidden');
        errorBox.classList.add('hidden');
        
        // Set persistence
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        
        // Firebase Auth Login (Secure!)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Verify Turnstile (In production, verify server-side)
        if (!turnstileToken || turnstileToken.length < 10) {
            await auth.signOut();
            throw new Error('Invalid verification');
        }
        
        // Check role in Database (now secure with rules)
        const userRef = ref(db, `app_users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            await auth.signOut();
            throw new Error('User profile not found');
        }
        
        const userData = snapshot.val();
        
        // Verify status
        if (userData.status !== 'active') {
            await auth.signOut();
            throw new Error('Account suspended');
        }
        
        // Verify admin role if needed
        if (type === 'admin' && userData.role !== 'admin') {
            await auth.signOut();
            throw new Error('Access denied: Not an admin');
        }
        
        // Update last login
        await set(ref(db, `app_users/${user.uid}/lastLogin`), new Date().toISOString());
        
        // Create secure session
        const sessionData = {
            uid: user.uid,
            email: user.email,
            role: userData.role,
            name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            loginTime: Date.now()
        };
        
        sessionStorage.setItem('fleetsync_session', JSON.stringify(sessionData));
        
        // Redirect
        window.location.href = type === 'admin' ? 'dashboard.html?page=admin' : 'dashboard.html';
        
    } catch (error) {
        SECURITY.recordFailure();
        
        let message = 'Login failed';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Invalid email or password';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Too many attempts. Try again later';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email format';
        } else if (error.message) {
            message = error.message;
        }
        
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
        
        btn.disabled = false;
        btnText.textContent = type === 'admin' ? 'Access Admin Panel' : 'Login';
        loader.classList.add('hidden');
        
        if (typeof turnstile !== 'undefined') {
            turnstile.reset(type === 'admin' ? '#adminTurnstile' : '#userTurnstile');
        }
    }
}

// Event Listeners
document.getElementById('userLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const rememberMe = true; // Default for users
    
    handleSecureLogin(email, password, 'user', userTurnstileToken, rememberMe);
});

document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const rememberMe = false; // Safer for admin
    
    handleSecureLogin(email, password, 'admin', adminTurnstileToken, rememberMe);
});

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Auth state: Logged in');
    } else {
        console.log('Auth state: Logged out');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
});
