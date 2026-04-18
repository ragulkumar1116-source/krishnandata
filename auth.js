// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase Configuration
// IMPORTANT: In production, use environment variables for these values
const firebaseConfig = {
    apiKey: "AIzaSyDQRKnsV0aFglvXU52V8LkeRmb3godaKyg",
    authDomain: "rk-tech-eb179.firebaseapp.com",
    databaseURL: "https://rk-tech-eb179-default-rtdb.firebaseio.com",
    projectId: "rk-tech-eb179",
    storageBucket: "rk-tech-eb179.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global State
let userTurnstileToken = null;
let adminTurnstileToken = null;

// Security Manager: Rate Limiting
const SecurityManager = {
    attempts: 0,
    locked: false,
    lockoutTime: 0,
    
    checkLockout() {
        if (this.locked) {
            const now = Date.now();
            if (now < this.lockoutTime) {
                const remaining = Math.ceil((this.lockoutTime - now) / 1000);
                this.showLockout(remaining);
                return false;
            } else {
                this.unlock();
            }
        }
        return true;
    },
    
    recordAttempt() {
        this.attempts++;
        if (this.attempts >= 5) {
            this.lock();
        }
        return this.attempts < 5;
    },
    
    lock() {
        this.locked = true;
        this.lockoutTime = Date.now() + 30000; // 30 seconds
        this.showLockout(30);
        sessionStorage.setItem('auth_lockout', this.lockoutTime);
    },
    
    unlock() {
        this.locked = false;
        this.attempts = 0;
        sessionStorage.removeItem('auth_lockout');
        document.getElementById('rateLimitOverlay').classList.add('hidden');
    },
    
    showLockout(seconds) {
        const overlay = document.getElementById('rateLimitOverlay');
        const countdown = document.getElementById('countdown');
        overlay.classList.remove('hidden');
        
        let remaining = seconds;
        countdown.textContent = remaining;
        
        const timer = setInterval(() => {
            remaining--;
            countdown.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(timer);
                this.unlock();
            }
        }, 1000);
    },
    
    init() {
        const stored = sessionStorage.getItem('auth_lockout');
        if (stored) {
            const time = parseInt(stored);
            if (time > Date.now()) {
                this.locked = true;
                this.lockoutTime = time;
                this.showLockout(Math.ceil((time - Date.now()) / 1000));
            } else {
                sessionStorage.removeItem('auth_lockout');
            }
        }
    }
};

// Initialize Security
SecurityManager.init();

// CSRF Token Generation
function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
}

// Store CSRF Token
const csrfToken = generateCSRFToken();
sessionStorage.setItem('csrf_token', csrfToken);

// Turnstile Callbacks (Must be on window object)
window.onUserTurnstileSuccess = function(token) {
    userTurnstileToken = token;
    document.getElementById('userLoginBtn').disabled = false;
    document.getElementById('userBtnText').textContent = 'Secure Login';
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
    
    // Reset Turnstile
    if (typeof turnstile !== 'undefined') {
        turnstile.reset('#userTurnstile');
        turnstile.reset('#adminTurnstile');
    }
    userTurnstileToken = null;
    adminTurnstileToken = null;
    
    // Clear sensitive fields
    document.getElementById('userPassword').value = '';
    document.getElementById('adminPassword').value = '';
};

window.showUserLogin = () => {
    if (!SecurityManager.checkLockout()) return;
    
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('userLoginScreen').classList.remove('hidden');
    document.getElementById('userError').classList.add('hidden');
    document.getElementById('userLoginBtn').disabled = true;
    document.getElementById('userBtnText').textContent = 'Complete CAPTCHA First';
    userTurnstileToken = null;
};

window.showAdminLogin = () => {
    if (!SecurityManager.checkLockout()) return;
    
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('adminLoginScreen').classList.remove('hidden');
    document.getElementById('adminError').classList.add('hidden');
    document.getElementById('adminLoginBtn').disabled = true;
    document.getElementById('adminBtnText').textContent = 'Complete CAPTCHA First';
    adminTurnstileToken = null;
};

window.togglePassword = (id) => {
    const input = document.getElementById(id);
    const icon = input.parentElement.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
};

window.showForgotPassword = (type) => {
    const email = prompt(`Enter your ${type} email address:`);
    if (email && email.includes('@')) {
        sendPasswordResetEmail(auth, email)
            .then(() => alert('Password reset email sent! Check your inbox.'))
            .catch(err => alert('Error: ' + err.message));
    }
};

// Utility: Show Error
function showError(element, message) {
    element.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4"></i> <span>${message}</span>`;
    element.classList.remove('hidden');
    lucide.createIcons();
}

// Secure Login Handler
async function handleSecureLogin(email, password, type, btnConfig, turnstileToken, rememberMe) {
    const { btnId, btnTextId, loaderId, errorId } = btnConfig;
    const btn = document.getElementById(btnId);
    const btnText = document.getElementById(btnTextId);
    const loader = document.getElementById(loaderId);
    const errorBox = document.getElementById(errorId);
    
    // Security checks
    if (!SecurityManager.checkLockout()) return;
    
    if (!turnstileToken) {
        showError(errorBox, 'Please complete the human verification');
        return;
    }
    
    // Validate inputs
    if (!email || !email.includes('@') || !email.includes('.')) {
        showError(errorBox, 'Please enter a valid email address');
        return;
    }
    
    if (password.length < 8) {
        showError(errorBox, 'Password must be at least 8 characters');
        return;
    }

    // Check CSRF
    const storedToken = sessionStorage.getItem('csrf_token');
    if (!storedToken) {
        showError(errorBox, 'Security validation failed. Please refresh the page.');
        return;
    }
    
    // Set loading state
    btn.disabled = true;
    btnText.textContent = 'Authenticating...';
    loader.classList.remove('hidden');
    errorBox.classList.add('hidden');

    try {
        // Set persistence
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        
        // Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Verify Turnstile token format
        if (!turnstileToken || turnstileToken.length < 10) {
            throw new Error('Invalid verification token');
        }
        
        // Check user role in RTDB
        const userRef = ref(db, `app_users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            await auth.signOut();
            throw new Error('User profile not found');
        }
        
        const userData = snapshot.val();
        
        // Verify role
        if (type === 'admin' && userData.role !== 'admin') {
            await auth.signOut();
            throw new Error('Access denied: Administrator privileges required');
        }
        
        if (userData.status !== 'active') {
            await auth.signOut();
            throw new Error('Account suspended. Contact support.');
        }
        
        // Create secure session
        const sessionData = {
            uid: user.uid,
            email: user.email,
            role: userData.role,
            name: userData.name || (userData.firstName + ' ' + userData.lastName),
            csrf: storedToken,
            loginTime: new Date().toISOString(),
            turnstileVerified: true
        };
        
        // Store in sessionStorage
        sessionStorage.setItem('fleetsync_session', JSON.stringify(sessionData));
        
        // Clear sensitive data
        password = null;
        
        // Redirect
        const redirectUrl = type === 'admin' ? 'dashboard.html?page=admin&auth=1' : 'dashboard.html?auth=1';
        window.location.href = redirectUrl;
        
    } catch (error) {
        SecurityManager.recordAttempt();
        let message = 'Authentication failed';
        
        // Sanitize error messages
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Invalid email or password';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Too many failed attempts. Please try again later.';
            SecurityManager.lock();
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email format';
        } else if (error.code === 'auth/invalid-credential') {
            message = 'Invalid credentials';
        } else if (error.message) {
            message = error.message;
        }
        
        showError(errorBox, message);
        btn.disabled = false;
        btnText.textContent = type === 'admin' ? 'Access Admin Panel' : 'Secure Login';
        loader.classList.add('hidden');
        
        // Reset Turnstile on error
        if (typeof turnstile !== 'undefined') {
            turnstile.reset(type === 'admin' ? '#adminTurnstile' : '#userTurnstile');
        }
    }
}

// Event Listeners
document.getElementById('userLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSecureLogin(
        document.getElementById('userEmail').value.trim().toLowerCase(),
        document.getElementById('userPassword').value,
        'user',
        {
            btnId: 'userLoginBtn',
            btnTextId: 'userBtnText',
            loaderId: 'userBtnLoader',
            errorId: 'userError'
        },
        userTurnstileToken,
        document.getElementById('userRemember').checked
    );
});

document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSecureLogin(
        document.getElementById('adminEmail').value.trim().toLowerCase(),
        document.getElementById('adminPassword').value,
        'admin',
        {
            btnId: 'adminLoginBtn',
            btnTextId: 'adminBtnText',
            loaderId: 'adminBtnLoader',
            errorId: 'adminError'
        },
        adminTurnstileToken,
        document.getElementById('adminRemember').checked
    );
});

// Check for existing session on load
const existingSession = sessionStorage.getItem('fleetsync_session');
if (existingSession) {
    try {
        const session = JSON.parse(existingSession);
        if (session.role === 'admin') {
            document.getElementById('authWarning').classList.remove('hidden');
        }
    } catch(e) {
        sessionStorage.removeItem('fleetsync_session');
    }
}

// Initialize icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

// Security: Clear sensitive inputs on page unload
window.addEventListener('beforeunload', () => {
    const userPass = document.getElementById('userPassword');
    const adminPass = document.getElementById('adminPassword');
    if (userPass) userPass.value = '';
    if (adminPass) adminPass.value = '';
});
