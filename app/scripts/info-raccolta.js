// Gestione dei form della sezione raccolta
class InfoRaccoltaManager {
    constructor() {
        this.initializeDropdowns();
        this.loadSavedData();
    }

    sanitizeCodeEER(codice) {
    if (!codice) return '';
    
    return codice
        .replace(/[\/\\:*?"<>|]/g, '') // Rimuovi caratteri problematici per nomi file
        .replace(/\s+/g, '_') // Sostituisci spazi con underscore
        .trim();
    }


    // Gestione semplificata dei dropdown
    initializeDropdowns() {
        // Array con gli ID dei campi select che hanno un campo personalizzato
        const dropdownFields = ['colore', 'odore', 'statoFisico'];
        
        // Aggiungi event listener a ciascun dropdown
        dropdownFields.forEach(fieldId => {
            const select = document.getElementById(fieldId);
            const customInput = document.getElementById(`${fieldId}Custom`);
            
            if (select && customInput) {
                // Quando cambia il valore del select
                select.addEventListener('change', function() {
                    // Mostra il campo personalizzato solo se è selezionato "Altro"
                    if (this.value === 'Altro') {
                        customInput.style.display = 'block';
                        customInput.required = true;
                    } else {
                        customInput.style.display = 'none';
                        customInput.required = false;
                        customInput.value = ''; // Pulisci il campo se non è selezionato "Altro"
                    }
                });
            }
        });
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

    getFormData() {
        // Funzione per ottenere il valore effettivo di un campo (standard o personalizzato)
        const getFieldValue = (fieldId) => {
            const select = document.getElementById(fieldId);
            const customInput = document.getElementById(`${fieldId}Custom`);
            
            // Se è selezionato "Altro" e il campo personalizzato ha un valore, usa quello
            if (select.value === 'Altro' && customInput && customInput.value.trim() !== "") {
                return customInput.value.trim();
            }
            
            // Altrimenti usa il valore del select
            return select ? select.value : "";
        };

        // Raccoglie i dati dal Form 1: Caratteristiche Fisiche (invariato)
        const caratteristicheFisiche = {
            colore: getFieldValue('colore'),
            odore: getFieldValue('odore'),
            statoFisico: getFieldValue('statoFisico'),
            ph: document.getElementById('ph').value,
            residuo105: document.getElementById('residuo105').value,
            residuo180: document.getElementById('residuo180').value,
            residuo600: document.getElementById('residuo600').value,
            infiammabilita: document.getElementById('infiammabilita').value,
            gasolio: document.getElementById('gasolioCheckbox').checked
        };

        // MODIFICATO: Sanifica il codice EER
        const codiceEERRaw = document.getElementById('codiceEER').value.trim();
        const codiceEERSanificato = this.sanitizeCodeEER(codiceEERRaw);

        // Raccoglie i dati dal Form 2: Informazioni Certificato
        const infoCertificato = {
            rapportoProva: document.getElementById('rapportoProva').value,
            numeroCampionamento: document.getElementById('numeroCampionamento').value.trim(), // OPZIONALE
            descrizione: document.getElementById('descrizione').value,
            dataCampionamento: document.getElementById('dataCampionamento').value,
            dataStampa: document.getElementById('dataStampa').value,
            codiceEER: codiceEERSanificato, // OBBLIGATORIO E SANIFICATO
            codiceEEROriginale: codiceEERRaw, // Mantieni anche l'originale per riferimento
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
    // NUOVO: Validazione specifica per codice EER (sostituisce numero campionamento)
    const codiceEER = document.getElementById('codiceEER').value.trim();
    if (!codiceEER) {
        showNotification('Il codice EER è obbligatorio', 'error');
        document.getElementById('codiceEER').focus();
        return false;
    }

    // NUOVO: Sanificazione caratteri speciali per codice EER
    const caratteriProblematici = /[\/\\:*?"<>|]/g;
    if (caratteriProblematici.test(codiceEER)) {
        showNotification('Il codice EER contiene caratteri non validi. Evitare: / \\ : * ? " < > |', 'error');
        document.getElementById('codiceEER').focus();
        return false;
    }

    // RIMOSSO: La validazione per numero campionamento (ora opzionale)
    // Il numero campionamento rimane nel form ma non è più obbligatorio

    // Valida Form 1 (rimane invariato)
    const form1 = document.getElementById('caratteristicheFisicheForm');
    const form2 = document.getElementById('infoCertificatoForm');

    const isForm1Valid = Array.from(form1.querySelectorAll('input[required], select[required]'))
        .every(input => input.value.trim() !== '');

    const isForm2Valid = Array.from(form2.querySelectorAll('input[required], textarea[required], select[required]'))
        .every(input => input.value.trim() !== '');

    if (!isForm1Valid || !isForm2Valid) {
        showNotification('Completa tutti i campi obbligatori dei form', 'warning');
        return false;
    }

    return true;
}

    async saveFormData() {
        try {
            if (!this.validateForms()) {
                return false;
            }

            const formData = this.getFormData();
            const result = await window.electronAPI.saveInfoRaccolta(formData);

            if (result.success) {
                // Salva anche in sessionStorage per uso immediato
                sessionStorage.setItem('infoRaccolta', JSON.stringify(formData));
                
                // Log per verificare se i dati sono stati salvati correttamente
                console.log('Informazioni raccolta salvate:', formData);
                console.log('Numero campionamento:', formData.infoCertificato.numeroCampionamento);
                console.log('Opzione gasolio:', formData.caratteristicheFisiche.gasolio);
                
                return true;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Errore nel salvataggio form:', error);
            showNotification('Errore nel salvataggio delle informazioni del form', 'error');
            return false;
        }
    }

    populateFormsWithData(data) {
        // Popola Form 1: Caratteristiche Fisiche
        const cf = data.caratteristicheFisiche;
        if (cf) {
            // Array dei campi con possibile valore personalizzato
            const customizableFields = ['colore', 'odore', 'statoFisico'];
            
            customizableFields.forEach(fieldId => {
                const select = document.getElementById(fieldId);
                const customInput = document.getElementById(`${fieldId}Custom`);
                const value = cf[fieldId];
                
                if (!value || !select) return;
                
                // Cerca se il valore esiste nelle opzioni del select
                let optionExists = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === value) {
                        optionExists = true;
                        select.value = value;
                        break;
                    }
                }
                
                // Se il valore non esiste come opzione, trattalo come personalizzato
                if (!optionExists && customInput) {
                    select.value = 'Altro';
                    customInput.value = value;
                    customInput.style.display = 'block';
                }
            });
            
            // Popola gli altri campi normalmente
            ['ph', 'residuo105', 'residuo180', 'residuo600', 'infiammabilita'].forEach(key => {
                const element = document.getElementById(key);
                if (element && cf[key] !== undefined) {
                    element.value = cf[key];
                }
            });
            
            // Imposta la checkbox per gasolio
            const gasolioCheckbox = document.getElementById('gasolioCheckbox');
            if (gasolioCheckbox && cf.gasolio !== undefined) {
                gasolioCheckbox.checked = cf.gasolio;
            }
        }

        // Popola Form 2: Informazioni Certificato (AGGIORNATO per includere numeroCampionamento)
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
        
        // Reimposta anche la checkbox gasolio
        const gasolioCheckbox = document.getElementById('gasolioCheckbox');
        if (gasolioCheckbox) {
            gasolioCheckbox.checked = false;
        }
        
        // Nascondi tutti i campi personalizzati al reset
        ['colore', 'odore', 'statoFisico'].forEach(fieldId => {
            const customInput = document.getElementById(`${fieldId}Custom`);
            if (customInput) {
                customInput.style.display = 'none';
                customInput.required = false;
            }
        });
        
        showNotification('Form ripristinati', 'info');
    }
}

// Inizializza il gestore quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.infoRaccoltaManager = new InfoRaccoltaManager();
});