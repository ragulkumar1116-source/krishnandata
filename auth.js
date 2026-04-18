import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDQRKnsV0aFglvXU52V8LkeRmb3godaKyg",
    databaseURL: "https://rk-tech-eb179-default-rtdb.firebaseio.com",
    projectId: "rk-tech-eb179"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Tokens
let userTurnstileToken = null;
let adminTurnstileToken = null;

// CAPTCHA success
window.onUserTurnstileSuccess = (token) => {
    userTurnstileToken = token;
    document.getElementById("userLoginBtn").disabled = false;
    document.getElementById("userLoginBtn").innerText = "Login";
};

window.onAdminTurnstileSuccess = (token) => {
    adminTurnstileToken = token;
    document.getElementById("adminLoginBtn").disabled = false;
    document.getElementById("adminLoginBtn").innerText = "Login";
};

// Navigation
window.showSelection = () => {
    document.getElementById("selectionScreen").classList.remove("hidden");
    document.getElementById("userLoginScreen").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.add("hidden");
};

window.showUserLogin = () => {
    document.getElementById("selectionScreen").classList.add("hidden");
    document.getElementById("userLoginScreen").classList.remove("hidden");
};

window.showAdminLogin = () => {
    document.getElementById("selectionScreen").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.remove("hidden");
};

// Login function
async function login(username, password, type, token, errorId) {
    const errorBox = document.getElementById(errorId);

    if (!token) {
        errorBox.innerText = "Complete CAPTCHA";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        const snapshot = await get(ref(db, "app_users"));

        let found = null;
        let key = null;

        snapshot.forEach((child) => {
            const user = child.val();
            if ((user.username === username || user.email === username) && user.password === password) {
                found = user;
                key = child.key;
            }
        });

        if (!found) throw new Error("Invalid login");
        if (type === "admin" && found.role !== "admin") throw new Error("Not admin");

        sessionStorage.setItem("user", JSON.stringify(found));
        await set(ref(db, `app_users/${key}/lastLogin`), new Date().toISOString());

        window.location.href = "dashboard.html";

    } catch (e) {
        errorBox.innerText = e.message;
        errorBox.classList.remove("hidden");
    }
}

// Events
document.getElementById("userLoginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    login(
        document.getElementById("userUsername").value,
        document.getElementById("userPassword").value,
        "user",
        userTurnstileToken,
        "userError"
    );
});

document.getElementById("adminLoginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    login(
        document.getElementById("adminUsername").value,
        document.getElementById("adminPassword").value,
        "admin",
        adminTurnstileToken,
        "adminError"
    );
});

// Icons
lucide.createIcons();
