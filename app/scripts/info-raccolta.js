/* File per creare e gestire il file JSON con i dati manuali dei form in Raccolta  */

// Gestione dei form della sezione raccolta
class InfoRaccoltaManager {
    constructor() {
        this.initializeButtons();
        this.loadSavedData();
    }

    initializeButtons() {
        // Inizializza i pulsanti di salvataggio e reset
        const saveBtn = document.getElementById('salvaInfoRaccoltaBtn');
        const resetBtn = document.getElementById('resetInfoRaccoltaBtn');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveFormData());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetForms());
        }
        
        // Aggiungi gestione per opzioni EDITABILE
        this.initializeEditableDropdowns();
    }

    async loadSavedData() {
        try {
            const infoRaccolta = await window.electronAPI.loadInfoRaccolta();
            if (infoRaccolta) {
                this.populateFormsWithData(infoRaccolta);
            }
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
            showNotification('Errore nel caricamento dei dati dei form', 'error');
        }
    }

    // Nuovo metodo per gestire i dropdown con campo di testo editabile
    // Sostituisce il metodo initializeEditableDropdowns nel file info-raccolta.js
    initializeEditableDropdowns() {
        ['colore', 'odore', 'statoFisico'].forEach(fieldId => {
            const select = document.getElementById(fieldId);
            const customInput = document.getElementById(`${fieldId}Custom`);
            const customCheck = document.getElementById(`${fieldId}CustomCheck`);
            
            // Ascoltiamo il cambio di stato della checkbox
            if (customCheck && customInput && select) {
                customCheck.addEventListener('change', function() {
                    // Se la checkbox è selezionata, disabilitiamo il select e abilitiamo l'input
                    if (this.checked) {
                        select.disabled = true;
                        customInput.disabled = false;
                        customInput.focus();
                        
                        // Se il select aveva un valore, lo trasferiamo all'input come suggerimento
                        if (select.value && select.value !== "") {
                            customInput.placeholder = `Modifica da: ${select.value}`;
                        }
                        
                        // Impostiamo il campo required sull'input personalizzato
                        customInput.required = true;
                        select.required = false;
                    } else {
                        // Se la checkbox è deselezionata, riabilitiamo il select e disabilitiamo l'input
                        select.disabled = false;
                        customInput.disabled = true;
                        
                        // Reimpostiamo il campo required sul select
                        customInput.required = false;
                        select.required = true;
                    }
                });
                
                // Ascoltiamo anche i cambiamenti del select per aggiornare il placeholder dell'input personalizzato
                select.addEventListener('change', function() {
                    if (this.value && this.value !== "") {
                        customInput.placeholder = `Modifica da: ${this.value}`;
                    } else {
                        customInput.placeholder = `Inserisci ${fieldId} personalizzato`;
                    }
                });
            }
        });
    } //Fine initializeEditableDropdowns


    getFormData() {
        // Funzione per ottenere il valore effettivo di un campo (standard o personalizzato)
        const getFieldValue = (fieldId) => {
            const select = document.getElementById(fieldId);
            const customInput = document.getElementById(`${fieldId}Custom`);
            const customCheck = document.getElementById(`${fieldId}CustomCheck`);
            
            // Se la checkbox è selezionata, usiamo il valore del campo personalizzato
            if (customCheck && customCheck.checked && customInput && customInput.value.trim() !== "") {
                return customInput.value.trim();
            }
            
            // Altrimenti usiamo il valore del select
            return select ? select.value : "";
        };
    
        // Raccoglie i dati dal Form 1: Caratteristiche Fisiche
        const caratteristicheFisiche = {
            colore: getFieldValue('colore'),
            odore: getFieldValue('odore'),
            statoFisico: getFieldValue('statoFisico'),
            ph: document.getElementById('ph').value,
            residuo105: document.getElementById('residuo105').value,
            residuo180: document.getElementById('residuo180').value,
            residuo600: document.getElementById('residuo600').value,
            infiammabilita: document.getElementById('infiammabilita').value
        };
    
        // Raccoglie i dati dal Form 2: Informazioni Certificato (invariato)
        const infoCertificato = {
            rapportoProva: document.getElementById('rapportoProva').value,
            descrizione: document.getElementById('descrizione').value,
            dataCampionamento: document.getElementById('dataCampionamento').value,
            dataStampa: document.getElementById('dataStampa').value,
            codiceEER: document.getElementById('codiceEER').value,
            committente: document.getElementById('committente').value,
            riferimentoVerbale: document.getElementById('riferimentoVerbale').value,
            matrice: document.getElementById('matrice').value
        };
    
        return {
            caratteristicheFisiche,
            infoCertificato,
            timestamp: new Date().toISOString()
        };
    }

    validateForms() {
        // Valida Form 1
        const form1 = document.getElementById('caratteristicheFisicheForm');
        const form2 = document.getElementById('infoCertificatoForm');

        const isForm1Valid = Array.from(form1.querySelectorAll('input[required]'))
            .every(input => input.value.trim() !== '');

        const isForm2Valid = Array.from(form2.querySelectorAll('input[required], textarea[required]'))
            .every(input => input.value.trim() !== '');

        return isForm1Valid && isForm2Valid;
    }

    async saveFormData() {
        try {
            if (!this.validateForms()) {
                showNotification('Completa tutti i campi obbligatori', 'warning');
                return;
            }

            const formData = this.getFormData();
            const result = await window.electronAPI.saveInfoRaccolta(formData);

            if (result.success) {
                showNotification('Informazioni salvate con successo', 'success');
                // Salva anche in sessionStorage per uso immediato
                sessionStorage.setItem('infoRaccolta', JSON.stringify(formData));
                // Aggiungi attività
                addActivity('Info Raccolta', 'Informazioni raccolta salvate', 'fas fa-save');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Errore nel salvataggio:', error);
            showNotification('Errore nel salvataggio delle informazioni', 'error');
        }
    }

   // Migliora anche questa funzione in info-raccolta.js per una gestione migliore dei valori personalizzati
    populateFormsWithData(data) {
        // Popola Form 1: Caratteristiche Fisiche
        const cf = data.caratteristicheFisiche;
        if (cf) {
            // Funzione per impostare il valore di un campo (standard o personalizzato)
            const setFieldValue = (fieldId, value) => {
                if (!value || value.trim() === "") return;
                
                const select = document.getElementById(fieldId);
                const customInput = document.getElementById(`${fieldId}Custom`);
                const customCheck = document.getElementById(`${fieldId}CustomCheck`);
                
                // Verifica se il valore è presente nelle opzioni predefinite
                let optionExists = false;
                if (select) {
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === value) {
                            optionExists = true;
                            select.value = value;
                            break;
                        }
                    }
                }
                
                // Se il valore non esiste nelle opzioni predefinite, lo trattiamo come personalizzato
                if (!optionExists && customInput && customCheck) {
                    customCheck.checked = true;
                    customInput.value = value;
                    customInput.disabled = false;
                    
                    // Disabilitiamo il select
                    if (select) {
                        select.disabled = true;
                        select.required = false;
                    }
                    
                    // Abilitiamo l'input personalizzato
                    customInput.required = true;
                }
            };
            
            // Imposta i valori dei campi
            setFieldValue('colore', cf.colore);
            setFieldValue('odore', cf.odore);
            setFieldValue('statoFisico', cf.statoFisico);
            
            // Popola gli altri campi normalmente
            ['ph', 'residuo105', 'residuo180', 'residuo600', 'infiammabilita'].forEach(key => {
                const element = document.getElementById(key);
                if (element && cf[key] !== undefined) {
                    element.value = cf[key];
                }
            });
        }

        // Popola Form 2: Informazioni Certificato (invariato)
        const ic = data.infoCertificato;
        if (ic) {
            Object.keys(ic).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    element.value = ic[key];
                }
            });
        }
    }

    resetForms() {
        document.getElementById('caratteristicheFisicheForm').reset();
        document.getElementById('infoCertificatoForm').reset();
        showNotification('Form ripristinati', 'info');
    }
}




//********************************************************************************************* */


// Inizializza il gestore quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.infoRaccoltaManager = new InfoRaccoltaManager();
});