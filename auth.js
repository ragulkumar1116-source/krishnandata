@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body { 
    font-family: 'Plus Jakarta Sans', sans-serif; 
    background: linear-gradient(-45deg, #0f172a, #1e1b4b, #312e81, #1e293b);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.glass-panel {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 24px;
    padding: 40px;
    width: 100%;
    max-width: 900px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.text-center { text-align: center; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mb-8 { margin-bottom: 32px; }
.mt-8 { margin-top: 32px; }
.pt-6 { padding-top: 24px; }

.bg-blue-600 { background-color: #2563eb; }
.bg-amber-500 { background-color: #f59e0b; }
.text-white { color: #ffffff; }
.text-slate-500 { color: #64748b; }
.text-slate-600 { color: #475569; }
.text-slate-900 { color: #0f172a; }
.text-blue-600 { color: #2563eb; }
.text-amber-600 { color: #d97706; }

.inline-block { display: inline-block; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.gap-1 { gap: 4px; }

.grid { display: grid; }
@media (min-width: 768px) {
    .md-grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
}
.gap-6 { gap: 24px; }

.w-10 { width: 40px; height: 40px; }
.w-8 { width: 32px; height: 32px; }
.w-4 { width: 16px; height: 16px; }
.w-16 { width: 64px; height: 64px; }
.h-16 { height: 64px; }
.h-10 { height: 40px; }

.rounded-2xl { border-radius: 16px; }
.rounded-full { border-radius: 9999px; }
.rounded-xl { border-radius: 12px; }

.p-4 { padding: 16px; }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }

.font-black { font-weight: 800; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }

.text-3xl { font-size: 30px; line-height: 36px; }
.text-2xl { font-size: 24px; line-height: 32px; }
.text-xl { font-size: 20px; line-height: 28px; }
.text-sm { font-size: 14px; line-height: 20px; }

.border-t { border-top: 1px solid #e2e8f0; }

/* Portal Cards */
.portal-card {
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: white;
}
.portal-card:hover {
    border-color: #3b82f6;
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
.portal-card.admin:hover {
    border-color: #f59e0b;
    box-shadow: 0 20px 25px -5px rgba(245, 158, 11, 0.2);
}

/* Form Styles */
.max-w-md { max-width: 448px; margin: 0 auto; }
.input-field {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 16px;
    font-size: 15px;
    font-family: inherit;
}
.input-field:focus {
    border-color: #3b82f6;
    outline: none;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.btn-primary {
    width: 100%;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    padding: 16px;
    border-radius: 12px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all 0.3s;
    margin-top: 8px;
    font-family: inherit;
    font-size: 15px;
}
.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
}
.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}
.btn-admin {
    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
}

/* Utility backgrounds */
.bg-blue-100 { background-color: #dbeafe; color: #2563eb; }
.bg-amber-100 { background-color: #fef3c7; color: #d97706; }

/* Turnstile */
.turnstile-container {
    margin: 20px 0;
    min-height: 65px;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Alerts */
.alert {
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    font-weight: 600;
}
.alert-error { 
    background: #fee2e2; 
    color: #991b1b; 
    border: 1px solid #fecaca; 
}

/* Loading */
.loading-spinner {
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-left: 8px;
    vertical-align: middle;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.hidden { display: none !important; }

/* Back button */
.back-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 14px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 4px;
}
.back-btn:hover { color: #1e293b; }

a { color: #2563eb; text-decoration: none; font-weight: 700; }
a:hover { text-decoration: underline; }
