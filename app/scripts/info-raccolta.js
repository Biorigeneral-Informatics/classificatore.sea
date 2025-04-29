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
        // Raccoglie i dati dal Form 1: Caratteristiche Fisiche
        const caratteristicheFisiche = {
            colore: document.getElementById('colore').value,
            odore: document.getElementById('odore').value,
            statoFisico: document.getElementById('statoFisico').value,
            ph: document.getElementById('ph').value,
            residuo105: document.getElementById('residuo105').value,
            residuo180: document.getElementById('residuo180').value,
            residuo600: document.getElementById('residuo600').value,
            infiammabilita: document.getElementById('infiammabilita').value,
            grammiCOver10: document.getElementById('grammiCOver10').value,
            grammiCUnder10: document.getElementById('grammiCUnder10').value,
            idroPolicicicli: document.getElementById('idroPolicicicli').value,
            grammiIPA: document.getElementById('grammiIPA').value
        };

        // Raccoglie i dati dal Form 2: Informazioni Certificato
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
        // Popola Form 1: Caratteristiche Fisiche
        const cf = data.caratteristicheFisiche;
        if (cf) {
            Object.keys(cf).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    element.value = cf[key];
                }
            });
        }

        // Popola Form 2: Informazioni Certificato
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

// Inizializza il gestore quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.infoRaccoltaManager = new InfoRaccoltaManager();
});