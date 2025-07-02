// Sistema di cooldown per prevenire inserimenti multipli ravvicinati
class FormCooldownManager {
    constructor(cooldownTime = 20000) { // 20 secondi di default
        this.cooldownTime = cooldownTime;
        this.isInCooldown = false;
        this.timerInterval = null;
        this.remainingTime = 0;
        
        // Inizializza l'interfaccia utente
        this.initializeUI();
    }
    
    // Inizializza gli elementi UI per il cooldown
    initializeUI() {
        // Crea il container per il messaggio di cooldown se non esiste
        if (!document.getElementById('cooldownMessage')) {
            const cooldownContainer = document.createElement('div');
            cooldownContainer.id = 'cooldownMessage';
            cooldownContainer.className = 'cooldown-container';
            cooldownContainer.innerHTML = `
                <div class="cooldown-content">
                    <div class="cooldown-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="cooldown-text">
                        <h4>Attendere prima del prossimo inserimento</h4>
                        <p>Tempo rimanente: <span id="cooldownTimer">00:00</span></p>
                        <div class="cooldown-progress">
                            <div class="cooldown-progress-bar" id="cooldownProgressBar"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Inserisce il messaggio nel container del form
            const formContainer = document.querySelector('.insert-form-container') || 
                                 document.querySelector('#inserimenti') || 
                                 document.body;
            formContainer.appendChild(cooldownContainer);
        }
        
        // Aggiungi gli stili CSS
        this.addStyles();
    }
    
    // Aggiunge gli stili CSS per il cooldown
    addStyles() {
        if (!document.getElementById('cooldownStyles')) {
            const style = document.createElement('style');
            style.id = 'cooldownStyles';
            style.textContent = `
                .cooldown-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    backdrop-filter: blur(3px);
                }
                
                .cooldown-container.active {
                    display: flex;
                }
                
                .cooldown-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    animation: cooldownFadeIn 0.3s ease-out;
                }
                
                @keyframes cooldownFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .cooldown-icon {
                    font-size: 3rem;
                    color: #3498db;
                    margin-bottom: 1rem;
                    animation: cooldownPulse 2s infinite;
                }
                
                @keyframes cooldownPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                .cooldown-text h4 {
                    color: #2c3e50;
                    margin-bottom: 0.5rem;
                    font-size: 1.2rem;
                }
                
                .cooldown-text p {
                    color: #7f8c8d;
                    margin-bottom: 1.5rem;
                    font-size: 1rem;
                }
                
                #cooldownTimer {
                    font-weight: bold;
                    color: #e74c3c;
                    font-size: 1.2em;
                }
                
                .cooldown-progress {
                    width: 100%;
                    height: 8px;
                    background: #ecf0f1;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 1rem;
                }
                
                .cooldown-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #e74c3c, #f39c12, #f1c40f, #2ecc71);
                    border-radius: 4px;
                    transition: width 0.1s linear;
                    width: 100%;
                }
                
                .form-disabled {
                    pointer-events: none;
                    opacity: 0.6;
                    position: relative;
                }
                
                .form-disabled::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.3);
                    z-index: 100;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Avvia il cooldown
    startCooldown() {
        if (this.isInCooldown) {
            console.log('Cooldown già attivo');
            return false;
        }
        
        this.isInCooldown = true;
        this.remainingTime = this.cooldownTime;
        
        // Disabilita il form
        this.disableForm();
        
        // Mostra il messaggio di cooldown
        this.showCooldownMessage();
        
        // Avvia il timer
        this.startTimer();
        
        console.log(`Cooldown avviato per ${this.cooldownTime / 1000} secondi`);
        return true;
    }
    
    // Disabilita tutti i form di inserimento
    disableForm() {
        const forms = [
            document.getElementById('nuovaSostanzaForm'),
            document.getElementById('nuovoSaleForm')
        ];
        
        forms.forEach(form => {
            if (form) {
                form.classList.add('form-disabled');
                
                // Disabilita tutti gli input, select e button nel form
                const inputs = form.querySelectorAll('input, select, button, textarea');
                inputs.forEach(input => {
                    input.disabled = true;
                    input.setAttribute('data-was-disabled-by-cooldown', 'true');
                });
            }
        });
    }
    
    // Riabilita tutti i form
    enableForm() {
        const forms = [
            document.getElementById('nuovaSostanzaForm'),
            document.getElementById('nuovoSaleForm')
        ];
        
        forms.forEach(form => {
            if (form) {
                form.classList.remove('form-disabled');
                
                // Riabilita tutti gli input che erano stati disabilitati dal cooldown
                const inputs = form.querySelectorAll('[data-was-disabled-by-cooldown]');
                inputs.forEach(input => {
                    input.disabled = false;
                    input.removeAttribute('data-was-disabled-by-cooldown');
                });
            }
        });
    }
    
    // Mostra il messaggio di cooldown
    showCooldownMessage() {
        const cooldownContainer = document.getElementById('cooldownMessage');
        if (cooldownContainer) {
            cooldownContainer.classList.add('active');
        }
    }
    
    // Nasconde il messaggio di cooldown
    hideCooldownMessage() {
        const cooldownContainer = document.getElementById('cooldownMessage');
        if (cooldownContainer) {
            cooldownContainer.classList.remove('active');
        }
    }
    
    // Avvia il timer countdown
    startTimer() {
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.remainingTime -= 1000;
            this.updateTimerDisplay();
            
            if (this.remainingTime <= 0) {
                this.endCooldown();
            }
        }, 1000);
    }
    
    // Aggiorna la visualizzazione del timer
    updateTimerDisplay() {
        const timerElement = document.getElementById('cooldownTimer');
        const progressBar = document.getElementById('cooldownProgressBar');
        
        if (timerElement) {
            const minutes = Math.floor(this.remainingTime / 60000);
            const seconds = Math.floor((this.remainingTime % 60000) / 1000);
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (progressBar) {
            const progress = (this.remainingTime / this.cooldownTime) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
    
    // Termina il cooldown
    endCooldown() {
        // Ferma il timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Reset stato
        this.isInCooldown = false;
        this.remainingTime = 0;
        
        // Riabilita il form
        this.enableForm();
        
        // Nasconde il messaggio
        this.hideCooldownMessage();
        
        // Mostra notifica di fine cooldown
        if (typeof showNotification === 'function') {
            showNotification('Puoi effettuare un nuovo inserimento', 'success');
        }
        
        console.log('Cooldown terminato - form riabilitato');
    }
    
    // Verifica se il cooldown è attivo
    isCooldownActive() {
        return this.isInCooldown;
    }
    
    // Ottiene il tempo rimanente in millisecondi
    getRemainingTime() {
        return this.remainingTime;
    }
    
    // Forza la fine del cooldown (per debug o situazioni speciali)
    forceCooldownEnd() {
        console.log('Cooldown forzatamente terminato');
        this.endCooldown();
    }
}

// Inizializza il gestore del cooldown globalmente
window.formCooldownManager = new FormCooldownManager(120000); // 60 secondi

// Modifica la funzione di inserimento per utilizzare il cooldown
function patchInserisciNuovaSostanzaWithCooldown() {
    // Salva il riferimento alla funzione originale
    const originalInserisciNuovaSostanza = window.inserisciNuovaSostanza;
    
    // Sostituisci la funzione originale
    window.inserisciNuovaSostanza = async function() {
        // Verifica se il cooldown è attivo
        if (window.formCooldownManager.isCooldownActive()) {
            const remainingTime = Math.ceil(window.formCooldownManager.getRemainingTime() / 1000);
            showNotification(`Attendi ancora ${remainingTime} secondi prima del prossimo inserimento`, 'warning');
            return false;
        }
        
        try {
            // Esegui la validazione e l'inserimento originale
            const result = await originalInserisciNuovaSostanza();
            
            // Se l'inserimento è andato a buon fine, avvia il cooldown
            if (result !== false) {
                window.formCooldownManager.startCooldown();
            }
            
            return result;
        } catch (error) {
            console.error('Errore durante l\'inserimento:', error);
            showNotification('Errore durante l\'inserimento: ' + error.message, 'error');
            return false;
        }
    };
}

// Applica anche alla funzione di inserimento sali se esiste
function patchInserisciNuovoSaleWithCooldown() {
    if (typeof window.inserisciNuovoSale === 'function') {
        const originalInserisciNuovoSale = window.inserisciNuovoSale;
        
        window.inserisciNuovoSale = async function() {
            if (window.formCooldownManager.isCooldownActive()) {
                const remainingTime = Math.ceil(window.formCooldownManager.getRemainingTime() / 1000);
                showNotification(`Attendi ancora ${remainingTime} secondi prima del prossimo inserimento`, 'warning');
                return false;
            }
            
            try {
                const result = await originalInserisciNuovoSale();
                if (result !== false) {
                    window.formCooldownManager.startCooldown();
                }
                return result;
            } catch (error) {
                console.error('Errore durante l\'inserimento sale:', error);
                showNotification('Errore durante l\'inserimento: ' + error.message, 'error');
                return false;
            }
        };
    }
}

// Inizializzazione quando il documento è pronto
function initializeCooldownSystem() {
    // Applica le patch alle funzioni di inserimento
    patchInserisciNuovaSostanzaWithCooldown();
    patchInserisciNuovoSaleWithCooldown();
    
    console.log('Sistema di cooldown inizializzato');
    
    // Debugging: aggiungi pulsante per testare il cooldown (rimuovi in produzione)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            const debugButton = document.createElement('button');
            debugButton.textContent = 'Test Cooldown';
            debugButton.style.position = 'fixed';
            debugButton.style.top = '10px';
            debugButton.style.right = '10px';
            debugButton.style.zIndex = '10000';
            debugButton.style.background = '#e74c3c';
            debugButton.style.color = 'white';
            debugButton.style.border = 'none';
            debugButton.style.padding = '10px';
            debugButton.style.borderRadius = '5px';
            debugButton.onclick = () => window.formCooldownManager.startCooldown();
            document.body.appendChild(debugButton);
        }, 2000);
    }
}

// Inizializza il sistema quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCooldownSystem);
} else {
    initializeCooldownSystem();
}

// Esporta per uso esterno
window.initializeCooldownSystem = initializeCooldownSystem;