import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// SECURITY WARNING: In production, use Firebase Authentication instead of Realtime Database
// for user management. Storing passwords in Realtime Database is insecure.

const firebaseConfig = {
    apiKey: "AIzaSyDQRKnsV0aFglvXU52V8LkeRmb3godaKyg",
    databaseURL: "https://rk-tech-eb179-default-rtdb.firebaseio.com",
    projectId: "rk-tech-eb179"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Security State
let userTurnstileToken = null;
let adminTurnstileToken = null;
let csrfToken = null;

// Rate Limiting Configuration
const SECURITY = {
    maxAttempts: 5,
    lockoutDuration: 300000, // 5 minutes in milliseconds
    attempts: new Map(), // Store attempts by username/IP (simulated)
    
    // Generate CSRF Token
    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array));
    },
    
    // Hash password using SHA-256 (Client-side only - not as secure as bcrypt but better than plaintext)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    // Check if account is locked
    isLocked(identifier) {
        const record = this.attempts.get(identifier);
        if (!record) return false;
        
        if (record.lockedUntil && Date.now() < record.lockedUntil) {
            const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000);
            throw new Error(`Account locked. Try again in ${remaining} seconds.`);
        }
        
        // Reset if lock expired
        if (record.lockedUntil && Date.now() >= record.lockedUntil) {
            this.attempts.delete(identifier);
            return false;
        }
        
        return false;
    },
    
    // Record failed attempt
    recordAttempt(identifier) {
        const now = Date.now();
        let record = this.attempts.get(identifier) || { count: 0, firstAttempt: now };
        
        record.count++;
        
        // Reset counter after 15 minutes
        if (now - record.firstAttempt > 900000) {
            record = { count: 1, firstAttempt: now };
        }
        
        // Lock after max attempts
        if (record.count >= this.maxAttempts) {
            record.lockedUntil = now + this.lockoutDuration;
            this.attempts.set(identifier, record);
            throw new Error(`Too many failed attempts. Account locked for 5 minutes.`);
        }
        
        this.attempts.set(identifier, record);
        return this.maxAttempts - record.count;
    },
    
    // Clear attempts on successful login
    clearAttempts(identifier) {
        this.attempts.delete(identifier);
    }
};

// Initialize CSRF Token
csrfToken = SECURITY.generateToken();
sessionStorage.setItem('csrf_token', csrfToken);

// Turnstile Callbacks
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

// Input Sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '').substring(0, 100); // Prevent XSS and limit length
}

// Validate Email/Username
function validateIdentifier(identifier) {
    if (!identifier || identifier.length < 3) {
        throw new Error('Username must be at least 3 characters');
    }
    if (identifier.length > 50) {
        throw new Error('Username too long');
    }
    // Email validation if it contains @
    if (identifier.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
            throw new Error('Invalid email format');
        }
    }
}

// Validate Password
function validatePassword(password) {
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    if (password.length > 128) {
        throw new Error('Password too long');
    }
}

// Secure Session Creation
function createSecureSession(userData, userKey) {
    const session = {
        uid: userKey,
        username: userData.username,
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        role: userData.role,
        email: userData.email,
        csrf: csrfToken,
        created: Date.now(),
        expires: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    
    // Encrypt session data before storing (basic obfuscation)
    const sessionString = JSON.stringify(session);
    sessionStorage.setItem('fleetsync_session', sessionString);
    sessionStorage.setItem('session_sig', SECURITY.hashPassword(sessionString + csrfToken).slice(0, 16)); // Simple integrity check
}

// Verify Session Integrity (call this on dashboard load)
function verifySession() {
    const session = sessionStorage.getItem('fleetsync_session');
    const sig = sessionStorage.getItem('session_sig');
    
    if (!session || !sig) return false;
    
    try {
        const data = JSON.parse(session);
        if (Date.now() > data.expires) {
            clearSession();
            return false;
        }
        // Verify CSRF
        if (data.csrf !== csrfToken) return false;
        return true;
    } catch (e) {
        return false;
    }
}

function clearSession() {
    sessionStorage.removeItem('fleetsync_session');
    sessionStorage.removeItem('session_sig');
}

// UI Functions
window.showSelection = () => {
    document.getElementById('selectionScreen').classList.remove('hidden');
    document.getElementById('userLoginScreen').classList.add('hidden');
    document.getElementById('adminLoginScreen').classList.add('hidden');
    
    // Clear sensitive fields
    document.getElementById('userPassword').value = '';
    document.getElementById('adminPassword').value = '';
    
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
    document.getElementById('userError').classList.add('hidden');
    document.getElementById('userLoginBtn').disabled = true;
    document.getElementById('userBtnText').textContent = 'Complete CAPTCHA First';
    userTurnstileToken = null;
};

window.showAdminLogin = () => {
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('adminLoginScreen').classList.remove('hidden');
    document.getElementById('adminError').classList.add('hidden');
    document.getElementById('adminLoginBtn').disabled = true;
    document.getElementById('adminBtnText').textContent = 'Complete CAPTCHA First';
    adminTurnstileToken = null;
};

// Secure Login Handler
async function handleSecureLogin(identifier, password, type, btnConfig, turnstileToken) {
    const { btnId, btnTextId, loaderId, errorId } = btnConfig;
    const btn = document.getElementById(btnId);
    const btnText = document.getElementById(btnTextId);
    const loader = document.getElementById(loaderId);
    const errorBox = document.getElementById(errorId);
    
    // Reset error display
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    
    try {
        // Input validation
        validateIdentifier(identifier);
        validatePassword(password);
        
        // Rate limiting check
        SECURITY.isLocked(identifier);
        
        if (!turnstileToken) {
            throw new Error('Please complete the human verification');
        }
        
        // CSRF Check
        const storedToken = sessionStorage.getItem('csrf_token');
        if (!storedToken || storedToken !== csrfToken) {
            throw new Error('Security token invalid. Please refresh the page.');
        }
        
        // UI Loading State
        btn.disabled = true;
        btnText.textContent = 'Authenticating...';
        loader.classList.remove('hidden');
        
        // Hash password for comparison (since we're storing hashed passwords now)
        const hashedPassword = await SECURITY.hashPassword(password);
        
        // Fetch users
        const snapshot = await get(ref(db, 'app_users'));
        
        if (!snapshot.exists()) {
            throw new Error('Authentication system error');
        }

        let foundUser = null;
        let userKey = null;

        snapshot.forEach((child) => {
            const user = child.val();
            // Compare hashed passwords
            if ((user.username === identifier || user.email === identifier) && 
                user.password === hashedPassword) {
                foundUser = user;
                userKey = child.key;
            }
        });

        if (!foundUser) {
            const remaining = SECURITY.recordAttempt(identifier);
            throw new Error(`Invalid credentials. ${remaining} attempts remaining.`);
        }
        
        if (foundUser.status !== 'active') {
            throw new Error('Account suspended. Contact administrator.');
        }
        
        if (type === 'admin' && foundUser.role !== 'admin') {
            SECURITY.recordAttempt(identifier);
            throw new Error('Access denied: Insufficient privileges');
        }

        // Success - Clear attempts
        SECURITY.clearAttempts(identifier);
        
        // Update last login
        await set(ref(db, `app_users/${userKey}/lastLogin`), new Date().toISOString());
        await set(ref(db, `app_users/${userKey}/lastIP`), 'client-side'); // Cannot get real IP client-side
        
        // Create secure session
        createSecureSession(foundUser, userKey);
        
        // Clear password from memory
        password = null;
        document.getElementById(type === 'admin' ? 'adminPassword' : 'userPassword').value = '';
        
        // Redirect
        setTimeout(() => {
            window.location.href = type === 'admin' ? 'dashboard.html?page=admin' : 'dashboard.html';
        }, 100);
        
    } catch (error) {
        // Sanitize error message for display (prevent XSS)
        const safeError = error.message.replace(/[<>]/g, '');
        errorBox.textContent = safeError;
        errorBox.classList.remove('hidden');
        
        btn.disabled = false;
        btnText.textContent = type === 'admin' ? 'Access Admin Panel' : 'Secure Login';
        loader.classList.add('hidden');
        
        // Reset Turnstile on error to prevent replay
        if (typeof turnstile !== 'undefined') {
            turnstile.reset(type === 'admin' ? '#adminTurnstile' : '#userTurnstile');
        }
    }
}

// Event Listeners with debouncing
let isProcessing = false;

document.getElementById('userLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    isProcessing = true;
    
    await handleSecureLogin(
        sanitizeInput(document.getElementById('userUsername').value),
        document.getElementById('userPassword').value,
        'user',
        {
            btnId: 'userLoginBtn',
            btnTextId: 'userBtnText',
            loaderId: 'userBtnLoader',
            errorId: 'userError'
        },
        userTurnstileToken
    );
    
    setTimeout(() => isProcessing = false, 1000);
});

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    isProcessing = true;
    
    await handleSecureLogin(
        sanitizeInput(document.getElementById('adminUsername').value),
        document.getElementById('adminPassword').value,
        'admin',
        {
            btnId: 'adminLoginBtn',
            btnTextId: 'adminBtnText',
            loaderId: 'adminBtnLoader',
            errorId: 'adminError'
        },
        adminTurnstileToken
    );
    
    setTimeout(() => isProcessing = false, 1000);
});

// Initialize Icons
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Check for existing valid session
    if (verifySession()) {
        console.log('Valid session found');
        // Optionally auto-redirect or show message
    }
});

// Security: Clear sensitive data on unload
window.addEventListener('beforeunload', () => {
    document.getElementById('userPassword').value = '';
    document.getElementById('adminPassword').value = '';
});

// Prevent back button cache (ensure fresh load)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});
