/* ==============================================
   CONFIGURAZIONE E COSTANTI
   Definizione delle password e costanti di sistema
   ============================================== */
// Password sicure predefinite per diversi ruoli
const passwords = {
    'sea': 'admin',
    'usersea': 'user'
};

// Costanti per la gestione dei tentativi di login
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 300000; // 5 minuti in millisecondi

/* ==============================================
   RIFERIMENTI DOM
   Selezione degli elementi del DOM necessari
   ============================================== */
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loading = document.getElementById('loading');
const strengthMeter = document.getElementById('strengthMeter');

/* ==============================================
   GESTIONE STATO LOGIN
   Inizializzazione e gestione dello stato del login
   ============================================== */
// Usa localStorage per persistenza tra sessioni
let loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
let lastLoginTime = parseInt(localStorage.getItem('lastLoginTime') || Date.now().toString());

/* ==============================================
   FUNZIONI DI UTILITÀ
   Funzioni helper per la gestione dei messaggi e della UI
   ============================================== */
// Mostra messaggio di errore con animazione
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    
    // Aggiunge animazione di shake al container
    const container = document.querySelector('.login-container');
    container.style.animation = 'none';
    container.offsetHeight; // Trigger reflow
    container.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
}

// Mostra messaggio di successo
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

/* ==============================================
   GESTIONE PASSWORD
   Funzionalità relative alla password e sua validazione
   ============================================== */
// Toggle visibilità password
togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.classList.toggle('fa-eye');
    togglePassword.classList.toggle('fa-eye-slash');
});

// Verifica forza password
function checkPasswordStrength(password) {
    let strength = 0;
    if(password.length >= 12) strength++;
    if(/\d/.test(password)) strength++;
    if(/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if(/[!@#$%^&*]/.test(password)) strength++;
    return strength;
}

// Aggiornamento indicatore forza password in tempo reale
passwordInput.addEventListener('input', () => {
    const strength = checkPasswordStrength(passwordInput.value);
    strengthMeter.className = 'strength-meter';
    
    if(strength >= 4) {
        strengthMeter.classList.add('strength-strong');
    } else if(strength >= 2) {
        strengthMeter.classList.add('strength-medium');
    } else if(strength >= 1) {
        strengthMeter.classList.add('strength-weak');
    }
});



/* ==============================================
   GESTIONE LOGIN
   Logica principale per il processo di login
   ============================================== */
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Verifica timeout dei tentativi
    const now = Date.now();
    const timeSinceLastAttempt = now - lastLoginTime;

    if(loginAttempts > 0) {
        if(loginAttempts >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_TIME) {
            const waitTime = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 60000);
            showError(`Account bloccato. Riprova tra ${waitTime} minuti`);
            return;
        }

        if(timeSinceLastAttempt >= LOCKOUT_TIME) {
            loginAttempts = 0;
            localStorage.setItem('loginAttempts', '0');
        }
    }

    const password = passwordInput.value;

    // Validazione input
    if(!password) {
        showError('Inserisci la password');
        return;
    }

    // Attiva loading state
    loading.style.display = 'flex';

    try {
        // Simula richiesta al server
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verifica credenziali
        const role = passwords[password];

        if(!role) {
            loginAttempts++;
            localStorage.setItem('loginAttempts', loginAttempts.toString());
            localStorage.setItem('lastLoginTime', now.toString());
            
            if(loginAttempts >= MAX_ATTEMPTS) {
                throw new Error(`Account bloccato. Riprova tra 5 minuti`);
            } else {
                throw new Error(`Password non valida. Tentativi rimasti: ${MAX_ATTEMPTS - loginAttempts}`);
            }
        }

        // Login riuscito
        showSuccess('Accesso effettuato con successo!');
        
        // Reset contatore tentativi
        loginAttempts = 0;
        localStorage.setItem('loginAttempts', '0');
        
        // Dati per l'autenticazione
        const userData = {
            role: role,
            loginTime: new Date().toISOString()
        };

        // Animazione e redirect
        const container = document.querySelector('.login-container');
        container.style.transform = 'rotateX(90deg) translateY(-100px)';
        container.style.opacity = '0';

        // Invia evento di login all'applicazione Electron
        window.electronAPI.login(userData);

    } catch(error) {
        showError(error.message);
    } finally {
        loading.style.display = 'none';
    }
});

/* ==============================================
   EVENTI AGGIUNTIVI
   Eventi supplementari per migliorare l'UX
   ============================================== */
// Submit con tasto Enter
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});
