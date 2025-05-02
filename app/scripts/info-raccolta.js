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
    initializeEditableDropdowns() {
        ['colore', 'odore', 'statoFisico'].forEach(fieldId => {
            const select = document.getElementById(fieldId);
            
            // Crea un campo di testo editabile
            const customInputContainer = document.createElement('div');
            customInputContainer.className = 'custom-input-container';
            customInputContainer.style.display = 'none'; // Nascosto inizialmente
            customInputContainer.style.marginTop = '0.5rem';
            
            const customInput = document.createElement('input');
            customInput.type = 'text';
            customInput.id = `${fieldId}Custom`;
            customInput.className = 'form-control custom-field-input';
            customInput.placeholder = `Inserisci ${fieldId} personalizzato`;
            
            customInputContainer.appendChild(customInput);
            
            // Inserisci il container dopo il select
            if (select) {
                select.parentNode.appendChild(customInputContainer);
                
                // Aggiungi event listener per il select
                select.addEventListener('change', function() {
                    if (this.value === 'EDITABILE') {
                        // Mostra il campo personalizzato
                        customInputContainer.style.display = 'block';
                        customInput.focus();
                    } else {
                        // Nascondi il campo personalizzato
                        customInputContainer.style.display = 'none';
                    }
                });
                
                // Aggiungi event listener per il tasto Enter e per la perdita di focus
                customInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCustomValue(select, customInput, customInputContainer);
                    }
                });
                
                customInput.addEventListener('blur', function() {
                    applyCustomValue(select, customInput, customInputContainer);
                });
            }
        });
        
        // Funzione per applicare il valore personalizzato
        function applyCustomValue(select, input, container) {
            const customValue = input.value.trim();
            if (customValue !== '') {
                // Crea una nuova opzione per questo valore
                const newOption = document.createElement('option');
                newOption.value = customValue;
                newOption.textContent = customValue;
                
                // Inserisci prima dell'opzione EDITABILE
                const editableOption = select.querySelector('option[value="EDITABILE"]');
                select.insertBefore(newOption, editableOption);
                
                // Seleziona la nuova opzione
                select.value = customValue;
                
                // Nascondi il campo personalizzato
                container.style.display = 'none';
            }
        }
    } //Fine initializeEditableDropdowns


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

   // Migliora anche questa funzione in info-raccolta.js per una gestione migliore dei valori personalizzati
   populateFormsWithData(data) {
    // Popola Form 1: Caratteristiche Fisiche (versione aggiornata)
    const cf = data.caratteristicheFisiche;
    if (cf) {
        // Popola i dropdown con opzione EDITABILE
        ['colore', 'odore', 'statoFisico'].forEach(fieldId => {
            const select = document.getElementById(fieldId);
            const value = cf[fieldId];
            
            if (select && value && value.trim() !== '') {
                // Verifica se il valore è presente nelle opzioni predefinite
                let optionExists = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                
                // Se il valore non esiste, crea una nuova opzione personalizzata
                if (!optionExists) {
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
                
                // Imposta il valore selezionato (dopo aver eventualmente aggiunto l'opzione)
                select.value = value;
                
                // Nascondi eventuali campi personalizzati aperti
                const customInputContainer = select.parentNode.querySelector('.custom-input-container');
                if (customInputContainer) {
                    customInputContainer.style.display = 'none';
                }
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