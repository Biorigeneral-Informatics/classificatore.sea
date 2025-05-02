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

 // Nuovo metodo per gestire i dropdown con opzione EDITABILE
 initializeEditableDropdowns() {
    ['colore', 'odore', 'statoFisico'].forEach(fieldId => {
        const select = document.getElementById(fieldId);
        
        if (select) {
            select.addEventListener('change', function() {
                if (this.value === 'EDITABILE') {
                    // Quando si seleziona "EDITABILE", chiedi il valore all'utente
                    const customValue = prompt(`Inserisci il valore personalizzato per ${fieldId}:`);
                    if (customValue && customValue.trim() !== '') {
                        // Crea una nuova opzione per questo valore
                        const newOption = document.createElement('option');
                        newOption.value = customValue;
                        newOption.textContent = customValue;
                        
                        // Inserisci prima dell'opzione EDITABILE
                        const editableOption = this.querySelector('option[value="EDITABILE"]');
                        this.insertBefore(newOption, editableOption);
                        
                        // Seleziona la nuova opzione
                        this.value = customValue;
                    } else {
                        // Se l'utente annulla o inserisce un valore vuoto, torna a "Seleziona..."
                        this.value = '';
                    }
                }
            });
        }
    });
    }

    getFormData() {
        // Raccoglie i dati dal Form 1: Caratteristiche Fisiche (versione aggiornata)
        const caratteristicheFisiche = {
            colore: document.getElementById('colore').value,
            odore: document.getElementById('odore').value,
            statoFisico: document.getElementById('statoFisico').value,
            ph: document.getElementById('ph').value,
            residuo105: document.getElementById('residuo105').value,
            residuo180: document.getElementById('residuo180').value,
            residuo600: document.getElementById('residuo600').value,
            infiammabilita: document.getElementById('infiammabilita').value
            // Rimossi i campi non più necessari
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

    populateFormsWithData(data) {
        // Popola Form 1: Caratteristiche Fisiche (versione aggiornata)
        const cf = data.caratteristicheFisiche;
        if (cf) {
            // Popola i dropdown con opzione EDITABILE
            ['colore', 'odore', 'statoFisico'].forEach(fieldId => {
                const select = document.getElementById(fieldId);
                const value = cf[fieldId];
                
                if (select && value) {
                    // Verifica se il valore è presente nelle opzioni predefinite
                    let optionExists = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === value) {
                            optionExists = true;
                            break;
                        }
                    }
                    
                    // Se il valore non esiste, crea una nuova opzione personalizzata
                    if (!optionExists && value !== '') {
                        const newOption = document.createElement('option');
                        newOption.value = value;
                        newOption.textContent = value;
                        
                        // Inserisci prima dell'opzione EDITABILE
                        const editableOption = select.querySelector('option[value="EDITABILE"]');
                        if (editableOption) {
                            select.insertBefore(newOption, editableOption);
                        } else {
                            select.add(newOption);
                        }
                    }
                    
                    // Imposta il valore selezionato
                    select.value = value;
                }
            });
            
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