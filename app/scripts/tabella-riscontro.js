//-----------------------------------------------------------------------------------------

// Funzioni per la sezione Tabella di Riscontro
// Funzione per gestire i pulsanti di modifica sali

//-----------NOTA IMPORTANTE-----------//
// Con l'inizializzazione inizia

// Inizializzazione della sezione Tabella di Riscontro

function initTabellaRiscontro() {
    // Inizializza le tab e i form
    initSubsectionTabs();
    initFormTabs();
    
    // Verifica se ci sono risultati di confronto ECHA da visualizzare
    const hasComparisonResults = localStorage.getItem('echaComparisonResults');
    console.log("Check risultati confronto ECHA:", hasComparisonResults ? "trovati" : "non trovati");
    
    // Inizializza le tab e i form
    initSubsectionTabs();
    initFormTabs();
    
    // Se ci sono risultati di confronto, caricali invece del confronto standard
    if (hasComparisonResults) {
        console.log("Trovati risultati confronto ECHA, caricamento...");
        setTimeout(() => loadEchaComparisonResults(), 100);
    } else {
        // Carica dati per le varie sottosezioni
        loadConfronto();
    }
    
    // Il resto della funzione rimane uguale
    loadTabellaRiscontroSali();
    loadTabellaRiscontroSostanze();
    loadTabellaRiscontroFrasiH();
    loadTabellaRiscontroFrasiEUH();
    
      // Carica le sostanze nel select per inserimento sostanze (form sostanze)
    loadSostanzeSelect();
    loadCategorieSelect();

     // Carica i metalli nel select per inserimento sali (form sali)
    loadMetalliSelect();
    
    // Inizializza tutti gli event handlers
    setupFormHandlers();
    setupSaliEditButtons();
    setupSostanzeEventListeners();
    setupFrasiHEventListeners();
    setupFrasiEUHEventListeners(); // Assicurati che questa funzione venga chiamata
    inizializzaFormFrasiHSale();
    inserisciNuovaFraseEUH();

    // Inizializza la ricerca per la tabella di confronto
    setupConfrontoSearch();
    
    // Aggiungi event listener per il pulsante di completamento modifiche
    const completaModificheBtn = document.getElementById('completaModificheBtn');
    if (completaModificheBtn) {
        // Rimuovi eventuali listener precedenti per evitare duplicati
        const newBtn = completaModificheBtn.cloneNode(true);
        completaModificheBtn.parentNode.replaceChild(newBtn, completaModificheBtn);
        newBtn.addEventListener('click', completaModifiche);
    }
    
    // Mostra notifica
    console.log("Inizializzazione Tabella di Riscontro completata");
}






//------------------------------------------------------------------//
//---------VARIABILI GLOBALI----------------------------------------//
//------------------------------------------------------------------//

// Variabili globali per tenere traccia dello stato
let saliOriginali = [];
let saliModificati = [];
let saliInEditMode = false;

let sostanzeOriginali = [];
let sostanzeModificate = [];
let sostanzeInEditMode = false;

let frasiHOriginali = [];
let frasiHModificate = [];
let frasiHInEditMode = false;

let frasiEUHOriginali = [];
let frasiEUHModificate = [];
let frasiEUHInEditMode = false;





//-----------------------------------//
//------------ FUNZIONI ------------//
//-----------------------------------//

// Mappatura completa tra frasi H e Hazard Class corrispondenti
// Basata sul documento ufficiale delle caratteristiche di pericolo
const frasiHToHazardClass = {
    // HP1 - Esplosivo
    "H200": ["Unst. Expl."],
    "H201": ["Expl. 1.1"],
    "H202": ["Expl. 1.2"],
    "H203": ["Expl. 1.3"],
    "H204": ["Expl. 1.4"],
    "H205": ["Expl. 1.5"],
    "H240": ["Self-react. A", "Org. Perox. A"],
    "H241": ["Self-react. B", "Org. Perox. B"],
    // HP2 - Comburente
    "H270": ["Ox. Gas 1"],
    "H271": ["Ox. Liq. 1", "Ox. Sol. 1"],
    "H272": ["Ox. Liq. 2", "Ox. Liq. 3", "Ox. Sol. 2", "Ox. Sol. 3"],
    // HP3 - Infiammabile
    "H220": ["Flam. Gas 1"],
    "H221": ["Flam. Gas 2"],
    "H222": ["Aerosol 1"],
    "H223": ["Aerosol 2"],
    "H224": ["Flam. Liq. 1"],
    "H225": ["Flam. Liq. 2"],
    "H226": ["Flam. Liq. 3"],
    "H228": ["Flam. Sol. 1", "Flam. Sol. 2"],
    "H229": ["Aerosol 3"],
    "H230": ["Flam. Gas 1A"],
    "H231": ["Flam. Gas 1B"],
    "H232": ["Flam. Gas 1C"],
    "H242": ["Self-react. CD", "Self-react. EF", "Org. Perox. CD", "Org. Perox. EF"],
    "H250": ["Pyr. Liq. 1", "Pyr. Sol. 1"],
    "H251": ["Self-heat. 1"],
    "H252": ["Self-heat. 2"],
    "H260": ["Water-react. 1"],
    "H261": ["Water-react. 2", "Water-react. 3"],
    // HP4 - Irritante (corrette le nomenclature)
    "H314": ["Skin Corr. 1A", "Skin Corr. 1B", "Skin Corr. 1C"],
    "H315": ["Skin Irrit. 2"],
    "H316": ["Skin Irrit. 3"],
    "H317": ["Skin Sens. 1"],
    "H318": ["Eye Dam. 1"],
    "H319": ["Eye Irrit. 2"],
    "H320": ["Eye Irrit. 3"],
    // HP5 - Tossicità specifica per organi bersaglio
    "H335": ["STOT SE 3"],
    "H336": ["STOT SE 3"],
    "H370": ["STOT SE 1"],
    "H371": ["STOT SE 2"],
    "H372": ["STOT RE 1"],
    "H373": ["STOT RE 2"],
    "H304": ["Asp. Tox. 1"],
    // HP6 - Tossicità acuta
    "H300": ["Acute Tox. 1", "Acute Tox. 2"],
    "H301": ["Acute Tox. 3"],
    "H302": ["Acute Tox. 4"],
    "H310": ["Acute Tox. 1", "Acute Tox. 2"],
    "H311": ["Acute Tox. 3"],
    "H312": ["Acute Tox. 4"],
    "H330": ["Acute Tox. 1", "Acute Tox. 2"],
    "H331": ["Acute Tox. 3"],
    "H332": ["Acute Tox. 4"],
    // HP7 - Cancerogeno
    "H350": ["Carc. 1A", "Carc. 1B"],
    "H351": ["Carc. 2"],
    // HP8 - Corrosivo (stesso di HP4 per H314, ma soglie diverse)
    // H314 già definito sopra
    // HP9 - Infettivo (non usato in CLP)
    // HP10 - Tossico per la riproduzione
    "H360": ["Repr. 1A", "Repr. 1B"],
    "H361": ["Repr. 2"],
    "H362": ["Lact."],
    // HP11 - Mutageno
    "H340": ["Muta. 1A", "Muta. 1B"],
    "H341": ["Muta. 2"],
    // HP12 - Liberazione gas tossico (non usato in CLP)
    // HP13 - Sensibilizzante
    "H334": ["Resp. Sens. 1"],
    // HP14 - Ecotossico
    "H400": ["Aquatic Acute 1"],
    "H410": ["Aquatic Chronic 1"],
    "H411": ["Aquatic Chronic 2"],
    "H412": ["Aquatic Chronic 3"],
    "H413": ["Aquatic Chronic 4"],
    "H420": ["Ozone 1"],
    // HP15 - Potenziale sviluppo di caratteristiche di pericolo
    // H205 già definito sopra
    // Nuove frasi H aggiunte (totale 17 nuove)
    "H221A": ["Flam. Gas 2A"],
    "H221B": ["Flam. Gas 2B"],
    "H222A": ["Aerosol 1A"],
    "H222B": ["Aerosol 1B"],
    "H223A": ["Aerosol 2A"],
    "H223B": ["Aerosol 2B"],
    "H224A": ["Flam. Liq. 1A"],
    "H224B": ["Flam. Liq. 1B"],
    "H225A": ["Flam. Liq. 2A"],
    "H225B": ["Flam. Liq. 2B"],
    "H226A": ["Flam. Liq. 3A"],
    "H226B": ["Flam. Liq. 3B"],
    "H228A": ["Flam. Sol. 1A"],
    "H228B": ["Flam. Sol. 1B"],
    "H228C": ["Flam. Sol. 2A"],
    "H228D": ["Flam. Sol. 2B"],
    "H229A": ["Aerosol 3A"],
    "H229B": ["Aerosol 3B"]
};

// Lista aggiornata di frasi H valide (tutte quelle supportate dal classificatore)
const frasiHValide = [
    // HP1 - Esplosivo
    "H200", "H201", "H202", "H203", "H204", "H240", "H241",
    // HP2 - Comburente
    "H270", "H271", "H272",
    // HP3 - Infiammabile
    "H220", "H221", "H222", "H223", "H224", "H225", "H226", "H228", "H229", "H230", "H231", "H232", "H242", "H250", "H251", "H252", "H260", "H261",
    // HP4 - Irritante
    "H314", "H315", "H318", "H319",
    // HP5 - Tossicità specifica per organi bersaglio
    "H335", "H336", "H370", "H371", "H372", "H373", "H304",
    // HP6 - Tossicità acuta
    "H300", "H301", "H302", "H310", "H311", "H312", "H330", "H331", "H332",
    // HP7 - Cancerogeno
    "H350", "H351",
    // HP8 - Corrosivo (stesso di HP4 per H314, ma soglie diverse)
    // H314 già definito sopra
    // HP9 - Infettivo (non usato in CLP)
    // HP10 - Tossico per la riproduzione
    "H360", "H361", "H362",
    // HP11 - Mutageno
    "H340", "H341",
    // HP12 - Liberazione gas tossico (non usato in CLP)
    // HP13 - Sensibilizzante
    "H317", "H334",
    // HP14 - Ecotossico
    "H400", "H410", "H411", "H412", "H413", "H420",
    // HP15 - Potenziale sviluppo di caratteristiche di pericolo
    "H205",
    // Nuove frasi H aggiunte
    "H221A", "H221B", "H222A", "H222B", "H223A", "H223B", "H224A", "H224B", "H225A", "H225B", "H226A", "H226B", "H228A", "H228B", "H228C", "H228D", "H229A", "H229B"
];

// Funzione per aggiornare le opzioni del menu a tendina dell'Hazard Class
// MODIFICATO: ora non mostra errori durante l'input
function updateHazardClassOptions(fraseHInput, showErrors = false) {
    const fraseH = fraseHInput.value.trim();
    const row = fraseHInput.closest('.frase-h-row');
    if (!row) return;
    
    const hazardClassSelect = row.querySelector('.hazard-class-select');
    if (!hazardClassSelect) return;
    
    // Rimuovi eventuali errori precedenti se non stiamo mostrando errori
    if (!showErrors) {
        fraseHInput.classList.remove('input-error');
        const errorMsg = row.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    }
    
    // IMPORTANTE: Assicurati che il select sia sempre cliccabile
    hazardClassSelect.style.pointerEvents = 'auto';
    hazardClassSelect.style.position = 'relative';
    hazardClassSelect.style.zIndex = '1000';
    
    // Abilita/disabilita il select di Hazard Class in base alla presenza di una frase H valida
    const isValidPhrase = fraseH && frasiHValide.includes(fraseH);
    hazardClassSelect.disabled = !isValidPhrase;
    
    // Reset delle opzioni
    hazardClassSelect.innerHTML = '';
    
    // Opzione vuota predefinita
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    
    if (!fraseH) {
        defaultOption.textContent = 'Seleziona prima una frase H';
    } else if (!frasiHValide.includes(fraseH)) {
        defaultOption.textContent = 'Frase H non valida';
        
        // Mostra l'errore solo se richiesto (durante la validazione)
        if (showErrors) {
            // Evidenzia l'errore nella frase H
            fraseHInput.classList.add('input-error');
            
            // Aggiungi messaggio di errore se non esiste già
            if (!row.querySelector('.error-message')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = 'Errore frase H non gestita nel classificatore. Contattare il supporto.';
                fraseHInput.parentNode.appendChild(errorDiv);
            }
        }
    } else {
        // Frase H valida
        defaultOption.textContent = 'Seleziona un Hazard Class';
        
        // Assicurati che il select sia completamente abilitato
        hazardClassSelect.disabled = false;
        hazardClassSelect.style.opacity = '1';
        hazardClassSelect.style.cursor = 'pointer';
    }
    
    hazardClassSelect.appendChild(defaultOption);
    
    // Se c'è una frase H valida, popola le opzioni di Hazard Class
    if (fraseH && frasiHToHazardClass[fraseH]) {
        frasiHToHazardClass[fraseH].forEach(hazardClass => {
            const option = document.createElement('option');
            option.value = hazardClass;
            option.textContent = hazardClass;
            hazardClassSelect.appendChild(option);
        });
        
        // Forza il refresh del select per assicurare che sia funzionante
        hazardClassSelect.style.display = 'none';
        hazardClassSelect.offsetHeight; // Trigger reflow
        hazardClassSelect.style.display = 'block';
    }
    
    return frasiHValide.includes(fraseH);
}

// Funzione per validare tutte le frasi H e mostrare errori
function validaFrasiH() {
    let tutteValide = true;
    let fraseHSenzaHazardClass = false;
    
    // Controlla tutte le frasi H
    document.querySelectorAll('.frase-h-row').forEach(row => {
        const fraseHInput = row.querySelector('.frase-h-input');
        const hazardClassSelect = row.querySelector('.hazard-class-select');
        
        if (!fraseHInput || !hazardClassSelect) return;
        
        const fraseH = fraseHInput.value.trim();
        const hazardClass = hazardClassSelect.value.trim();
        
        // Se la frase H è compilata ma non è valida, segna come errore
        if (fraseH && !frasiHValide.includes(fraseH)) {
            tutteValide = false;
            // Aggiorna le opzioni mostrando gli errori
            updateHazardClassOptions(fraseHInput, true);
        } 
        // Se la frase H è valida ma manca l'Hazard Class
        else if (fraseH && frasiHValide.includes(fraseH) && !hazardClass) {
            fraseHSenzaHazardClass = true;
            hazardClassSelect.classList.add('input-error');
            
            // Aggiungi messaggio di errore sotto il select se non esiste già
            if (!row.querySelector('.hazard-error-message')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message hazard-error-message';
                errorDiv.textContent = 'Seleziona un Hazard Class per questa frase H';
                hazardClassSelect.parentNode.appendChild(errorDiv);
            }
        }
    });
    
    return { tutteValide, fraseHSenzaHazardClass };
}




// Carica i risultati del confronto ECHA nella sezione Aggiornamenti
function loadEchaComparisonResults() {
    console.log("Tentativo di caricamento risultati confronto ECHA...");
    
    try {
        // Recupera i risultati del confronto da localStorage
        const comparisonResultsStr = localStorage.getItem('echaComparisonResults');
        
        if (!comparisonResultsStr) {
            console.log("Nessun risultato di confronto ECHA trovato in localStorage");
            return;
        }
        
        const comparisonResults = JSON.parse(comparisonResultsStr);
        console.log("Dati di confronto ECHA trovati:", comparisonResults);
        
        // Assicurati che siamo nella sezione tabella-di-riscontro
        const tabRiscontroSection = document.getElementById('tabella-di-riscontro');
        if (!tabRiscontroSection || !tabRiscontroSection.classList.contains('active')) {
            console.log("Non siamo nella sezione tabella-di-riscontro");
            return;
        }
        
        // Assicurati che siamo nella tab "aggiornamenti"
        const aggiornamenti = document.getElementById('aggiornamenti');
        if (!aggiornamenti || !aggiornamenti.classList.contains('active')) {
            console.log("Non siamo nella tab aggiornamenti, attiviamola");
            // Trova e clicca sulla tab "aggiornamenti"
            const aggiornTab = document.querySelector('.tab-item[data-tab="aggiornamenti"]');
            if (aggiornTab) {
                aggiornTab.click();
            } else {
                console.error("Tab aggiornamenti non trovata");
                return;
            }
        }
        
        // Crea il container per il riepilogo se non esiste
        let summaryDiv = document.getElementById('echa-comparison-summary');
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = 'echa-comparison-summary';
            summaryDiv.className = 'echa-summary';
            // Aggiungi il div di riepilogo prima della tabella
            const dataTable = document.querySelector('#aggiornamenti .data-table');
            if (dataTable) {
                dataTable.insertBefore(summaryDiv, dataTable.firstChild);
            }
        }
        
        // Ottieni il container per la tabella di confronto
        let confrontoTable = document.getElementById('confrontoTable');
        let confrontoTableBody = document.getElementById('confrontoTableBody');
        
        if (!confrontoTable || !confrontoTableBody) {
            console.log("Elementi tabella non trovati, creo la struttura");
            ensureConfrontoUIStructure();
            
            confrontoTable = document.getElementById('confrontoTable');
            confrontoTableBody = document.getElementById('confrontoTableBody');
            
            if (!confrontoTable || !confrontoTableBody) {
                console.error("Impossibile creare la struttura della tabella");
                return;
            }
        }
        
        // Modifica l'intestazione della tabella per usare la nuova struttura
        const tableHeaders = confrontoTable.querySelector('thead tr');
        if (tableHeaders) {
            tableHeaders.innerHTML = `
                <th>Sostanza</th>
                <th>CAS</th>
                <th>Valori Modificati</th>
                <th>Stato</th>
                <!-- <th>Azioni</th> -->
            `;
        }
        
        // Aggiorna la descrizione
        const description = document.querySelector('#aggiornamenti .subsection-description');
        if (description) {
            const timestamp = localStorage.getItem('echaComparisonTimestamp');
            description.textContent = `Confronto ECHA effettuato il ${timestamp ? new Date(timestamp).toLocaleString('it-IT') : 'data sconosciuta'}`;
        }
        
        // Aggiorna intestazione
        const heading = document.querySelector('#aggiornamenti .data-table h3');
        if (heading) {
            heading.textContent = 'Confronto Database ECHA';
        }
        
        // Svuota la tabella
        confrontoTableBody.innerHTML = '';
        
        // Estrai i dati
        const added = comparisonResults.added || [];
        const removed = comparisonResults.removed || [];
        const modified = comparisonResults.modified || [];
        
        // Nascondi eventuali altre tabelle o container
        const modificatiContainer = document.getElementById('modificatiContainer');
        if (modificatiContainer) {
            modificatiContainer.style.display = 'none';
        }
        
        // Crea un riepilogo
        let summaryHtml = `
            <div class="echa-summary">
                <p><strong>Risultati del confronto ECHA:</strong></p>
                <ul>
                    <li><span class="badge badge-success">${added.length}</span> sostanze aggiunte</li>
                    <li><span class="badge badge-warning">${modified.length}</span> sostanze modificate</li>
                    <li><span class="badge badge-danger">${removed.length}</span> sostanze rimosse</li>
                </ul>
            </div>
        `;
        
        // Mostra il div di riepilogo
        summaryDiv.style.display = 'block';
        summaryDiv.innerHTML = summaryHtml;
        
        // Verifica se ci sono cambiamenti
        if (added.length === 0 && removed.length === 0 && modified.length === 0) {
            confrontoTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-table-message">
                        <div class="no-changes-message">
                            <i class="fas fa-check-circle"></i>
                            <p>Non ci sono cambiamenti nel nuovo file ECHA</p>
                        </div>
                    </td>
                </tr>
            `;
            console.log("Nessun cambiamento rilevato nella comparazione ECHA");
            return;
        }
        
        // Aggiungi le sostanze aggiunte
        added.forEach(substance => {
            const row = document.createElement('tr');
            row.className = 'added';
            row.innerHTML = `
                <td>${substance.name || ''}</td>
                <td>${substance.cas || ''}</td>
                <td>${substance.hazard || 'N/A'}</td>
                <td><span class="badge badge-success">Aggiunta</span></td>
                <!-- 
                <td>
                    <button class="btn btn-sm btn-primary import-btn" data-cas="${substance.cas}" data-type="added">
                        <i class="fas fa-plus"></i> Importa
                    </button>
                </td>
                -->
            `;
            confrontoTableBody.appendChild(row);
        });
        
        // Aggiungi le sostanze rimosse
        removed.forEach(substance => {
            const row = document.createElement('tr');
            row.className = 'removed';
            row.innerHTML = `
                <td>${substance.name || ''}</td>
                <td>${substance.cas || ''}</td>
                <td>${substance.hazard || 'N/A'}</td>
                <td><span class="badge badge-danger">Rimossa</span></td>
                <!-- 
                <td>
                    <button class="btn btn-sm btn-secondary ignore-btn" data-cas="${substance.cas}" data-type="removed">
                        <i class="fas fa-eye-slash"></i> Ignora
                    </button>
                </td>
                -->
            `;
            confrontoTableBody.appendChild(row);
        });
        
        // Aggiungi le sostanze modificate
        modified.forEach(substance => {
            // Prepara il testo per la colonna "Valori Modificati"
            let valoriModificatiText = '';
            
            if (substance.modifiche && substance.modifiche.length > 0) {
                // Se abbiamo dettagli sulle modifiche, mostriamo quelle
                valoriModificatiText = substance.modifiche.map(modifica => 
                    `${modifica.campo}: ${modifica.vecchio} → ${modifica.nuovo}`
                ).join('<br>');
            } else {
                // Altrimenti, mostriamo hazard old → new
                valoriModificatiText = `Hazard: ${substance.old_hazard || 'N/A'} → ${substance.new_hazard || 'N/A'}`;
            }
            
            const row = document.createElement('tr');
            row.className = 'modified';
            row.innerHTML = `
                <td>${substance.name || ''}</td>
                <td>${substance.cas || ''}</td>
                <td>${valoriModificatiText}</td>
                <td><span class="badge badge-warning">Modificata</span></td>
                <!-- 
                <td>
                    <button class="btn btn-sm btn-primary update-btn" data-cas="${substance.cas}" data-type="modified">
                        <i class="fas fa-sync"></i> Aggiorna
                    </button>
                </td>
                -->
            `;
            confrontoTableBody.appendChild(row);
        });
        
        // Aggiungi event listeners ai pulsanti - commentato ma mantenuto per riferimento futuro
        /*
        confrontoTableBody.querySelectorAll('.import-btn, .update-btn').forEach(btn => {
            btn.addEventListener('click', handleEchaUpdateAction);
        });
        
        confrontoTableBody.querySelectorAll('.ignore-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Nascondi la riga
                this.closest('tr').style.display = 'none';
                showNotification('Sostanza ignorata');
            });
        });
        */
        
        console.log("Visualizzazione dati confronto ECHA completata");
        
        // Mostra notifica di completamento
        showNotification(`Visualizzazione confronto ECHA: ${added.length} aggiunte, ${modified.length} modificate, ${removed.length} rimosse`);
        
    } catch (error) {
        console.error('Errore nel caricamento dei risultati del confronto ECHA:', error);
        showNotification('Errore nel caricamento dei risultati del confronto: ' + error.message, 'error');
    }
}

// Gestisce le azioni di aggiornamento/importazione per ECHA
async function handleEchaUpdateAction(event) {
    try {
        const button = event.currentTarget;
        const cas = button.getAttribute('data-cas');
        const type = button.getAttribute('data-type');
        
        // Cambia lo stato del pulsante
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> In corso...';
        
        // Ottieni i dati dalla riga
        const row = button.closest('tr');
        const name = row.cells[0].textContent.trim();
        let hazard = '';
        
        if (type === 'added') {
            hazard = row.cells[3].textContent.trim();
        } else if (type === 'modified') {
            hazard = row.cells[3].textContent.trim();
        }
        
        console.log(`Aggiornamento ${type} per ${name} (${cas}) con hazard ${hazard}`);
        
        // Esegui l'azione appropriata
        if (type === 'added') {
            // Importa nuova sostanza
            await window.electronAPI.executeSQLite(
                'INSERT INTO sostanze (Nome, CAS, Categoria) VALUES (?, ?, ?)',
                [name, cas, 'Importato da ECHA']
            );
            
            // Aggiungi frasi H se presenti
            if (hazard && hazard !== 'N/A') {
                const hazardParts = hazard.split(',').map(h => h.trim()).filter(h => h);
                
                for (const h of hazardParts) {
                    await window.electronAPI.executeSQLite(
                        'INSERT INTO "frasi H" (Nome_sostanza, CAS, Hazard_Statement, Hazard_Class_and_Category) VALUES (?, ?, ?, ?)',
                        [name, cas, h, '']
                    );
                }
            }
            
            showNotification(`Sostanza "${name}" importata con successo`);
        } else if (type === 'modified') {
            // Aggiorna frasi H
            // Prima elimina le esistenti
            await window.electronAPI.executeSQLite(
                'DELETE FROM "frasi H" WHERE CAS = ?',
                [cas]
            );
            
            // Poi inserisci le nuove
            if (hazard && hazard !== 'N/A') {
                const hazardParts = hazard.split(',').map(h => h.trim()).filter(h => h);
                
                for (const h of hazardParts) {
                    await window.electronAPI.executeSQLite(
                        'INSERT INTO "frasi H" (Nome_sostanza, CAS, Hazard_Statement, Hazard_Class_and_Category) VALUES (?, ?, ?, ?)',
                        [name, cas, h, '']
                    );
                }
            }
            
            showNotification(`Frasi H per "${name}" aggiornate con successo`);
        }
        
        // Aggiorna lo stato del pulsante
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check"></i> Completato';
        button.className = 'btn btn-sm btn-success';
        
        // Aggiungi classe per indicare che è stato elaborato
        row.classList.add('processed');
        
    } catch (error) {
        console.error('Errore nell\'azione di aggiornamento ECHA:', error);
        showNotification('Errore: ' + error.message, 'error');
        
        // Ripristina il pulsante
        const button = event.currentTarget;
        button.disabled = false;
        
        if (button.getAttribute('data-type') === 'added') {
            button.innerHTML = '<i class="fas fa-plus"></i> Importa';
        } else {
            button.innerHTML = '<i class="fas fa-sync"></i> Aggiorna';
        }
    }
}

// Assicurati che esista la struttura UI per i risultati del confronto
function ensureComparisonUIStructure() {
    // Implementa questa funzione simile a ensureConfrontoUIStructure
    // ma adattata specificamente per i risultati del confronto ECHA
    // ...
}



function setupSaliEditButtons() {
    // Aggiungi event listener al pulsante di salvataggio globale (lo manteniamo per compatibilità)
    const salvaSaliBtn = document.getElementById('salvaSaliBtn');
    if (salvaSaliBtn) {
        // Rimuovi eventuali event listener precedenti per evitare duplicati
        const newSalvaSaliBtn = salvaSaliBtn.cloneNode(true);
        salvaSaliBtn.parentNode.replaceChild(newSalvaSaliBtn, salvaSaliBtn);
        newSalvaSaliBtn.addEventListener('click', salvaSaliModificati);
        console.log('Event listener aggiunto al bottone Salva Modifiche globale');
    }
    
    // Aggiungi event listener per intercettare ESC e annullare modifiche
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && saliInEditMode) {
            annullaSaliModificati();
        }
    });
    
    // Aggiungi event listener per gestire il click sui bottoni di salvataggio inline
    // Questo viene fatto dinamicamente quando si crea la riga
}

// Aggiungi questa funzione per la gestione del form di inserimento frasi EUH
function aggiungiCampoFraseEUH() {
    const container = document.getElementById('frasiEUHContainer');
    const row = document.createElement('div');
    row.className = 'frase-euh-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Frase EUH</label>
            <input type="text" class="form-control frase-euh-input" placeholder="Frase EUH (es. EUH029)">
        </div>
        <button type="button" class="btn btn-sm btn-danger remove-frase-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}

// Inizializza le tab delle sottosezioni
function initSubsectionTabs() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', function() {
            // Rimuovi classe active da tutte le tab
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Nascondi tutte le sottosezioni
            document.querySelectorAll('.subsection').forEach(section => section.classList.remove('active'));
            
            // Mostra la sottosezione corrispondente
            const tabId = this.getAttribute('data-tab');
            const targetSection = document.getElementById(tabId);
            if (targetSection) {
                targetSection.classList.add('active');
            } else {
                console.warn(`Sottosezione con ID ${tabId} non trovata`);
            }
        });
    });
}

// Inizializza le tab dei form
function initFormTabs() {
    document.querySelectorAll('.form-tab-item').forEach(tab => {
        tab.addEventListener('click', function() {
            // Rimuovi classe active da tutte le tab
            document.querySelectorAll('.form-tab-item').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Nascondi tutti i pannelli
            document.querySelectorAll('.form-panel').forEach(panel => panel.classList.remove('active'));
            
            // Mostra il pannello corrispondente
            const formId = this.getAttribute('data-form');
            const targetPanel = document.getElementById(formId + 'Form');
            if (targetPanel) {
                targetPanel.classList.add('active');
            } else {
                console.warn(`Pannello del form con ID ${formId}Form non trovato`);
            }
        });
    });
}






// Carica i dati per la tabella di confronto
// Verifica se ci sono risultati di confronto ECHA da visualizzare
async function loadConfronto() {
    try {
        // Controlla se esistono risultati di confronto ECHA
        const comparisonResultsStr = localStorage.getItem('echaComparisonResults');
        
        if (comparisonResultsStr) {
            // Se ci sono risultati di confronto, usa quelli
            console.log("Trovati risultati di confronto ECHA, caricamento...");
            loadEchaComparisonResults();
            return;
        }
        
        // Se non ci sono risultati di confronto, mostra un messaggio informativo
        const tbody = document.getElementById('confrontoTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table-message">
                        <div style="text-align: center; padding: 2rem;">
                            <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>Nessun confronto ECHA disponibile.</p>
                            <p>Vai alla sezione ECHA Database e utilizza il pulsante "Aggiorna ECHA" per confrontare un nuovo file.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Nascondi il contenitore delle modifiche
        const modificatiContainer = document.getElementById('modificatiContainer');
        if (modificatiContainer) {
            modificatiContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati di confronto:', error);
        showNotification('Errore nel caricamento dei dati di confronto: ' + error.message, 'error');
        
        // Mostra errore nella tabella
        const tbody = document.getElementById('confrontoTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Errore: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Funzione di supporto per ottenere il percorso del database ECHA
function getEchaDbPath() {
    // Prova prima dal sessionStorage
    let dbPath = sessionStorage.getItem('echaDbPath');
    
    // Se non c'è in sessionStorage, cerca nel localStorage
    if (!dbPath) {
        const echaFileInfoStr = localStorage.getItem('echaFileInfo');
        if (echaFileInfoStr) {
            try {
                const echaFileInfo = JSON.parse(echaFileInfoStr);
                dbPath = echaFileInfo.dbPath;
            } catch (e) {
                console.error('Errore nel parsing delle info ECHA:', e);
            }
        }
    }
    
    // Se non è stato trovato un percorso valido, restituisci un messaggio di errore
    if (!dbPath) {
        console.warn("Nessun percorso database ECHA trovato. Controlla se un file ECHA è stato caricato.");
    }
    
    return dbPath;
}

// Funzione per renderizzare i dati di confronto
function renderConfrontoData(data) {
    const tbody = document.getElementById('confrontoTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table-message">
                    Nessun dato di confronto disponibile. 
                    Assicurati di aver caricato un file ECHA e che ci siano sostanze corrispondenti nel database.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="editable"><input type="text" value="${item.sostanza}" data-field="sostanza" data-id="${item.id}"></td>
            <td class="editable"><input type="text" value="${item.nome}" data-field="nome" data-id="${item.id}"></td>
            <td class="editable"><input type="text" value="${item.fraseH}" data-field="fraseH" data-id="${item.id}"></td>
            <td>${item.hazardClass}</td>
            <td>${item.outputFraseH}</td>
            <td>${item.outputHazClass}</td>
            <td>
                <button class="btn btn-sm btn-primary modifica-btn" data-id="${item.id}">
                    <i class="fas fa-edit"></i> Modifica
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Aggiungi event listeners ai pulsanti di modifica
    document.querySelectorAll('.modifica-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            aggiornaRigaModificata(itemId);
        });
    });
}

// Aggiorna una riga modificata
// Funzione migliorata per aggiornare una riga modificata
async function aggiornaRigaModificata(itemId) {
    try {
        // Trova tutte le celle modificabili della riga con l'ID specificato
        const cells = document.querySelectorAll(`input[data-id="${itemId}"]`);
        
        if (!cells || cells.length === 0) {
            console.error(`Nessuna cella trovata per l'ID ${itemId}`);
            return;
        }
        
        // Crea un oggetto con i dati modificati
        const modificato = {
            id: itemId,
            sostanza: cells[0].value.trim(),
            nome: cells[1].value.trim(),
            fraseH: cells[2].value.trim()
        };
        
        // Ottieni i dati originali dalla riga
        const row = cells[0].closest('tr');
        const hazardClass = row.cells[3].textContent;
        const outputFraseH = row.cells[4].textContent;
        const outputHazClass = row.cells[5].textContent;
        
        // Completa l'oggetto con i dati non modificabili
        modificato.hazardClass = hazardClass;
        modificato.outputFraseH = outputFraseH;
        modificato.outputHazClass = outputHazClass;
        
        // Aggiungi alla tabella delle sostanze modificate
        aggiungiSostanzaModificata(modificato);
        
        // Rimuovi la riga dalla tabella originale
        row.remove();
        
        // Mostra il container delle sostanze modificate
        const modificatiContainer = document.getElementById('modificatiContainer');
        if (modificatiContainer) {
            modificatiContainer.style.display = 'block';
        }
        
        // Migliora l'esperienza utente mostrando cosa è stato modificato
        showNotification(`Sostanza "${modificato.sostanza}" aggiunta alla lista di modifiche`, 'success');
    } catch (error) {
        console.error('Errore nell\'aggiornamento della riga:', error);
        showNotification('Errore nell\'aggiornamento della riga: ' + error.message, 'error');
    }
}

// Versione migliorata per aggiungere una sostanza alla tabella delle sostanze modificate
function aggiungiSostanzaModificata(item) {
    const tbody = document.getElementById('modificatiTableBody');
    
    if (!tbody) {
        console.error('Elemento modificatiTableBody non trovato');
        return;
    }
    
    const row = document.createElement('tr');
    row.setAttribute('data-id', item.id);
    
    row.innerHTML = `
        <td>${item.sostanza}</td>
        <td>${item.nome}</td>
        <td>${item.fraseH}</td>
        <td>${item.hazardClass}</td>
        <td>${item.outputFraseH}</td>
        <td>${item.outputHazClass}</td>
    `;
    tbody.appendChild(row);
    
    // Aggiorna contatore delle modifiche
    const count = tbody.querySelectorAll('tr').length;
    
    // Aggiorna il testo del pulsante con il conteggio
    const completaBtn = document.getElementById('completaModificheBtn');
    if (completaBtn) {
        completaBtn.innerHTML = `<i class="fas fa-check"></i> Completa Modifiche (${count})`;
    }
}





// Funzione migliorata per completare tutte le modifiche
async function completaModifiche() {
    try {
        const rows = document.querySelectorAll('#modificatiTableBody tr');
        
        if (rows.length === 0) {
            showNotification('Nessuna modifica da salvare', 'warning');
            return;
        }
        
        // Mostra un indicatore di progresso
        showNotification('Salvataggio modifiche in corso...', 'info');
        
        // Array per memorizzare le promesse di aggiornamento
        const updatePromises = [];
        
        // Itera su tutte le righe modificate
        for (const row of rows) {
            const id = row.getAttribute('data-id');
            const cells = row.cells;
            
            if (!id) {
                console.warn('ID mancante per la riga di modifica');
                continue;
            }
            
            // Estrai i dati dalla riga
            const sostanzaNome = cells[0].textContent.trim();
            const echaName = cells[1].textContent.trim();
            const fraseH = cells[2].textContent.trim();
            
            // 1. Aggiorna il nome della sostanza
            const updateSostanza = window.electronAPI.executeSQLite(
                'UPDATE sostanze SET Nome = ? WHERE ID = ?',
                [sostanzaNome, id]
            );
            
            updatePromises.push(updateSostanza);
            
            // 2. Aggiorna o sostituisci le frasi H
            if (fraseH) {
                // Prima ottieni le frasi H esistenti
                const fraseHResult = await window.electronAPI.querySQLite(
                    'SELECT ID_PK, Hazard_Statement FROM "frasi H" WHERE Nome_sostanza = ?',
                    [sostanzaNome]
                );
                
                if (fraseHResult.success) {
                    // Dividi le frasi H in un array
                    const frasiFornite = fraseH.split(',').map(f => f.trim());
                    const frasiEsistenti = fraseHResult.data.map(f => f.Hazard_Statement.trim());
                    
                    // Aggiorna frasi esistenti o aggiungi nuove
                    for (const nuovaFrase of frasiFornite) {
                        if (!frasiEsistenti.includes(nuovaFrase)) {
                            // Ottieni il CAS dalla sostanza
                            const sostanzaResult = await window.electronAPI.querySQLite(
                                'SELECT CAS FROM sostanze WHERE ID = ?',
                                [id]
                            );
                            
                            if (sostanzaResult.success && sostanzaResult.data.length > 0) {
                                const cas = sostanzaResult.data[0].CAS;
                                
                                // Aggiungi la nuova frase H
                                const insertFraseH = window.electronAPI.executeSQLite(
                                    'INSERT INTO "frasi H" (Nome_sostanza, CAS, Hazard_Statement, Hazard_Class_and_Category) VALUES (?, ?, ?, ?)',
                                    [sostanzaNome, cas, nuovaFrase, '']
                                );
                                
                                updatePromises.push(insertFraseH);
                            }
                        }
                    }
                }
            }
        }
        
        // Attendi che tutti gli aggiornamenti siano completati
        await Promise.all(updatePromises);
        
        showNotification('Modifiche salvate con successo', 'success');
        
        // Aggiungi attività
        addActivity('Tabella di Riscontro', 'Aggiornate ' + rows.length + ' sostanze', 'fas fa-sync-alt');
        
        // Nascondi il container e svuota la tabella
        const modificatiContainer = document.getElementById('modificatiContainer');
        if (modificatiContainer) {
            modificatiContainer.style.display = 'none';
        }
        
        const modificatiTableBody = document.getElementById('modificatiTableBody');
        if (modificatiTableBody) {
            modificatiTableBody.innerHTML = '';
        }
        
        // Ricarica i dati di confronto
        await loadConfronto();
        
    } catch (error) {
        console.error('Errore nel completamento delle modifiche:', error);
        showNotification('Errore nel salvataggio delle modifiche: ' + error.message, 'error');
    }
}



// Funzione per cercare nelle tabelle di confronto
function ricercaTabellaConfronto(query) {
    query = query.toLowerCase().trim();
    
    // Se la query è vuota, mostra tutte le righe
    if (!query) {
        document.querySelectorAll('#confrontoTableBody tr').forEach(row => {
            row.style.display = '';
        });
        
        document.querySelectorAll('#modificatiTableBody tr').forEach(row => {
            row.style.display = '';
        });
        
        return;
    }
    
    // Cerca nella tabella di confronto principale
    let countConfronto = 0;
    document.querySelectorAll('#confrontoTableBody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
            countConfronto++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Cerca anche nella tabella delle sostanze modificate
    let countModificati = 0;
    document.querySelectorAll('#modificatiTableBody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
            countModificati++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Aggiorna il contatore senza mostrare notifiche
    const countLabel = document.getElementById('confrontoMatchCount');
    if (countLabel) {
        countLabel.textContent = (countConfronto + countModificati) > 0 ? 
            `${countConfronto + countModificati} sostanze trovate` : 
            'Nessuna sostanza trovata';
    }
    
    return countConfronto + countModificati;
}

// Integrazione della ricerca nella tabella di confronto
function setupConfrontoSearch() {
    // Aggiungi campo di ricerca alla tabella di confronto se non esiste
    const tableActions = document.querySelector('#aggiornamenti .table-actions');
    
    if (!tableActions) {
        // Crea container per la ricerca se non esiste
        const container = document.createElement('div');
        container.className = 'table-actions';
        container.innerHTML = `
            <div class="search-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="confrontoSearchInput" placeholder="Cerca sostanza..." class="search-input">
            </div>
            <div id="confrontoMatchCount" class="match-count"></div>
        `;
        
        // Inserisci prima della tabella
        const dataTable = document.querySelector('#aggiornamenti .data-table');
        if (dataTable) {
            dataTable.insertBefore(container, dataTable.firstChild);
        }
    }
    
    // Aggiungi event listener per la ricerca
    const searchInput = document.getElementById('confrontoSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const matchCount = ricercaTabellaConfronto(this.value);
            const countLabel = document.getElementById('confrontoMatchCount');
            if (countLabel) {
                countLabel.textContent = matchCount > 0 ? 
                    `${matchCount} sostanze trovate` : 
                    'Nessuna sostanza trovata';
            }
        });
    }
}

// Assicurati di chiamare questa funzione dopo aver caricato la tabella di confronto
function initConfrontoSearch() {
    // Aggiungi ricerca alla sottosezione di confronto
    document.addEventListener('DOMContentLoaded', function() {
        setupConfrontoSearch();
    });
    
    // Assicurati che la ricerca venga impostata quando si cambia alla tab "aggiornamenti"
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'aggiornamenti') {
                setTimeout(setupConfrontoSearch, 100);
            }
        });
    });
}

// Carica la tabella sali dal database
async function loadTabellaRiscontroSali() {
    try {
        // Ottieni i dati dal database SQLite - non serve più specificare il nome del database
        const result = await window.electronAPI.querySQLite('SELECT * FROM sali', []);
        
        if (result.success) {
            // Salva una copia dei dati originali
            saliOriginali = JSON.parse(JSON.stringify(result.data));
            renderTabellaRiscontroSali(result.data);
        } else {
            throw new Error(result.message || 'Errore nel caricamento dei dati');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati dei sali:', error);
        showNotification('Errore nel caricamento dei dati dei sali', 'error');
        
        // Fallback a dati di esempio in caso di errore
        const saliData = [
            {
                ID: 1,
                Sali: "Cloruro di rame",
                Sinonimi_Col_B_file_ECHA: "Copper chloride",
                CAS: "7447-39-4",
                Fattore: 0.47,
                Metallo: "Rame",
                Default: 1
            },
            {
                ID: 2,
                Sali: "Nitrato di piombo",
                Sinonimi_Col_B_file_ECHA: "Lead nitrate",
                CAS: "10099-74-8",
                Fattore: 0.63,
                Metallo: "Piombo",
                Default: 0
            },
            {
                ID: 3,
                Sali: "Solfato di zinco",
                Sinonimi_Col_B_file_ECHA: "Zinc sulfate",
                CAS: "7733-02-0",
                Fattore: 0.40,
                Metallo: "Zinco",
                Default: 1
            }
        ];
        
        saliOriginali = JSON.parse(JSON.stringify(saliData));
        renderTabellaRiscontroSali(saliData);
    }
}

// Renderizza la tabella sali
function renderTabellaRiscontroSali(data) {
    const tbody = document.getElementById('saliTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.ID || item.id);
        
        // Salva valori come attributi di dati per un recupero più sicuro
        row.setAttribute('data-sali', item.Sali || '');
        row.setAttribute('data-sinonimi', item.Sinonimi_Col_B_file_ECHA || '');
        row.setAttribute('data-cas', item.CAS || '');
        row.setAttribute('data-fattore', item.Fattore || '');
        row.setAttribute('data-metallo', item.Metallo || '');
        row.setAttribute('data-default', item.Default || 0);
        
        row.innerHTML = `
            <td>${item.ID || item.id}</td>
            <td class="sali-cell">${item.Sali || ''}</td>
            <td class="sinonimi-cell">${item.Sinonimi_Col_B_file_ECHA || ''}</td>
            <td class="cas-cell">${item.CAS || ''}</td>
            <td class="fattore-cell">${item.Fattore || ''}</td>
            <td class="metallo-cell">${item.Metallo || ''}</td>
            <td class="default-cell">
                <input type="checkbox" 
                       ${(item.Default == 1) ? 'checked' : ''} 
                       class="default-checkbox" 
                       onchange="aggiornaDefaultSale(${item.ID || item.id}, this.checked)">
            </td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-danger delete-btn" onclick="eliminaSale(${item.ID || item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Reset dello stato di modifica
    saliInEditMode = false;
    
    // Rimuovi eventuali classi di modifica dalla tabella
    const table = document.getElementById('saliTable');
    if (table) {
        table.classList.remove('edit-mode');
    }
    
    // Aggiorna la lista dei sali modificati
    saliModificati = [];
}

// 2. Nuova funzione per aggiornare il default di un sale
async function aggiornaDefaultSale(id, isChecked) {
    try {
        const defaultValue = isChecked ? 1 : 0;
        
        // Aggiorna il database
        const result = await window.electronAPI.executeSQLite(
            'UPDATE sali SET "Default" = ? WHERE ID = ?',
            [defaultValue, id]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'aggiornamento: ${result.message}`);
        }
        
        // Aggiorna l'attributo data-default della riga
        const row = document.querySelector(`#saliTableBody tr[data-id="${id}"]`);
        if (row) {
            row.setAttribute('data-default', defaultValue);
        }
        
        // Notifica all'utente
        showNotification(`Sale ${isChecked ? 'impostato come' : 'rimosso da'} default`);
        
        // Aggiungi attività
        addActivity('Default sale aggiornato', `Sale ID: ${id} - Default: ${isChecked ? 'Sì' : 'No'}`, 'fas fa-toggle-on');
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento del default:', error);
        showNotification('Errore nell\'aggiornamento: ' + error.message, 'error');
        
        // Ripristina lo stato precedente del checkbox in caso di errore
        const checkbox = document.querySelector(`#saliTableBody tr[data-id="${id}"] .default-checkbox`);
        if (checkbox) {
            checkbox.checked = !isChecked;
        }
    }
}

// Attiva la modalità di modifica per un sale specifico
function attivaModeModificaSale(id) {
    // Se siamo già in modalità modifica, salva prima le modifiche correnti
    if (saliInEditMode) {
        const conferma = confirm('Hai delle modifiche non salvate. Vuoi salvare prima di procedere?');
        if (conferma) {
            salvaSaliModificati();
        }
    }
    
    // Trova la riga da modificare
    const row = document.querySelector(`#saliTableBody tr[data-id="${id}"]`);
    if (!row) return;
    
    // Se la riga è già in modalità modifica, non fare nulla
    if (row.classList.contains('edit-mode')) {
        return;
    }
    
    // Aggiungi classe alla tabella e alla riga per indicare modalità modifica
    document.getElementById('saliTable').classList.add('edit-mode');
    row.classList.add('edit-mode');
    
    // Ottieni i valori correnti
    const saliCell = row.querySelector('.sali-cell');
    const sinonimiCell = row.querySelector('.sinonimi-cell');
    const casCell = row.querySelector('.cas-cell');
    const fattoreCell = row.querySelector('.fattore-cell');
    const metalloCell = row.querySelector('.metallo-cell');
    const defaultCell = row.querySelector('.default-cell');
    
    // Memorizza i valori originali come attributi data-*
    saliCell.setAttribute('data-original', saliCell.textContent);
    sinonimiCell.setAttribute('data-original', sinonimiCell.textContent);
    casCell.setAttribute('data-original', casCell.textContent);
    fattoreCell.setAttribute('data-original', fattoreCell.textContent);
    metalloCell.setAttribute('data-original', metalloCell.textContent);
    defaultCell.setAttribute('data-original', defaultCell.textContent);
    
    // Trasforma le celle in campi di input
    saliCell.innerHTML = `<input type="text" value="${saliCell.textContent}" class="sali-input">`;
    sinonimiCell.innerHTML = `<input type="text" value="${sinonimiCell.textContent}" class="sinonimi-input">`;
    casCell.innerHTML = `<input type="text" value="${casCell.textContent}" class="cas-input">`;
    
    // Assicurati che il valore del fattore non venga perso
    const fattoreValue = fattoreCell.textContent.trim();
    fattoreCell.innerHTML = `<input type="number" step="0.01" value="${fattoreValue}" class="fattore-input">`;
    
    metalloCell.innerHTML = `<input type="text" value="${metalloCell.textContent}" class="metallo-input">`;
    
    // Per il campo Default, usiamo una checkbox se è un campo boolean
    const defaultValue = defaultCell.textContent.trim();
    const isChecked = defaultValue == '1' || defaultValue.toLowerCase() == 'true';
    defaultCell.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} class="default-input">`;
    
    // Aggiungi classe editable alle celle per gli stili
    saliCell.classList.add('editable');
    sinonimiCell.classList.add('editable');
    casCell.classList.add('editable');
    fattoreCell.classList.add('editable');
    metalloCell.classList.add('editable');
    defaultCell.classList.add('editable');
    
    // Imposta lo stato di modifica
    saliInEditMode = true;
    
    // Nascondi il bottone modifica e mostra il bottone salva nella riga
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    if (editBtn && saveBtn) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
    }
    
    // Aggiungi questo sale alla lista dei modificati
    if (!saliModificati.includes(id)) {
        saliModificati.push(id);
    }
}

// Salva le modifiche ai sali
async function salvaSaliModificati() {
    try {
        if (saliModificati.length === 0) {
            showNotification('Nessuna modifica da salvare', 'warning');
            return;
        }
        
        console.log('Salvataggio modifiche per i seguenti ID:', saliModificati);
        
        const updates = [];
        
        // Raccogli tutte le modifiche
        for (const id of saliModificati) {
            const row = document.querySelector(`#saliTableBody tr[data-id="${id}"]`);
            if (!row) {
                console.warn(`Riga con ID ${id} non trovata`);
                continue;
            }
            
            const saliInput = row.querySelector('.sali-input');
            const sinonimiInput = row.querySelector('.sinonimi-input');
            const casInput = row.querySelector('.cas-input');
            const fattoreInput = row.querySelector('.fattore-input');
            const metalloInput = row.querySelector('.metallo-input');
            const defaultInput = row.querySelector('.default-input');
            
            if (!saliInput || !sinonimiInput || !casInput || !fattoreInput || !metalloInput || !defaultInput) {
                console.warn(`Alcuni input non trovati per la riga ${id}`);
                continue;
            }
            
            // Crea oggetto con i dati aggiornati
            const updatedSale = {
                ID: id,
                Sali: saliInput.value.trim(),
                Sinonimi_Col_B_file_ECHA: sinonimiInput.value.trim(),
                CAS: casInput.value.trim(),
                Fattore: parseFloat(fattoreInput.value) || 0,
                Metallo: metalloInput.value.trim(),
                Default: defaultInput.checked ? 1 : 0
            };
            
            console.log('Dati da aggiornare:', updatedSale);
            updates.push(updatedSale);
        }
        
        // Verifica se ci sono effettivamente modifiche da salvare
        if (updates.length === 0) {
            showNotification('Nessuna modifica valida da salvare', 'warning');
            return;
        }
        
        // Esegui gli aggiornamenti nel database
        for (const sale of updates) {
            console.log('Esecuzione query per ID:', sale.ID);
            // Usa l'API per aggiornare il database
            const result = await window.electronAPI.executeSQLite(
                'UPDATE sali SET Sali = ?, Sinonimi_Col_B_file_ECHA = ?, CAS = ?, Fattore = ?, Metallo = ?, "Default" = ? WHERE ID = ?',
                [sale.Sali, sale.Sinonimi_Col_B_file_ECHA, sale.CAS, sale.Fattore, sale.Metallo, sale.Default, sale.ID]
            );
            
            console.log('Risultato query:', result);
            
            if (!result.success) {
                throw new Error(`Errore nell'aggiornamento del sale ID ${sale.ID}: ${result.message}`);
            }
        }
        
        // Ricarica i dati aggiornati
        await loadTabellaRiscontroSali();
        
        showNotification(`${updates.length} sali aggiornati con successo`);
        
        // Aggiungi attività
        addActivity('Tabella sali aggiornata', `Modificati ${updates.length} sali`, 'fas fa-flask');
        
    } catch (error) {
        console.error('Errore nel salvataggio delle modifiche ai sali:', error);
        showNotification('Errore nel salvataggio delle modifiche: ' + error.message, 'error');
    }
}


// Funzione per salvare un singolo sale
async function salvaSaleSingolo(id) {
    try {
        console.log('Salvataggio sale con ID:', id);
        
        // Trova la riga da salvare
        const row = document.querySelector(`#saliTableBody tr[data-id="${id}"]`);
        if (!row) {
            console.error('Riga non trovata');
            return;
        }
        
        // Ottieni i valori dai campi input
        const saliInput = row.querySelector('.sali-input');
        const sinonimiInput = row.querySelector('.sinonimi-input');
        const casInput = row.querySelector('.cas-input');
        const fattoreInput = row.querySelector('.fattore-input');
        const metalloInput = row.querySelector('.metallo-input');
        const defaultInput = row.querySelector('.default-input');
        
        if (!saliInput || !sinonimiInput || !casInput || !fattoreInput || !metalloInput || !defaultInput) {
            console.error('Uno o più campi non trovati');
            showNotification('Errore: campi non trovati', 'error');
            return;
        }
        
        // Crea oggetto con i dati aggiornati
        const updatedSale = {
            ID: id,
            Sali: saliInput.value.trim(),
            Sinonimi_Col_B_file_ECHA: sinonimiInput.value.trim(),
            CAS: casInput.value.trim(),
            Fattore: parseFloat(fattoreInput.value) || 0,
            Metallo: metalloInput.value.trim(),
            Default: defaultInput.checked ? 1 : 0
        };
        
        console.log('Dati aggiornati:', updatedSale);
        
        // Usa l'API per aggiornare il database
        const result = await window.electronAPI.executeSQLite(
            'UPDATE sali SET Sali = ?, Sinonimi_Col_B_file_ECHA = ?, CAS = ?, Fattore = ?, Metallo = ?, "Default" = ? WHERE ID = ?',
            [updatedSale.Sali, updatedSale.Sinonimi_Col_B_file_ECHA, updatedSale.CAS, updatedSale.Fattore, updatedSale.Metallo, updatedSale.Default, updatedSale.ID]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'aggiornamento: ${result.message}`);
        }
        
        // Rimuovi dalla lista dei modificati
        saliModificati = saliModificati.filter(item => item !== id);
        
        // Se non ci sono più sali in modifica, reset della modalità
        if (saliModificati.length === 0) {
            saliInEditMode = false;
            document.getElementById('saliTable').classList.remove('edit-mode');
        }
        
        // Ripristina la visualizzazione normale della riga
        ripristinaCelleRiga(row, updatedSale);
        
        // Mostra il bottone modifica e nascondi il bottone salva
        const editBtn = row.querySelector('.edit-btn');
        const saveBtn = row.querySelector('.save-btn');
        if (editBtn && saveBtn) {
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        // Rimuovi classe edit-mode dalla riga
        row.classList.remove('edit-mode');
        
        // Notifica all'utente
        showNotification('Sale aggiornato con successo');
        
        // Aggiungi attività
        addActivity('Sale aggiornato', `Modificato sale ID: ${id}`, 'fas fa-flask');
        
    } catch (error) {
        console.error('Errore nel salvataggio del sale:', error);
        showNotification('Errore nel salvataggio: ' + error.message, 'error');
    }
}

// Funzione per ripristinare l'aspetto normale delle celle dopo il salvataggio
function ripristinaCelleRiga(row, sale) {
    // Aggiorna le celle con i nuovi valori
    const saliCell = row.querySelector('.sali-cell');
    const sinonimiCell = row.querySelector('.sinonimi-cell');
    const casCell = row.querySelector('.cas-cell');
    const fattoreCell = row.querySelector('.fattore-cell');
    const metalloCell = row.querySelector('.metallo-cell');
    const defaultCell = row.querySelector('.default-cell');
    
    if (saliCell) {
        saliCell.textContent = sale.Sali;
        saliCell.classList.remove('editable');
    }
    
    if (sinonimiCell) {
        sinonimiCell.textContent = sale.Sinonimi_Col_B_file_ECHA;
        sinonimiCell.classList.remove('editable');
    }
    
    if (casCell) {
        casCell.textContent = sale.CAS;
        casCell.classList.remove('editable');
    }
    
    if (fattoreCell) {
        fattoreCell.textContent = sale.Fattore;
        fattoreCell.classList.remove('editable');
    }
    
    if (metalloCell) {
        metalloCell.textContent = sale.Metallo;
        metalloCell.classList.remove('editable');
    }
    
    if (defaultCell) {
        defaultCell.textContent = sale.Default;
        defaultCell.classList.remove('editable');
    }
}


// Annulla le modifiche e ripristina i valori originali
function annullaSaliModificati() {
    if (saliModificati.length === 0) return;
    
    const table = document.getElementById('saliTable');
    table.classList.remove('edit-mode');
    
    // Nascondi il pulsante salva
    document.getElementById('salvaSaliBtn').style.display = 'none';
    
    // Ripristina i valori originali
    for (const id of saliModificati) {
        const row = document.querySelector(`#saliTableBody tr[data-id="${id}"]`);
        if (!row) continue;
        
        const saliCell = row.querySelector('.sali-cell');
        const sinonimiCell = row.querySelector('.sinonimi-cell');
        const casCell = row.querySelector('.cas-cell');
        const fattoreCell = row.querySelector('.fattore-cell');
        const metalloCell = row.querySelector('.metallo-cell');
        const defaultCell = row.querySelector('.default-cell');
        
        if (saliCell.classList.contains('editable')) {
            saliCell.textContent = saliCell.getAttribute('data-original') || '';
            saliCell.classList.remove('editable');
        }
        
        if (sinonimiCell.classList.contains('editable')) {
            sinonimiCell.textContent = sinonimiCell.getAttribute('data-original') || '';
            sinonimiCell.classList.remove('editable');
        }
        
        if (casCell.classList.contains('editable')) {
            casCell.textContent = casCell.getAttribute('data-original') || '';
            casCell.classList.remove('editable');
        }
        
        if (fattoreCell.classList.contains('editable')) {
            fattoreCell.textContent = fattoreCell.getAttribute('data-original') || '';
            fattoreCell.classList.remove('editable');
        }
        
        if (metalloCell.classList.contains('editable')) {
            metalloCell.textContent = metalloCell.getAttribute('data-original') || '';
            metalloCell.classList.remove('editable');
        }
        
        if (defaultCell.classList.contains('editable')) {
            defaultCell.textContent = defaultCell.getAttribute('data-original') || '';
            defaultCell.classList.remove('editable');
        }
        
        // Rimuovi la classe active dal bottone di modifica
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.classList.remove('active');
        }
    }
    
    saliInEditMode = false;
    saliModificati = [];
    
    showNotification('Modifiche annullate');
}

// Carica la tabella sostanze dal database
async function loadTabellaRiscontroSostanze() {
    try {
        // Ottieni i dati dal database SQLite - non serve specificare il nome del database
        const result = await window.electronAPI.querySQLite('SELECT * FROM sostanze', []);
        
        if (result.success) {
            // Salva una copia dei dati originali
            sostanzeOriginali = JSON.parse(JSON.stringify(result.data));
            renderTabellaRiscontroSostanze(result.data);
        } else {
            throw new Error(result.message || 'Errore nel caricamento dei dati');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati delle sostanze:', error);
        showNotification('Errore nel caricamento dei dati delle sostanze', 'error');
        
        // Fallback a dati di esempio in caso di errore
        const sostanzeData = [
            {
                ID: 1,
                Nome: "Rame",
                CAS: "7440-50-8",
                Categoria: "Metalli"
            },
            {
                ID: 2,
                Nome: "Piombo",
                CAS: "7439-92-1",
                Categoria: "Metalli"
            },
            {
                ID: 3,
                Nome: "Zinco",
                CAS: "7440-66-6",
                Categoria: "Metalli"
            },
            {
                ID: 4,
                Nome: "Acetone",
                CAS: "67-64-1",
                Categoria: "Solventi"
            }
        ];
        
        sostanzeOriginali = JSON.parse(JSON.stringify(sostanzeData));
        renderTabellaRiscontroSostanze(sostanzeData);
    }
}

// Funzione per ottenere in modo sicuro i valori delle sostanze
function getSostanzaValue(item, field, defaultValue = '') {
    if (field in item && item[field] !== null) {
        return item[field].toString();
    }
    return defaultValue;
}

// Renderizza la tabella sostanze
function renderTabellaRiscontroSostanze(data) {
    const tbody = document.getElementById('sostanzeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const ID = getSostanzaValue(item, 'ID');
        const Nome = getSostanzaValue(item, 'Nome');
        const CAS = getSostanzaValue(item, 'CAS');
        const Categoria = getSostanzaValue(item, 'Categoria');
        
        const row = document.createElement('tr');
        row.setAttribute('data-id', ID);
        
        // Salva valori come attributi di dati per un recupero più sicuro
        row.setAttribute('data-nome', Nome);
        row.setAttribute('data-cas', CAS);
        row.setAttribute('data-categoria', Categoria);
        
        row.innerHTML = `
            <td>${ID}</td>
            <td class="nome-cell">${Nome}</td>
            <td class="cas-cell">${CAS}</td>
            <td class="categoria-cell">${Categoria}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-danger delete-btn" onclick="eliminaSostanza(${ID})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Reset dello stato di modifica
    sostanzeInEditMode = false;
    
    // Rimuovi eventuali classi di modifica dalla tabella
    const table = document.getElementById('sostanzeTable');
    if (table) {
        table.classList.remove('edit-mode');
    }
    
    // Aggiorna la lista delle sostanze modificate
    sostanzeModificate = [];
}

// Attiva la modalità di modifica per una sostanza specifica
function attivaModeModificaSostanza(id) {
    // Se siamo già in modalità modifica, salva prima le modifiche correnti
    if (sostanzeInEditMode) {
        const conferma = confirm('Hai delle modifiche non salvate. Vuoi salvare prima di procedere?');
        if (conferma) {
            salvaSostanzeModificate();
        }
    }
    
    // Trova la riga da modificare
    const row = document.querySelector(`#sostanzeTableBody tr[data-id="${id}"]`);
    if (!row) return;
    
    // Se la riga è già in modalità modifica, non fare nulla
    if (row.classList.contains('edit-mode')) {
        return;
    }
    
    // Aggiungi classe alla tabella e alla riga per indicare modalità modifica
    document.getElementById('sostanzeTable').classList.add('edit-mode');
    row.classList.add('edit-mode');
    
    // Ottieni i valori correnti
    const nomeCell = row.querySelector('.nome-cell');
    const casCell = row.querySelector('.cas-cell');
    const categoriaCell = row.querySelector('.categoria-cell');
    
    // Memorizza i valori originali come attributi data-*
    nomeCell.setAttribute('data-original', nomeCell.textContent);
    casCell.setAttribute('data-original', casCell.textContent);
    categoriaCell.setAttribute('data-original', categoriaCell.textContent);
    
    // Usa il valore degli attributi data-* salvati nella riga
    const nomeValue = row.getAttribute('data-nome') || '';
    const casValue = row.getAttribute('data-cas') || '';
    const categoriaValue = row.getAttribute('data-categoria') || '';
    
    // Trasforma le celle in campi di input
    nomeCell.innerHTML = `<input type="text" value="${nomeValue}" class="nome-input">`;
    casCell.innerHTML = `<input type="text" value="${casValue}" class="cas-input">`;
    categoriaCell.innerHTML = `<input type="text" value="${categoriaValue}" class="categoria-input">`;
    
    // Aggiungi classe editable alle celle per gli stili
    nomeCell.classList.add('editable');
    casCell.classList.add('editable');
    categoriaCell.classList.add('editable');
    
    // Imposta lo stato di modifica
    sostanzeInEditMode = true;
    
    // Nascondi il bottone modifica e mostra il bottone salva nella riga
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    if (editBtn && saveBtn) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
    }
    
    // Aggiungi questa sostanza alla lista delle modificate
    if (!sostanzeModificate.includes(id)) {
        sostanzeModificate.push(id);
    }
}

// Funzione per salvare una singola sostanza
async function salvaSostanzaSingola(id) {
    try {
        console.log('Salvataggio sostanza con ID:', id);
        
        // Trova la riga da salvare
        const row = document.querySelector(`#sostanzeTableBody tr[data-id="${id}"]`);
        if (!row) {
            console.error('Riga non trovata');
            return;
        }
        
        // Ottieni i valori dai campi input
        const nomeInput = row.querySelector('.nome-input');
        const casInput = row.querySelector('.cas-input');
        const categoriaInput = row.querySelector('.categoria-input');
        
        if (!nomeInput || !casInput || !categoriaInput) {
            console.error('Uno o più campi non trovati');
            showNotification('Errore: campi non trovati', 'error');
            return;
        }
        
        // Crea oggetto con i dati aggiornati
        const updatedSostanza = {
            ID: id,
            Nome: nomeInput.value.trim(),
            CAS: casInput.value.trim(),
            Categoria: categoriaInput.value.trim()
        };
        
        console.log('Dati aggiornati:', updatedSostanza);
        
        // Usa l'API per aggiornare il database
        const result = await window.electronAPI.executeSQLite(
            'UPDATE sostanze SET Nome = ?, CAS = ?, Categoria = ? WHERE ID = ?',
            [updatedSostanza.Nome, updatedSostanza.CAS, updatedSostanza.Categoria, updatedSostanza.ID]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'aggiornamento: ${result.message}`);
        }
        
        // Rimuovi dalla lista delle modificate
        sostanzeModificate = sostanzeModificate.filter(item => item !== id);
        
        // Se non ci sono più sostanze in modifica, reset della modalità
        if (sostanzeModificate.length === 0) {
            sostanzeInEditMode = false;
            document.getElementById('sostanzeTable').classList.remove('edit-mode');
        }
        
        // Ripristina la visualizzazione normale della riga
        ripristinaCelleSostanza(row, updatedSostanza);
        
        // Mostra il bottone modifica e nascondi il bottone salva
        const editBtn = row.querySelector('.edit-btn');
        const saveBtn = row.querySelector('.save-btn');
        if (editBtn && saveBtn) {
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        // Rimuovi classe edit-mode dalla riga
        row.classList.remove('edit-mode');
        
        // Notifica all'utente
        showNotification('Sostanza aggiornata con successo');
        
        // Aggiungi attività
        addActivity('Sostanza aggiornata', `Modificata sostanza ID: ${id}`, 'fas fa-atom');
        
    } catch (error) {
        console.error('Errore nel salvataggio della sostanza:', error);
        showNotification('Errore nel salvataggio: ' + error.message, 'error');
    }
}

// Funzione per ripristinare l'aspetto normale delle celle dopo il salvataggio
function ripristinaCelleSostanza(row, sostanza) {
    // Aggiorna le celle con i nuovi valori
    const nomeCell = row.querySelector('.nome-cell');
    const casCell = row.querySelector('.cas-cell');
    const categoriaCell = row.querySelector('.categoria-cell');
    
    if (nomeCell) {
        nomeCell.textContent = sostanza.Nome;
        nomeCell.classList.remove('editable');
    }
    
    if (casCell) {
        casCell.textContent = sostanza.CAS;
        casCell.classList.remove('editable');
    }
    
    if (categoriaCell) {
        categoriaCell.textContent = sostanza.Categoria;
        categoriaCell.classList.remove('editable');
    }
    
    // Aggiorna anche gli attributi data-* della riga
    row.setAttribute('data-nome', sostanza.Nome);
    row.setAttribute('data-cas', sostanza.CAS);
    row.setAttribute('data-categoria', sostanza.Categoria);
}

// Funzione per salvare tutte le sostanze modificate
async function salvaSostanzeModificate() {
    try {
        if (sostanzeModificate.length === 0) {
            showNotification('Nessuna modifica da salvare', 'warning');
            return;
        }
        
        console.log('Salvataggio modifiche per le seguenti ID:', sostanzeModificate);
        
        const updates = [];
        
        // Raccogli tutte le modifiche
        for (const id of sostanzeModificate) {
            const row = document.querySelector(`#sostanzeTableBody tr[data-id="${id}"]`);
            if (!row) {
                console.warn(`Riga con ID ${id} non trovata`);
                continue;
            }
            
            const nomeInput = row.querySelector('.nome-input');
            const casInput = row.querySelector('.cas-input');
            const categoriaInput = row.querySelector('.categoria-input');
            
            if (!nomeInput || !casInput || !categoriaInput) {
                console.warn(`Alcuni input non trovati per la riga ${id}`);
                continue;
            }
            
            // Crea oggetto con i dati aggiornati
            const updatedSostanza = {
                ID: id,
                Nome: nomeInput.value.trim(),
                CAS: casInput.value.trim(),
                Categoria: categoriaInput.value.trim()
            };
            
            console.log('Dati da aggiornare:', updatedSostanza);
            updates.push(updatedSostanza);
        }
        
        // Verifica se ci sono effettivamente modifiche da salvare
        if (updates.length === 0) {
            showNotification('Nessuna modifica valida da salvare', 'warning');
            return;
        }
        
        // Esegui gli aggiornamenti nel database
        for (const sostanza of updates) {
            console.log('Esecuzione query per ID:', sostanza.ID);
            // Usa l'API per aggiornare il database
            const result = await window.electronAPI.executeSQLite(
                'UPDATE sostanze SET Nome = ?, CAS = ?, Categoria = ? WHERE ID = ?',
                [sostanza.Nome, sostanza.CAS, sostanza.Categoria, sostanza.ID]
            );
            
            console.log('Risultato query:', result);
            
            if (!result.success) {
                throw new Error(`Errore nell'aggiornamento della sostanza ID ${sostanza.ID}: ${result.message}`);
            }
        }
        
        // Ricarica i dati aggiornati
        await loadTabellaRiscontroSostanze();
        
        showNotification(`${updates.length} sostanze aggiornate con successo`);
        
        // Aggiungi attività
        addActivity('Tabella sostanze aggiornata', `Modificate ${updates.length} sostanze`, 'fas fa-atom');
        
    } catch (error) {
        console.error('Errore nel salvataggio delle modifiche alle sostanze:', error);
        showNotification('Errore nel salvataggio delle modifiche: ' + error.message, 'error');
    }
}

// Annulla le modifiche alle sostanze e ripristina i valori originali
function annullaSostanzeModificate() {
    if (sostanzeModificate.length === 0) return;
    
    const table = document.getElementById('sostanzeTable');
    table.classList.remove('edit-mode');
    
    // Ripristina i valori originali
    for (const id of sostanzeModificate) {
        const row = document.querySelector(`#sostanzeTableBody tr[data-id="${id}"]`);
        if (!row) continue;
        
        const nomeCell = row.querySelector('.nome-cell');
        const casCell = row.querySelector('.cas-cell');
        const categoriaCell = row.querySelector('.categoria-cell');
        
        if (nomeCell.classList.contains('editable')) {
            nomeCell.textContent = nomeCell.getAttribute('data-original') || '';
            nomeCell.classList.remove('editable');
        }
        
        if (casCell.classList.contains('editable')) {
            casCell.textContent = casCell.getAttribute('data-original') || '';
            casCell.classList.remove('editable');
        }
        
        if (categoriaCell.classList.contains('editable')) {
            categoriaCell.textContent = categoriaCell.getAttribute('data-original') || '';
            categoriaCell.classList.remove('editable');
        }
        
        // Ripristina i bottoni
        const editBtn = row.querySelector('.edit-btn');
        const saveBtn = row.querySelector('.save-btn');
        if (editBtn && saveBtn) {
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        // Rimuovi classe edit-mode dalla riga
        row.classList.remove('edit-mode');
    }
    
    sostanzeInEditMode = false;
    sostanzeModificate = [];
    
    showNotification('Modifiche annullate');
}

// Funzione di supporto per cercare sostanze nella tabella
function ricercaSostanze(query) {
    query = query.toLowerCase().trim();
    const table = document.getElementById('sostanzeTable');
    const rows = table.querySelectorAll('tbody tr');
    
    let matchCount = 0;
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
            matchCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    return matchCount;
}

// Funzione per eliminare una sostanza
async function eliminaSostanza(id) {
    try {
        // Validazione dell'ID
        if (!id || isNaN(parseInt(id))) {
            throw new Error(`ID non valido: ${id}`);
        }
        
        // Prima ottieni i dettagli della sostanza per i messaggi informativi
        const sostanzaResult = await window.electronAPI.querySQLite(
            'SELECT Nome, CAS FROM sostanze WHERE ID = ?',
            [id]
        );
        
        if (!sostanzaResult.success || sostanzaResult.data.length === 0) {
            throw new Error("Sostanza non trovata nel database");
        }
        
        const sostanza = sostanzaResult.data[0];
        const nomeSostanza = sostanza.Nome;
        const casSostanza = sostanza.CAS;
        
        // Verifica quanti record correlati verranno eliminati
        const verificaFrasiH = await window.electronAPI.querySQLite(
            'SELECT COUNT(*) as count FROM "frasi H" WHERE Nome_sostanza = ? OR CAS = ?',
            [nomeSostanza, casSostanza]
        );
        
        const verificaFrasiEUH = await window.electronAPI.querySQLite(
            'SELECT COUNT(*) as count FROM "EUH" WHERE CAS_EK = ?',
            [casSostanza]
        );
        
        const countFrasiH = verificaFrasiH.success ? verificaFrasiH.data[0].count : 0;
        const countFrasiEUH = verificaFrasiEUH.success ? verificaFrasiEUH.data[0].count : 0;
        
        // Costruisci il messaggio di conferma con informazioni sui record correlati
        let messaggioConferma = `Sei sicuro di voler eliminare la sostanza "${nomeSostanza}"?`;
        
        if (countFrasiH > 0 || countFrasiEUH > 0) {
            messaggioConferma += `\n\nQuesta azione eliminerà anche:`;
            if (countFrasiH > 0) {
                messaggioConferma += `\n• ${countFrasiH} frase/i H correlate`;
            }
            if (countFrasiEUH > 0) {
                messaggioConferma += `\n• ${countFrasiEUH} frase/i EUH correlate`;
            }
            messaggioConferma += `\n\nQuesta azione non può essere annullata.`;
        }
        
        // Usa showCustomAlert invece di confirm
        showCustomAlert(messaggioConferma, 
            async () => {
                try {
                    console.log('Eliminazione a cascata per sostanza:', nomeSostanza);
                    
                    // Array per tracciare le operazioni completate
                    const operazioniCompletate = [];
                    
                    // 1. Elimina le frasi H correlate (per Nome_sostanza e CAS)
                    if (countFrasiH > 0) {
                        const deleteFrasiH = await window.electronAPI.executeSQLite(
                            'DELETE FROM "frasi H" WHERE Nome_sostanza = ? OR CAS = ?',
                            [nomeSostanza, casSostanza]
                        );
                        
                        if (deleteFrasiH.success) {
                            operazioniCompletate.push(`${deleteFrasiH.changes} frasi H eliminate`);
                        } else {
                            console.warn('Errore nell\'eliminazione delle frasi H:', deleteFrasiH.message);
                        }
                    }
                    
                    // 2. Elimina le frasi EUH correlate (per CAS)
                    if (countFrasiEUH > 0) {
                        const deleteFrasiEUH = await window.electronAPI.executeSQLite(
                            'DELETE FROM "EUH" WHERE CAS_EK = ?',
                            [casSostanza]
                        );
                        
                        if (deleteFrasiEUH.success) {
                            operazioniCompletate.push(`${deleteFrasiEUH.changes} frasi EUH eliminate`);
                        } else {
                            console.warn('Errore nell\'eliminazione delle frasi EUH:', deleteFrasiEUH.message);
                        }
                    }
                    
                    // 3. Elimina la sostanza principale
                    const result = await window.electronAPI.executeSQLite(
                        'DELETE FROM sostanze WHERE ID = ?',
                        [id]
                    );
                    
                    if (!result.success) {
                        throw new Error(`Errore nell'eliminazione della sostanza: ${result.message}`);
                    }
                    
                    if (result.changes === 0) {
                        throw new Error("Nessuna sostanza eliminata. L'ID potrebbe non esistere.");
                    }
                    
                    // Rimuovi la riga dalla tabella sostanze
                    const row = document.querySelector(`#sostanzeTableBody tr[data-id="${id}"]`);
                    if (row) {
                        row.remove();
                    }
                    
                    // Ricarica le tabelle correlate per riflettere le eliminazioni
                    await Promise.all([
                        loadTabellaRiscontroFrasiH(),
                        loadTabellaRiscontroFrasiEUH()
                    ]);
                    
                    // Costruisci il messaggio di successo
                    let messaggioSuccesso = `Sostanza "${nomeSostanza}" eliminata con successo`;
                    if (operazioniCompletate.length > 0) {
                        messaggioSuccesso += ` (${operazioniCompletate.join(', ')})`;
                    }
                    
                    // Notifica utente
                    showNotification(messaggioSuccesso);
                    
                    // Aggiungi attività
                    addActivity('Sostanza eliminata', `${nomeSostanza} e riferimenti correlati eliminati`, 'fas fa-trash');
                    
                } catch (error) {
                    console.error('Errore nell\'eliminazione a cascata della sostanza:', error);
                    showNotification('Errore nell\'eliminazione: ' + error.message, 'error');
                }
            }
        );
    } catch (error) {
        console.error('Errore nell\'eliminazione della sostanza:', error);
        showNotification('Errore nell\'eliminazione: ' + error.message, 'error');
    }
}

// Funzione di setup per la ricerca e gestione eventi
function setupSostanzeEventListeners() {
    // Input di ricerca
    const searchInput = document.getElementById('sostanzeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const matchCount = ricercaSostanze(this.value);
            const countLabel = document.getElementById('sostanzeMatchCount');
            if (countLabel) {
                countLabel.textContent = matchCount > 0 ? `${matchCount} sostanze trovate` : 'Nessuna sostanza trovata';
            }
        });
    }
    
    // Gestione tasto ESC per annullare modifiche
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sostanzeInEditMode) {
            annullaSostanzeModificate();
        }
    });
}

// Carica la tabella frasi H dal database
async function loadTabellaRiscontroFrasiH() {
    try {
        // Ottieni i dati dal database SQLite
        const result = await window.electronAPI.querySQLite('SELECT * FROM "frasi H"', []);
        
        if (result.success) {
            // Salva una copia dei dati originali
            frasiHOriginali = JSON.parse(JSON.stringify(result.data));
            renderTabellaRiscontroFrasiH(result.data);
        } else {
            throw new Error(result.message || 'Errore nel caricamento dei dati');
        }
    } catch (error) {
        console.error('Errore nel caricamento delle frasi H:', error);
        showNotification('Errore nel caricamento delle frasi H', 'error');
        
        // Fallback a dati di esempio in caso di errore
        const frasiHData = [
            {
                ID_PK: 1,
                Nome_sostanza: "Rame",
                CAS: "7440-50-8",
                Hazard_Class_and_Category: "Aquatic Acute 1",
                Hazard_Statement: "H400"
            },
            {
                ID_PK: 2,
                Nome_sostanza: "Rame",
                CAS: "7440-50-8",
                Hazard_Class_and_Category: "Aquatic Chronic 1",
                Hazard_Statement: "H410"
            },
            {
                ID_PK: 3,
                Nome_sostanza: "Piombo",
                CAS: "7439-92-1",
                Hazard_Class_and_Category: "Repr. 1A",
                Hazard_Statement: "H360"
            },
            {
                ID_PK: 4,
                Nome_sostanza: "Piombo",
                CAS: "7439-92-1",
                Hazard_Class_and_Category: "STOT RE 2",
                Hazard_Statement: "H373"
            }
        ];
        
        frasiHOriginali = JSON.parse(JSON.stringify(frasiHData));
        renderTabellaRiscontroFrasiH(frasiHData);
    }
}

// Funzione per ottenere in modo sicuro i valori delle frasi H
function getFraseHValue(item, field, defaultValue = '') {
    if (field in item && item[field] !== null) {
        return item[field].toString();
    }
    return defaultValue;
}

// Renderizza la tabella frasi H
function renderTabellaRiscontroFrasiH(data) {
    const tbody = document.getElementById('frasiHTableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-message">
                    Nessuna frase H disponibile
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        // Ottieni i valori in modo sicuro
        const ID = getFraseHValue(item, 'ID_PK', item.id || '');
        const NomeSostanza = getFraseHValue(item, 'Nome_sostanza');
        const CAS = getFraseHValue(item, 'CAS');
        const HazardClass = getFraseHValue(item, 'Hazard_Class_and_Category');
        const HazardStatement = getFraseHValue(item, 'Hazard_Statement');
        
        const row = document.createElement('tr');
        row.setAttribute('data-id', ID);
        
        // Salva valori come attributi di dati per un recupero più sicuro
        row.setAttribute('data-nome-sostanza', NomeSostanza);
        row.setAttribute('data-cas', CAS);
        row.setAttribute('data-hazard-class', HazardClass);
        row.setAttribute('data-hazard-statement', HazardStatement);
        
        row.innerHTML = `
            <td class="nome-sostanza-cell">${NomeSostanza}</td>
            <td class="cas-cell">${CAS}</td>
            <td class="hazard-statement-cell">${HazardStatement}</td>
            <td class="hazard-class-cell">${HazardClass}</td>
             <!-- <td class="actions-cell">
                <button class="btn btn-sm btn-primary edit-btn" onclick="attivaModeModificaFraseH(${ID})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-success save-btn" onclick="salvaFraseHSingola(${ID})" style="display:none;">
                    <i class="fas fa-save"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
              -->
        `;
        tbody.appendChild(row);
    });
    
    // Reset dello stato di modifica
    frasiHInEditMode = false;
    
    // Rimuovi eventuali classi di modifica dalla tabella
    const table = document.getElementById('frasiHTable');
    if (table) {
        table.classList.remove('edit-mode');
    }
    
    // Aggiorna la lista delle frasi H modificate
    frasiHModificate = [];
}

// Attiva la modalità di modifica per una frase H specifica
function attivaModeModificaFraseH(id) {
    // Se siamo già in modalità modifica, salva prima le modifiche correnti
    if (frasiHInEditMode) {
        const conferma = confirm('Hai delle modifiche non salvate. Vuoi salvare prima di procedere?');
        if (conferma) {
            salvaFrasiHModificate();
        }
    }
    
    // Trova la riga da modificare
    const row = document.querySelector(`#frasiHTableBody tr[data-id="${id}"]`);
    if (!row) return;
    
    // Se la riga è già in modalità modifica, non fare nulla
    if (row.classList.contains('edit-mode')) {
        return;
    }
    
    // Aggiungi classe alla tabella e alla riga per indicare modalità modifica
    document.getElementById('frasiHTable').classList.add('edit-mode');
    row.classList.add('edit-mode');
    
    // Ottieni i valori correnti
    const nomeSostanzaCell = row.querySelector('.nome-sostanza-cell');
    const casCell = row.querySelector('.cas-cell');
    const hazardStatementCell = row.querySelector('.hazard-statement-cell');
    const hazardClassCell = row.querySelector('.hazard-class-cell');
    
    // Memorizza i valori originali come attributi data-*
    nomeSostanzaCell.setAttribute('data-original', nomeSostanzaCell.textContent);
    casCell.setAttribute('data-original', casCell.textContent);
    hazardStatementCell.setAttribute('data-original', hazardStatementCell.textContent);
    hazardClassCell.setAttribute('data-original', hazardClassCell.textContent);
    
    // Usa il valore degli attributi data-* salvati nella riga
    const nomeSostanzaValue = row.getAttribute('data-nome-sostanza') || '';
    const casValue = row.getAttribute('data-cas') || '';
    const hazardStatementValue = row.getAttribute('data-hazard-statement') || '';
    const hazardClassValue = row.getAttribute('data-hazard-class') || '';
    
    // Trasforma le celle in campi di input
    nomeSostanzaCell.innerHTML = `<input type="text" value="${nomeSostanzaValue}" class="nome-sostanza-input">`;
    casCell.innerHTML = `<input type="text" value="${casValue}" class="cas-input">`;
    hazardStatementCell.innerHTML = `<input type="text" value="${hazardStatementValue}" class="hazard-statement-input">`;
    hazardClassCell.innerHTML = `<input type="text" value="${hazardClassValue}" class="hazard-class-input">`;
    
    // Aggiungi classe editable alle celle per gli stili
    nomeSostanzaCell.classList.add('editable');
    casCell.classList.add('editable');
    hazardStatementCell.classList.add('editable');
    hazardClassCell.classList.add('editable');
    
    // Imposta lo stato di modifica
    frasiHInEditMode = true;
    
    // Nascondi il bottone modifica e mostra il bottone salva nella riga
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    if (editBtn && saveBtn) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
    }
    
    // Aggiungi questa frase H alla lista delle modificate
    if (!frasiHModificate.includes(id)) {
        frasiHModificate.push(id);
    }
}

// Funzione per salvare una singola frase H
async function salvaFraseHSingola(id) {
    try {
        console.log('Salvataggio frase H con ID:', id);
        
        // Trova la riga da salvare
        const row = document.querySelector(`#frasiHTableBody tr[data-id="${id}"]`);
        if (!row) {
            console.error('Riga non trovata');
            return;
        }
        
        // Ottieni i valori dai campi input
        const nomeSostanzaInput = row.querySelector('.nome-sostanza-input');
        const casInput = row.querySelector('.cas-input');
        const hazardStatementInput = row.querySelector('.hazard-statement-input');
        const hazardClassInput = row.querySelector('.hazard-class-input');
        
        if (!nomeSostanzaInput || !casInput || !hazardStatementInput || !hazardClassInput) {
            console.error('Uno o più campi non trovati');
            showNotification('Errore: campi non trovati', 'error');
            return;
        }
        
        // Crea oggetto con i dati aggiornati
        const updatedFraseH = {
            ID_PK: id,
            Nome_sostanza: nomeSostanzaInput.value.trim(),
            CAS: casInput.value.trim(),
            Hazard_Statement: hazardStatementInput.value.trim(),
            Hazard_Class_and_Category: hazardClassInput.value.trim()
        };
        
        console.log('Dati aggiornati:', updatedFraseH);
        
        // Usa l'API per aggiornare il database
        const result = await window.electronAPI.executeSQLite(
            'UPDATE "frasi H" SET Nome_sostanza = ?, CAS = ?, Hazard_Statement = ?, Hazard_Class_and_Category = ? WHERE ID_PK = ?',
            [updatedFraseH.Nome_sostanza, updatedFraseH.CAS, updatedFraseH.Hazard_Statement, updatedFraseH.Hazard_Class_and_Category, updatedFraseH.ID_PK]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'aggiornamento: ${result.message}`);
        }
        
        // Rimuovi dalla lista delle modificate
        frasiHModificate = frasiHModificate.filter(item => item !== id);
        
        // Se non ci sono più frasi H in modifica, reset della modalità
        if (frasiHModificate.length === 0) {
            frasiHInEditMode = false;
            document.getElementById('frasiHTable').classList.remove('edit-mode');
        }
        
        // Ripristina la visualizzazione normale della riga
        ripristinaCelleFraseH(row, updatedFraseH);
        
        // Mostra il bottone modifica e nascondi il bottone salva
        const editBtn = row.querySelector('.edit-btn');
        const saveBtn = row.querySelector('.save-btn');
        if (editBtn && saveBtn) {
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        // Rimuovi classe edit-mode dalla riga
        row.classList.remove('edit-mode');
        
        // Notifica all'utente
        showNotification('Frase H aggiornata con successo');
        
        // Aggiungi attività
        addActivity('Frase H aggiornata', `Modificata frase H ID: ${id}`, 'fas fa-exclamation-triangle');
        
    } catch (error) {
        console.error('Errore nel salvataggio della frase H:', error);
        showNotification('Errore nel salvataggio: ' + error.message, 'error');
    }
}

// Funzione per ripristinare l'aspetto normale delle celle dopo il salvataggio
function ripristinaCelleFraseH(row, fraseH) {
    // Aggiorna le celle con i nuovi valori
    const nomeSostanzaCell = row.querySelector('.nome-sostanza-cell');
    const casCell = row.querySelector('.cas-cell');
    const hazardStatementCell = row.querySelector('.hazard-statement-cell');
    const hazardClassCell = row.querySelector('.hazard-class-cell');
    
    if (nomeSostanzaCell) {
        nomeSostanzaCell.textContent = fraseH.Nome_sostanza;
        nomeSostanzaCell.classList.remove('editable');
    }
    
    if (casCell) {
        casCell.textContent = fraseH.CAS;
        casCell.classList.remove('editable');
    }
    
    if (hazardStatementCell) {
        hazardStatementCell.textContent = fraseH.Hazard_Statement;
        hazardStatementCell.classList.remove('editable');
    }
    
    if (hazardClassCell) {
        hazardClassCell.textContent = fraseH.Hazard_Class_and_Category;
        hazardClassCell.classList.remove('editable');
    }
    
    // Aggiorna anche gli attributi data-* della riga
    row.setAttribute('data-nome-sostanza', fraseH.Nome_sostanza);
    row.setAttribute('data-cas', fraseH.CAS);
    row.setAttribute('data-hazard-statement', fraseH.Hazard_Statement);
    row.setAttribute('data-hazard-class', fraseH.Hazard_Class_and_Category);
}

// Funzione per salvare tutte le frasi H modificate
async function salvaFrasiHModificate() {
    try {
        if (frasiHModificate.length === 0) {
            showNotification('Nessuna modifica da salvare', 'warning');
            return;
        }
        
        console.log('Salvataggio modifiche per le seguenti ID:', frasiHModificate);
        
        const updates = [];
        
        // Raccogli tutte le modifiche
        for (const id of frasiHModificate) {
            const row = document.querySelector(`#frasiHTableBody tr[data-id="${id}"]`);
            if (!row) {
                console.warn(`Riga con ID ${id} non trovata`);
                continue;
            }
            
            const nomeSostanzaInput = row.querySelector('.nome-sostanza-input');
            const casInput = row.querySelector('.cas-input');
            const hazardStatementInput = row.querySelector('.hazard-statement-input');
            const hazardClassInput = row.querySelector('.hazard-class-input');
            
            if (!nomeSostanzaInput || !casInput || !hazardStatementInput || !hazardClassInput) {
                console.warn(`Alcuni input non trovati per la riga ${id}`);
                continue;
            }
            
            // Crea oggetto con i dati aggiornati
            const updatedFraseH = {
                ID_PK: id,
                Nome_sostanza: nomeSostanzaInput.value.trim(),
                CAS: casInput.value.trim(),
                Hazard_Statement: hazardStatementInput.value.trim(),
                Hazard_Class_and_Category: hazardClassInput.value.trim()
            };
            
            console.log('Dati da aggiornare:', updatedFraseH);
            updates.push(updatedFraseH);
        }
        
        // Verifica se ci sono effettivamente modifiche da salvare
        if (updates.length === 0) {
            showNotification('Nessuna modifica valida da salvare', 'warning');
            return;
        }
        
        // Esegui gli aggiornamenti nel database
        for (const fraseH of updates) {
            console.log('Esecuzione query per ID:', fraseH.ID_PK);
            // Usa l'API per aggiornare il database
            const result = await window.electronAPI.executeSQLite(
                'UPDATE "frasi H" SET Nome_sostanza = ?, CAS = ?, Hazard_Statement = ?, Hazard_Class_and_Category = ? WHERE ID_PK = ?',
                [fraseH.Nome_sostanza, fraseH.CAS, fraseH.Hazard_Statement, fraseH.Hazard_Class_and_Category, fraseH.ID_PK]
            );
            
            console.log('Risultato query:', result);
            
            if (!result.success) {
                throw new Error(`Errore nell'aggiornamento della frase H ID ${fraseH.ID_PK}: ${result.message}`);
            }
        }
        
        // Ricarica i dati aggiornati
        await loadTabellaRiscontroFrasiH();
        
        showNotification(`${updates.length} frasi H aggiornate con successo`);
        
        // Aggiungi attività
        addActivity('Tabella frasi H aggiornata', `Modificate ${updates.length} frasi H`, 'fas fa-exclamation-triangle');
        
    } catch (error) {
        console.error('Errore nel salvataggio delle modifiche alle frasi H:', error);
        showNotification('Errore nel salvataggio delle modifiche: ' + error.message, 'error');
    }
}

// Annulla le modifiche alle frasi H e ripristina i valori originali
function annullaFrasiHModificate() {
    if (frasiHModificate.length === 0) return;
    
    const table = document.getElementById('frasiHTable');
    table.classList.remove('edit-mode');
    
    // Ripristina i valori originali
    for (const id of frasiHModificate) {
        const row = document.querySelector(`#frasiHTableBody tr[data-id="${id}"]`);
        if (!row) continue;
        
        const nomeSostanzaCell = row.querySelector('.nome-sostanza-cell');
        const casCell = row.querySelector('.cas-cell');
        const hazardStatementCell = row.querySelector('.hazard-statement-cell');
        const hazardClassCell = row.querySelector('.hazard-class-cell');
        
        if (nomeSostanzaCell.classList.contains('editable')) {
            nomeSostanzaCell.textContent = nomeSostanzaCell.getAttribute('data-original') || '';
            nomeSostanzaCell.classList.remove('editable');
        }
        
        if (casCell.classList.contains('editable')) {
            casCell.textContent = casCell.getAttribute('data-original') || '';
            casCell.classList.remove('editable');
        }
        
        if (hazardStatementCell.classList.contains('editable')) {
            hazardStatementCell.textContent = hazardStatementCell.getAttribute('data-original') || '';
            hazardStatementCell.classList.remove('editable');
        }
        
        if (hazardClassCell.classList.contains('editable')) {
            hazardClassCell.textContent = hazardClassCell.getAttribute('data-original') || '';
            hazardClassCell.classList.remove('editable');
        }
        
        // Ripristina i bottoni
        const editBtn = row.querySelector('.edit-btn');
        const saveBtn = row.querySelector('.save-btn');
        if (editBtn && saveBtn) {
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        // Rimuovi classe edit-mode dalla riga
        row.classList.remove('edit-mode');
    }
    
    frasiHInEditMode = false;
    frasiHModificate = [];
    
    showNotification('Modifiche annullate');
}

// Funzione per eliminare una frase H
async function eliminaFraseH(id) {
    try {
        // Validazione dell'ID
        if (!id || isNaN(parseInt(id))) {
            throw new Error(`ID non valido: ${id}`);
        }
        
        // Usa showCustomAlert invece di confirm
        showCustomAlert(`Sei sicuro di voler eliminare questa frase H? Questa azione non può essere annullata.`, 
            async () => {
                console.log('Eliminazione frase H con ID:', id);
                
                // Usa l'API per eliminare dal database - Nota le virgolette per gestire lo spazio nel nome della tabella
                const result = await window.electronAPI.executeSQLite(
                    'DELETE FROM "frasi H" WHERE ROWID = ?',
                    [id]
                );
                
                if (!result.success) {
                    throw new Error(`Errore nell'eliminazione: ${result.message}`);
                }
                
                // Verifica quante righe sono state modificate
                console.log(`Righe eliminate: ${result.changes}`);
                
                if (result.changes === 0) {
                    throw new Error("Nessuna riga eliminata. L'ID potrebbe non esistere.");
                }
                
                // Rimuovi la riga dalla tabella
                const row = document.querySelector(`#frasiHTableBody tr[data-id="${id}"]`);
                if (row) {
                    row.remove();
                }
                
                // Notifica utente
                showNotification('Frase H eliminata con successo');
                
                // Aggiungi attività
                addActivity('Frase H eliminata', `Eliminata frase H ID: ${id}`, 'fas fa-trash');
            }
        );
    } catch (error) {
        console.error('Errore nell\'eliminazione della frase H:', error);
        showNotification('Errore nell\'eliminazione: ' + error.message, 'error');
    }
}

// Funzione di supporto per cercare frasi H nella tabella
function ricercaFrasiH(query) {
    query = query.toLowerCase().trim();
    const table = document.getElementById('frasiHTable');
    const rows = table.querySelectorAll('tbody tr');
    
    let matchCount = 0;
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
            matchCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    return matchCount;
}

// Funzione per setup degli event listeners delle frasi H
function setupFrasiHEventListeners() {
    // Input di ricerca
    const searchInput = document.getElementById('frasiHSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const matchCount = ricercaFrasiH(this.value);
            const countLabel = document.getElementById('frasiHMatchCount');
            if (countLabel) {
                countLabel.textContent = matchCount > 0 ? `${matchCount} frasi H trovate` : 'Nessuna frase H trovata';
            }
        });
    }
    
    // Gestione tasto ESC per annullare modifiche
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && frasiHInEditMode) {
            annullaFrasiHModificate();
        }
    });
}

// Funzione per l'inserimento di una nuova frase H
async function inserisciNuovaFraseH(datiNuovaFraseH) {
    try {
        // Validazione dei dati
        if (!datiNuovaFraseH.Nome_sostanza || !datiNuovaFraseH.Hazard_Statement) {
            showNotification('Nome sostanza e Hazard Statement sono obbligatori', 'warning');
            return false;
        }
        
        // Usa l'API per inserire nel database senza specificare ID_PK
        const result = await window.electronAPI.executeSQLite(
            'INSERT INTO "frasi H" (Nome_sostanza, CAS, Hazard_Statement, Hazard_Class_and_Category) VALUES (?, ?, ?, ?)',
            [datiNuovaFraseH.Nome_sostanza, datiNuovaFraseH.CAS, datiNuovaFraseH.Hazard_Statement, datiNuovaFraseH.Hazard_Class_and_Category]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'inserimento: ${result.message}`);
        }
        
        const newFraseHId = result.lastID;
        console.log(`Frase H inserita con ROWID: ${newFraseHId}`);
        
        // Aggiorniamo l'ID_PK per corrispondere al ROWID
        await window.electronAPI.executeSQLite(
            'UPDATE "frasi H" SET ID_PK = ? WHERE ROWID = ?',
            [newFraseHId, newFraseHId]
        );
        
        // Ricarica la tabella per mostrare la nuova frase H
        await loadTabellaRiscontroFrasiH();
        
        // Notifica utente
        showNotification('Nuova frase H inserita con successo');
        
        // Aggiungi attività
        addActivity('Frase H inserita', `Nuova frase H: ${datiNuovaFraseH.Hazard_Statement} per ${datiNuovaFraseH.Nome_sostanza}`, 'fas fa-plus');
        
        return true;
    } catch (error) {
        console.error('Errore nell\'inserimento della frase H:', error);
        showNotification('Errore nell\'inserimento: ' + error.message, 'error');
        return false;
    }
}


// Imposta i gestori eventi per i form
function setupFormHandlers() {
    // Bottone per completare le modifiche
    const completaModificheBtn = document.getElementById('completaModificheBtn');
    if (completaModificheBtn) {
        completaModificheBtn.addEventListener('click', completaModifiche);
    }

    // Aggiungi campo di ricerca per la tabella di confronto
    const confrontoSearchInput = document.getElementById('confrontoSearchInput');
    if (confrontoSearchInput) {
        confrontoSearchInput.addEventListener('input', function() {
            ricercaTabellaConfronto(this.value);
        });
    }
    
    // Bottone per aggiungere frase H
    const aggiungiHBtn = document.getElementById('aggiungiHBtn');
    if (aggiungiHBtn) {
        aggiungiHBtn.addEventListener('click', aggiungiCampoFraseH);
    }
    
    // Bottone per aggiungere frase EUH
    const aggiungiEUHBtn = document.getElementById('aggiungiEUHBtn');
    if (aggiungiEUHBtn) {
        aggiungiEUHBtn.addEventListener('click', aggiungiCampoFraseEUH);
    }
    
    // Bottone per inserire nuova sostanza
    const inserisciSostanzaBtn = document.getElementById('inserisciSostanzaBtn');
    if (inserisciSostanzaBtn) {
        inserisciSostanzaBtn.addEventListener('click', inserisciNuovaSostanza);
    }
    
    
    // Bottone per inserire nuovo sale
    const inserisciSaleBtn = document.getElementById('inserisciSaleBtn');
    if (inserisciSaleBtn) {
        // Rimuovi il vecchio event listener e aggiungi quello nuovo
        const newInserisciSaleBtn = inserisciSaleBtn.cloneNode(true);
        inserisciSaleBtn.parentNode.replaceChild(newInserisciSaleBtn, inserisciSaleBtn);
        newInserisciSaleBtn.addEventListener('click', inserisciNuovoSaleConFrasiValidato);
    }

    // Bottone per aggiungere frase H per i sali
    const aggiungiHSaleBtn = document.getElementById('aggiungiHSaleBtn');
    if (aggiungiHSaleBtn) {
        aggiungiHSaleBtn.addEventListener('click', aggiungiCampoFraseHSale);
    }

    // Bottone per aggiungere frase EUH per i sali
    const aggiungiEUHSaleBtn = document.getElementById('aggiungiEUHSaleBtn');
    if (aggiungiEUHSaleBtn) {
        aggiungiEUHSaleBtn.addEventListener('click', aggiungiCampoFraseEUHSale);
    }

    // Gestisci rimozione frasi per i sali
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-frase-sale-btn') || e.target.closest('.remove-frase-sale-btn')) {
            const btn = e.target.classList.contains('remove-frase-sale-btn') ? e.target : e.target.closest('.remove-frase-sale-btn');
            const row = btn.closest('.frase-h-sale-row') || btn.closest('.frase-euh-sale-row');
            if (row) {
                row.remove();
            }
        }
    });
    

    
    // Ricerca nelle tabelle
    const saliSearchInput = document.getElementById('saliSearchInput');
    if (saliSearchInput) {
        saliSearchInput.addEventListener('input', function() {
            ricercaTabella(this.value, 'saliTable');
        });
    }
    
    const sostanzeSearchInput = document.getElementById('sostanzeSearchInput');
    if (sostanzeSearchInput) {
        sostanzeSearchInput.addEventListener('input', function() {
            ricercaTabella(this.value, 'sostanzeTable');
        });
    }
    
    const frasiHSearchInput = document.getElementById('frasiHSearchInput');
    if (frasiHSearchInput) {
        frasiHSearchInput.addEventListener('input', function() {
            ricercaTabella(this.value, 'frasiHTable');
        });
    }
    
    // Gestisci rimozione frasi
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-frase-btn') || e.target.closest('.remove-frase-btn')) {
            const btn = e.target.classList.contains('remove-frase-btn') ? e.target : e.target.closest('.remove-frase-btn');
            const row = btn.closest('.frase-h-row') || btn.closest('.frase-euh-row');
            if (row) {
                row.remove();
            }
        }
    });
}


// Funzione di utility per controllare se un elemento esiste nel DOM
function elementExists(id) {
    return document.getElementById(id) !== null;
}

// Funzione di utility per creare elementi UI dinamicamente
function createUIElement(type, id, className, innerHTML, parentElement) {
    // Controlla se l'elemento esiste già
    if (elementExists(id)) {
        return document.getElementById(id);
    }
    
    // Crea un nuovo elemento
    const element = document.createElement(type);
    if (id) element.id = id;
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    
    // Aggiungi al parent se fornito
    if (parentElement) {
        parentElement.appendChild(element);
    }
    
    return element;
}

// Funzione per assicurarsi che la struttura UI sia corretta per la tabella di confronto
function ensureConfrontoUIStructure() {
    // Verifica che esista la sezione aggiornamenti
    const aggiornamenti = document.getElementById('aggiornamenti');
    if (!aggiornamenti) {
        console.error("Sezione 'aggiornamenti' non trovata");
        return false;
    }
    
    // Verifica che esista una data-table all'interno
    let dataTable = aggiornamenti.querySelector('.data-table');
    if (!dataTable) {
        dataTable = createUIElement('div', null, 'data-table', '', aggiornamenti);
    }
    
    // Verifica che esista un'intestazione
    let heading = dataTable.querySelector('h3');
    if (!heading) {
        heading = createUIElement('h3', null, null, 'Tabella Confronto', dataTable);
    }
    
    // Verifica che esista un table-actions
    let tableActions = dataTable.querySelector('.table-actions');
    if (!tableActions) {
        tableActions = createUIElement('div', null, 'table-actions', '', dataTable);
    }
    
    // Verifica che esista un campo di ricerca
    let searchWrapper = tableActions.querySelector('.search-wrapper');
    if (!searchWrapper) {
        searchWrapper = createUIElement('div', null, 'search-wrapper', `
            <i class="fas fa-search search-icon"></i>
            <input type="text" id="confrontoSearchInput" placeholder="Cerca sostanza..." class="search-input">
        `, tableActions);
    }
    
    // Verifica che esista un container per il conteggio
    let matchCount = tableActions.querySelector('.match-count');
    if (!matchCount) {
        matchCount = createUIElement('div', 'confrontoMatchCount', 'match-count', '', tableActions);
    }
    
    // Verifica che esista la tabella di confronto
    let confrontoTable = dataTable.querySelector('#confrontoTable');
    if (!confrontoTable) {
        confrontoTable = createUIElement('table', 'confrontoTable', 'riscontro-table', `
            <thead>
                <tr>
                    <th>Sostanza</th>
                    <th>CAS</th>
                    <th>Valori Modificati</th>
                    <th>Stato</th>
                    <!-- <th>Azioni</th> -->
                </tr>
            </thead>
            <tbody id="confrontoTableBody">
                <!-- Dati caricati dinamicamente -->
            </tbody>
        `, dataTable);
    }
    
    // Verifica che esista il container per le sostanze modificate
    let modificatiContainer = dataTable.querySelector('#modificatiContainer');
    if (!modificatiContainer) {
        modificatiContainer = createUIElement('div', 'modificatiContainer', 'mt-4', `
            <h3>Sostanze Modificate</h3>
            <table class="riscontro-table" id="modificatiTable">
                <thead>
                    <tr>
                        <th>Sostanza</th>
                        <th>CAS</th>
                        <th>Valori Modificati</th>
                        <th>Stato</th>
                        <!-- <th>Azioni</th> -->
                    </tr>
                </thead>
                <tbody id="modificatiTableBody">
                    <!-- Sostanze modificate caricate dinamicamente -->
                </tbody>
            </table>
            
            <div class="mt-4 text-right">
                <button id="completaModificheBtn" class="btn btn-primary">
                    <i class="fas fa-check"></i> Completa Modifiche
                </button>
            </div>
        `, dataTable);
        
        // Impostalo come nascosto inizialmente
        modificatiContainer.style.display = 'none';
    }
    
    return true;
}

// Funzione di inizializzazione principale per la sezione confronto
function initConfrontoSection() {
    // Assicurati che la struttura UI sia corretta
    if (!ensureConfrontoUIStructure()) {
        console.error("Impossibile inizializzare la sezione di confronto a causa di problemi nella struttura UI");
        return;
    }
    
    // Imposta gli event listener
    setupConfrontoSearch();
    
    // Imposta l'event listener per il bottone di completamento modifiche
    const completaModificheBtn = document.getElementById('completaModificheBtn');
    if (completaModificheBtn) {
        completaModificheBtn.addEventListener('click', completaModifiche);
    }
    
    // Verifica se ci sono risultati di confronto ECHA e caricali
    if (localStorage.getItem('echaComparisonResults')) {
        loadEchaComparisonResults();
    } else {
        // Carica i dati iniziali se non ci sono risultati ECHA
        loadConfronto();
    }
}


// Aggiungi un campo per la frase H
function aggiungiCampoFraseH() {
    const container = document.getElementById('frasiHContainer');
    const row = document.createElement('div');
    row.className = 'frase-h-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Frase H <span class="text-danger" style="color: red;">*</span></label>
            <input type="text" class="form-control frase-h-input" placeholder="Frase H">
        </div>
        <div class="form-group">
            <label>Hazard Class and Category <span class="text-danger" style="color: red;">*</span></label>
            <select class="form-control hazard-class-select" disabled>
                <option value="">Seleziona prima una frase H</option>
            </select>
        </div>
        <button type="button" class="btn btn-sm btn-danger remove-frase-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
    
    // Aggiungi event listener alla frase H input
    const fraseHInput = row.querySelector('.frase-h-input');
    fraseHInput.addEventListener('input', function() {
        updateHazardClassOptions(this);
    });
    
    // Aggiungi event listener per il bottone di rimozione
    const removeBtn = row.querySelector('.remove-frase-btn');
    removeBtn.addEventListener('click', function() {
        row.remove();
    });
}




// Funzione per convertire le righe esistenti sostituendo solo l'input hazard-class-input con un select
function sostituisciHazardClassInputConSelect() {
    const container = document.getElementById('frasiHContainer');
    if (!container) return;
    
    // Sostituisci la funzione originale per garantire che le nuove righe usino il select
    window.aggiungiCampoFraseH = aggiungiCampoFraseH;
    
    // Converti le righe esistenti
    const rows = container.querySelectorAll('.frase-h-row');
    rows.forEach(row => {
        const fraseHInput = row.querySelector('.frase-h-input');
        const hazardClassInput = row.querySelector('.hazard-class-input');
        
        if (hazardClassInput) {
            // Conserva il valore originale
            const hazardClassValue = hazardClassInput.value.trim();
            
            // Crea il container per il select (sostituisce il form-group del vecchio input)
            const hazardClassFormGroup = hazardClassInput.parentNode;
            
            // Crea il nuovo select
            const selectHTML = `
                <label>Hazard Class and Category <span class="text-danger" style="color: red;">*</span></label>
                <select class="form-control hazard-class-select" disabled>
                    <option value="">Seleziona prima una frase H</option>
                </select>
            `;
            
            hazardClassFormGroup.innerHTML = selectHTML;
            
            // Se c'è un campo fraseH con un valore, aggiorna le opzioni
            if (fraseHInput) {
                const fraseHValue = fraseHInput.value.trim();
                
                if (fraseHValue && frasiHValide.includes(fraseHValue)) {
                    const hazardClassSelect = hazardClassFormGroup.querySelector('.hazard-class-select');
                    
                    // Popola le opzioni di Hazard Class
                    hazardClassSelect.disabled = false;
                    
                    // Rimuovi l'opzione predefinita
                    hazardClassSelect.innerHTML = '';
                    
                    // Aggiungi opzione vuota predefinita
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Seleziona un Hazard Class';
                    hazardClassSelect.appendChild(defaultOption);
                    
                    // Aggiungi opzioni in base alla frase H
                    if (frasiHToHazardClass[fraseHValue]) {
                        frasiHToHazardClass[fraseHValue].forEach(hazardClass => {
                            const option = document.createElement('option');
                            option.value = hazardClass;
                            option.textContent = hazardClass;
                            
                            // Seleziona automaticamente l'opzione che corrisponde al valore precedente
                            if (hazardClass === hazardClassValue) {
                                option.selected = true;
                            }
                            
                            hazardClassSelect.appendChild(option);
                        });
                    }
                }
                
                // Aggiungi event listener all'input della frase H
                fraseHInput.addEventListener('input', function() {
                    updateHazardClassOptions(this);
                });
            }
        }
    });
}

// Modifica la funzione di reset del form
function patchResetFormFunction() {
    // Salva il riferimento alla funzione originale
    const originalResetFormNuovaSostanza = window.resetFormNuovaSostanza;
    
    // Sostituisci la funzione originale
    window.resetFormNuovaSostanza = function() {
        // Esegui il reset originale
        if (typeof originalResetFormNuovaSostanza === 'function') {
            originalResetFormNuovaSostanza();
        } else {
            // Reset di base se la funzione originale non è disponibile
            document.getElementById('nomeSostanza').value = '';
            document.getElementById('codCAS').value = '';
            document.getElementById('categoriaSostanza').value = '';
            
            // Reset frasi H - mantieni solo una riga vuota con le nuove componenti
            document.getElementById('frasiHContainer').innerHTML = '';
            aggiungiCampoFraseH();
        }
        
        // Rimuovi eventuali errori residui
        document.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
        });
        document.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });
    };
}

// Modifica la funzione di inserimento nuova sostanza
function patchInserisciNuovaSostanzaFunction() {
    // Salva il riferimento alla funzione originale
    const originalInserisciNuovaSostanza = window.inserisciNuovaSostanza;
    
    // Sostituisci la funzione originale
    window.inserisciNuovaSostanza = async function() {
        // Prima valida le frasi H e mostra gli errori
        const { tutteValide, fraseHSenzaHazardClass } = validaFrasiH();
        
        // Se ci sono frasi H non valide, interrompi l'inserimento
        if (!tutteValide) {
            showNotification('Ci sono frasi H non valide. Correggi gli errori evidenziati.', 'warning');
            
            // Rimuovi automaticamente gli errori dopo 2 secondi
            setTimeout(() => {
                document.querySelectorAll('.input-error').forEach(el => {
                    el.classList.remove('input-error');
                });
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 2000);
            
            return false;
        }
        
        // Se ci sono frasi H valide ma senza Hazard Class, interrompi l'inserimento
        if (fraseHSenzaHazardClass) {
            showNotification('Seleziona un Hazard Class per ogni frase H inserita', 'warning');
            
            // Rimuovi automaticamente gli errori dopo 2 secondi
            setTimeout(() => {
                document.querySelectorAll('.input-error').forEach(el => {
                    el.classList.remove('input-error');
                });
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 2000);
            
            return false;
        }
        
        // Raccogli i valori dai select prima di eseguire la funzione originale
        document.querySelectorAll('.hazard-class-select:not([disabled])').forEach(select => {
            const value = select.value;
            // Crea un campo nascosto con il valore del select per il salvataggio
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.className = 'hazard-class-input';
            hiddenInput.value = value;
            select.parentNode.appendChild(hiddenInput);
        });
        
        // Chiama la funzione originale
        return await originalInserisciNuovaSostanza();
    };
}




// Funzione principale di inizializzazione
function inizializzaFormFrasiH() {
    // Aggiungi stile CSS per i messaggi di errore
    aggiungiStilePerErrori();
    
    // Modifica la funzione aggiungiCampoFraseH
    window.aggiungiCampoFraseH = aggiungiCampoFraseH;
    
    // Converti le righe esistenti
    sostituisciHazardClassInputConSelect();
    
    // Modifica le funzioni di reset e inserimento
    patchResetFormFunction();
    patchInserisciNuovaSostanzaFunction();
}

// Aggiungi stile CSS per i messaggi di errore
function aggiungiStilePerErrori() {
    // Verifica se lo stile esiste già
    if (!document.getElementById('stileErroriHazard')) {
        const style = document.createElement('style');
        style.id = 'stileErroriHazard';
        style.textContent = `
            .error-message {
                color: #e74c3c;
                font-size: 0.8rem;
                margin-top: 3px;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
}

// Inizializza il form quando il documento è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inizializzaFormFrasiH);
} else {
    inizializzaFormFrasiH();
}




// Aggiungi un campo per la frase EUH
function aggiungiCampoFraseEUH() {
    const container = document.getElementById('frasiEUHContainer');
    const row = document.createElement('div');
    row.className = 'frase-euh-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Frase EUH</label>
            <input type="text" class="form-control frase-euh-input" placeholder="Frase EUH">
        </div>
        <button class="btn btn-sm btn-danger remove-frase-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}


// Funzione per verificare che il nome sostanza non sia già presente nella tabella sali
async function verificaNomeSostanzaVsSali(nomeSostanza) {
    try {
        if (!nomeSostanza || nomeSostanza.trim() === '') {
            return {
                valido: false,
                messaggio: 'Il nome della sostanza non può essere vuoto'
            };
        }

        // Normalizza il nome per la ricerca (trim e converti a lowercase)
        const nomeNormalizzato = nomeSostanza.trim().toLowerCase();
        
        console.log(`Verifica nome sostanza vs sali: Nome='${nomeNormalizzato}'`);
        
        // Ottieni tutti i sali dal database per fare un controllo flessibile
        const result = await window.electronAPI.querySQLite(
            'SELECT ID, Sali, Sinonimi_Col_B_file_ECHA, CAS FROM sali',
            []
        );
        
        if (!result.success) {
            throw new Error(`Errore nel controllo del database: ${result.message}`);
        }
        
        if (result.data && result.data.length > 0) {
            // Prepara il nome per il confronto: rimuovi spazi extra, converti in minuscolo
            const nomeComparazione = nomeNormalizzato.replace(/\s+/g, ' ');
            
            // Cerca corrispondenze nei sali
            for (const sale of result.data) {
                // Controlla sia il nome del sale che i sinonimi
                const campiDaControllare = [
                    { campo: 'Sali', valore: sale.Sali },
                    { campo: 'Sinonimi_Col_B_file_ECHA', valore: sale.Sinonimi_Col_B_file_ECHA }
                ];
                
                for (const campoInfo of campiDaControllare) {
                    if (!campoInfo.valore) continue;
                    
                    const saleComparazione = campoInfo.valore.toLowerCase().replace(/\s+/g, ' ');
                    
                    // 1. Confronto esatto (case-insensitive)
                    if (saleComparazione === nomeComparazione) {
                        return {
                            valido: false,
                            messaggio: `La sostanza "${nomeSostanza}" corrisponde esattamente al sale "${campoInfo.valore}" (CAS: ${sale.CAS || 'N/A'}). Non può essere inserita come sostanza.`,
                            saleCorrispondente: sale,
                            tipoCorrispondenza: 'esatta'
                        };
                    }
                    
                    // 2. Verifica se una è contenuta nell'altra (gestisce abbreviazioni/forme alternative)
                    if (saleComparazione.includes(nomeComparazione) || nomeComparazione.includes(saleComparazione)) {
                        // Se una è contenuta nell'altra e la più corta è almeno 4 caratteri
                        // (per evitare falsi positivi con nomi molto corti come "As", "Pb", etc.)
                        const lunghezzaMinima = Math.min(saleComparazione.length, nomeComparazione.length);
                        
                        if (lunghezzaMinima >= 4) {
                            return {
                                valido: false,
                                messaggio: `La sostanza "${nomeSostanza}" è molto simile al sale "${campoInfo.valore}" (CAS: ${sale.CAS || 'N/A'}). Non può essere inserita come sostanza.`,
                                saleCorrispondente: sale,
                                tipoCorrispondenza: 'contenimento'
                            };
                        }
                    }
                    
                    // 3. Distanza di Levenshtein (misura differenze a livello di carattere)
                    const distanza = calcolaDistanzaLevenshtein(nomeComparazione, saleComparazione);
                    const lunghezzaMassima = Math.max(nomeComparazione.length, saleComparazione.length);
                    
                    // Soglia di similarità: massimo 3 caratteri o 20% della lunghezza, ma solo per nomi abbastanza lunghi
                    const sogliaSimilarità = Math.min(3, Math.floor(lunghezzaMassima * 0.2));
                    
                    if (distanza <= sogliaSimilarità && lunghezzaMassima > 4) {
                        return {
                            valido: false,
                            messaggio: `La sostanza "${nomeSostanza}" è molto simile al sale "${campoInfo.valore}" (CAS: ${sale.CAS || 'N/A'}). Non può essere inserita come sostanza.`,
                            saleCorrispondente: sale,
                            tipoCorrispondenza: 'similarità',
                            distanza: distanza
                        };
                    }
                }
            }
        }
        
        // Se arriviamo qui, il nome non corrisponde a nessun sale
        return {
            valido: true,
            messaggio: '',
            saleCorrispondente: null,
            tipoCorrispondenza: null
        };
        
    } catch (error) {
        console.error('Errore nella verifica nome sostanza vs sali:', error);
        // In caso di errore, restituisci un risultato sicuro che non blocchi l'inserimento
        // ma segnali il problema
        return {
            valido: true, // Permetti l'inserimento in caso di errore di sistema
            messaggio: 'Avviso: Impossibile verificare la corrispondenza con i sali a causa di un errore tecnico: ' + error.message,
            errore: true
        };
    }
}


// Function to check if a substance already exists by both CAS and Name
async function verificaSostanzaEsistente(nomeSostanza, codCAS, allowSimilar = false) {
    try {
        // Normalizza gli input per il confronto
        const nomeNormalizzato = nomeSostanza.trim();
        const casNormalizzato = codCAS.trim();
        
        console.log(`Verifica sostanza: Nome='${nomeNormalizzato}', CAS='${casNormalizzato}'`);
        
        // Prima controlla se esiste una sostanza con lo stesso CAS
        const checkCASResult = await window.electronAPI.querySQLite(
            'SELECT ID, Nome FROM sostanze WHERE CAS = ?',
            [casNormalizzato]
        );
        
        if (checkCASResult.success && checkCASResult.data && checkCASResult.data.length > 0) {
            return {
                esistente: true,
                tipo: 'CAS',
                bloccante: true, // CAS duplicato è sempre bloccante
                messaggio: `Una sostanza con il codice CAS "${codCAS}" è già presente nel database (${checkCASResult.data[0].Nome})`,
                data: checkCASResult.data[0]
            };
        }
        
        // Ottieni tutte le sostanze dal database per fare un controllo più flessibile sul nome
        const allSubstancesResult = await window.electronAPI.querySQLite(
            'SELECT ID, Nome, CAS FROM sostanze',
            []
        );
        
        if (allSubstancesResult.success && allSubstancesResult.data) {
            // Prepara il nome per il confronto: rimuovi spazi extra, converti in minuscolo
            const nomeComparazione = nomeNormalizzato.toLowerCase().replace(/\s+/g, ' ');
            
            // Cerca corrispondenze simili nel nome
            for (const sostanza of allSubstancesResult.data) {
                if (!sostanza.Nome) continue;
                
                const sostanzaComparazione = sostanza.Nome.toLowerCase().replace(/\s+/g, ' ');
                
                // Confronto esatto (case-insensitive)
                if (sostanzaComparazione === nomeComparazione) {
                    return {
                        esistente: true,
                        tipo: 'Nome',
                        bloccante: !allowSimilar, // Può essere bypassato se allowSimilar = true
                        messaggio: `Una sostanza con il nome "${sostanza.Nome}" è già presente nel database (CAS: ${sostanza.CAS})`,
                        data: sostanza
                    };
                }
                
                // Verifica se è molto simile (es. tolleranza piccoli errori di battitura)
                // Opzione 1: una sostanza contiene l'altra (gestisce abbreviazioni/forme alternative)
                if (sostanzaComparazione.includes(nomeComparazione) || nomeComparazione.includes(sostanzaComparazione)) {
                    // Se una è contenuta nell'altra e la più corta è almeno 5 caratteri
                    // (per evitare falsi positivi con nomi molto corti)
                    if (Math.min(sostanzaComparazione.length, nomeComparazione.length) >= 5) {
                        return {
                            esistente: true,
                            tipo: 'NomeSimilare',
                            bloccante: false, // Mai bloccante, sempre con scelta utente
                            messaggio: `Una sostanza con un nome simile "${sostanza.Nome}" è già presente nel database (CAS: ${sostanza.CAS})`,
                            data: sostanza
                        };
                    }
                }
                
                // Opzione 2: distanza di Levenshtein (misura differenze a livello di carattere)
                const distanza = calcolaDistanzaLevenshtein(nomeComparazione, sostanzaComparazione);
                const lunghezzaMassima = Math.max(nomeComparazione.length, sostanzaComparazione.length);
                const sogliaSimilarità = Math.min(3, Math.floor(lunghezzaMassima * 0.2)); // max 3 caratteri o 20% della lunghezza
                
                if (distanza <= sogliaSimilarità && lunghezzaMassima > 4) {
                    return {
                        esistente: true,
                        tipo: 'NomeSimilare',
                        bloccante: false, // Mai bloccante, sempre con scelta utente
                        messaggio: `Una sostanza con un nome simile "${sostanza.Nome}" è già presente nel database (CAS: ${sostanza.CAS})`,
                        data: sostanza
                    };
                }
            }
        }
        
        // Se arriviamo qui, la sostanza non esiste nel database
        return {
            esistente: false,
            tipo: null,
            bloccante: false,
            messaggio: '',
            data: null
        };
    } catch (error) {
        console.error('Errore nella verifica della sostanza esistente:', error);
        // In caso di errore, restituisci un risultato sicuro che non blocchi l'inserimento
        return {
            esistente: false,
            tipo: null,
            bloccante: false,
            messaggio: 'Errore durante la verifica: ' + error.message,
            data: null
        };
    }
}

// Funzione per calcolare la distanza di Levenshtein (misura la differenza tra due stringhe)
function calcolaDistanzaLevenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Inizializza la matrice
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Riempi la matrice
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // sostituzione
                    matrix[i][j - 1] + 1,     // inserimento
                    matrix[i - 1][j] + 1      // eliminazione
                );
            }
        }
    }

    return matrix[b.length][a.length];
}


// Funzione per inserire una nuova sostanza con controlli migliorati per le frasi H
async function inserisciNuovaSostanza() {
    try {
        // Ottieni i valori dal form
        const nomeSostanza = document.getElementById('nomeSostanza').value.trim();
        const codCAS = document.getElementById('codCAS').value.trim();
        const categoria = document.getElementById('categoriaSostanza').value.trim();
        
        // Rimuovi eventuali evidenziazioni di errore precedenti
        document.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
        });
        
        // Rimuovi messaggi di errore precedenti
        document.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });
        
        // Tieni traccia se ci sono errori
        let hasErrors = false;
        let campiConErrore = [];
        
        // Validazione di tutti i campi obbligatori contemporaneamente
        if (!nomeSostanza) {
            document.getElementById('nomeSostanza').classList.add('input-error');
            campiConErrore.push('Nome Sostanza');
            hasErrors = true;
        }
        
        if (!codCAS) {
            document.getElementById('codCAS').classList.add('input-error');
            campiConErrore.push('Codice CAS');
            hasErrors = true;
        }
        
        if (!categoria) {
            document.getElementById('categoriaSostanza').classList.add('input-error');
            campiConErrore.push('Categoria');
            hasErrors = true;
        }
        
        // Se ci sono errori di validazione, mostra una notifica e interrompi
        if (hasErrors) {
            if (campiConErrore.length > 0) {
                const messaggioErrore = `Compila i seguenti campi obbligatori: ${campiConErrore.join(', ')}`;
                showNotification(messaggioErrore, 'warning');
            } else {
                showNotification('Correggi gli errori nei campi evidenziati', 'warning');
            }
            
            // Rimuovi automaticamente gli errori e i messaggi dopo 2 secondi
            setTimeout(() => {
                document.querySelectorAll('.input-error').forEach(el => {
                    el.classList.remove('input-error');
                });
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 2000);
            
            return false;
        }
        
        // NUOVO: Verifica se il nome è presente nella tabella sali
        const verificaSali = await verificaNomeSostanzaVsSali(nomeSostanza);
        if (!verificaSali.valido) {
            // Evidenzia il campo nome con errore
            document.getElementById('nomeSostanza').classList.add('input-error');
            
            // Aggiungi messaggio di errore sotto il campo
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = verificaSali.messaggio;
            document.getElementById('nomeSostanza').parentNode.appendChild(errorDiv);
            
            showNotification(verificaSali.messaggio, 'error', 4000);
            
            // Rimuovi automaticamente l'errore e il messaggio dopo 3 secondi
            setTimeout(() => {
                document.getElementById('nomeSostanza').classList.remove('input-error');
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 4000);
            
            return false;
        }
        
        // NUOVO: Verifica sia CAS che Nome duplicati usando la nuova funzione
        const verificaEsistente = await verificaSostanzaEsistente(nomeSostanza, codCAS);

        if (verificaEsistente.esistente) {
            // Se è CAS duplicato, blocca sempre (più grave)
            if (verificaEsistente.tipo === 'CAS') {
                document.getElementById('codCAS').classList.add('input-error');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = verificaEsistente.messaggio;
                document.getElementById('codCAS').parentNode.appendChild(errorDiv);
                
                showNotification(verificaEsistente.messaggio, 'warning', 4000);
                
                setTimeout(() => {
                    document.querySelectorAll('.input-error').forEach(el => {
                        el.classList.remove('input-error');
                    });
                    document.querySelectorAll('.error-message').forEach(el => {
                        el.remove();
                    });
                }, 4000);
                
                return false;
            } else {
                // Per nomi simili, chiedi conferma con alert semplice
                const conferma = confirm(verificaEsistente.messaggio + '\n\nVuoi procedere comunque con l\'inserimento?');
                if (!conferma) {
                    showNotification('Inserimento annullato', 'info');
                    return false;
                }
                // Se l'utente conferma, continua con l'inserimento normale
            }
        }
        
        // Validazione frasi H (deve esserci almeno una frase H con relativa classe)
        let fraseHValidaTrovata = false;
        const frasiHContainer = document.getElementById('frasiHContainer');
        
        if (frasiHContainer) {
            const rows = frasiHContainer.querySelectorAll('.frase-h-row');
            
            if (rows.length > 0) {
                for (const row of rows) {
                    const fraseHInput = row.querySelector('.frase-h-input');
                    const hazardClassInput = row.querySelector('.hazard-class-input');
                    const hazardClassSelect = row.querySelector('.hazard-class-select:not([disabled])');
                    
                    if (fraseHInput) {
                        const fraseHValue = fraseHInput.value.trim();
                        
                        // Verifica se il campo frase H è compilato
                        if (fraseHValue) {
                            // Verifica se la frase H è valida
                            if (!frasiHValide.includes(fraseHValue)) {
                                // Frase H non valida
                                fraseHInput.classList.add('input-error');
                                
                                // Aggiungi messaggio di errore sotto il campo
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'error-message';
                                errorDiv.textContent = 'Errore frase H non gestita nel classificatore. Contattare il supporto.';
                                fraseHInput.parentNode.appendChild(errorDiv);
                                
                                hasErrors = true;
                            } else {
                                // Controlla se c'è un valore Hazard Class valido
                                let hazardClassValue = '';
                                
                                // Prova a ottenere il valore dalla select o dall'input
                                if (hazardClassSelect && !hazardClassSelect.disabled) {
                                    hazardClassValue = hazardClassSelect.value.trim();
                                } else if (hazardClassInput) {
                                    hazardClassValue = hazardClassInput.value.trim();
                                }
                                
                                if (!hazardClassValue) {
                                    // Hazard class mancante
                                    if (hazardClassSelect) hazardClassSelect.classList.add('input-error');
                                    if (hazardClassInput) hazardClassInput.classList.add('input-error');
                                    hasErrors = true;
                                } else {
                                    // Entrambi i campi sono validi
                                    fraseHValidaTrovata = true;
                                }
                            }
                        } else if (
                            (hazardClassInput && hazardClassInput.value.trim()) || 
                            (hazardClassSelect && hazardClassSelect.value.trim())
                        ) {
                            // Hazard Class compilato ma frase H mancante
                            fraseHInput.classList.add('input-error');
                            hasErrors = true;
                        }
                    }
                }
            }
            
            if (!fraseHValidaTrovata) {
                // Se non abbiamo trovato nessuna frase H valida, aggiungiamo la categoria all'elenco
                campiConErrore.push('Frasi H');
                
                // Se non c'è nessun altro errore di frase H già evidenziato, evidenziamo il primo campo
                if (!document.querySelector('.frase-h-input.input-error')) {
                    const primaRiga = frasiHContainer.querySelector('.frase-h-row');
                    if (primaRiga) {
                        const fraseHInput = primaRiga.querySelector('.frase-h-input');
                        const hazardClassInput = primaRiga.querySelector('.hazard-class-input');
                        const hazardClassSelect = primaRiga.querySelector('.hazard-class-select');
                        
                        if (fraseHInput) fraseHInput.classList.add('input-error');
                        if (hazardClassInput) hazardClassInput.classList.add('input-error');
                        if (hazardClassSelect) hazardClassSelect.classList.add('input-error');
                    }
                }
                
                hasErrors = true;
            }
        }
        
        // Se ci sono errori di validazione, mostra una notifica e interrompi
        if (hasErrors) {
            if (campiConErrore.length > 0) {
                const messaggioErrore = `Compila i seguenti campi obbligatori: ${campiConErrore.join(', ')}`;
                showNotification(messaggioErrore, 'warning');
            } else {
                showNotification('Correggi gli errori nei campi evidenziati', 'warning');
            }
            
            // Rimuovi automaticamente gli errori e i messaggi dopo 2 secondi
            setTimeout(() => {
                document.querySelectorAll('.input-error').forEach(el => {
                    el.classList.remove('input-error');
                });
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 2000);
            
            return false;
        }
        
        // Se tutti i controlli sono passati, procedi con l'inserimento
        console.log('Preparazione inserimento nuova sostanza:', nomeSostanza);
        
        // Usa l'API per inserire la sostanza nel database
        const sostanzaResult = await window.electronAPI.executeSQLite(
            'INSERT INTO sostanze (Nome, CAS, Categoria) VALUES (?, ?, ?)',
            [nomeSostanza, codCAS, categoria]
        );
        
        if (!sostanzaResult.success) {
            throw new Error(`Errore nell'inserimento della sostanza: ${sostanzaResult.message}`);
        }
        
        // lastID contiene il ROWID dell'ultimo record inserito
        const newSostanzaId = sostanzaResult.lastID;
        console.log(`Sostanza inserita con ROWID: ${newSostanzaId}`);
        
        // Aggiorniamo esplicitamente l'ID per assicurarci che corrisponda al ROWID
        await window.electronAPI.executeSQLite(
            'UPDATE sostanze SET ID = ? WHERE ROWID = ?',
            [newSostanzaId, newSostanzaId]
        );
        
        // Raccogli le frasi H
        const frasiH = [];
        document.querySelectorAll('.frase-h-row').forEach(row => {
            const fraseHInput = row.querySelector('.frase-h-input');
            const hazardClassInput = row.querySelector('.hazard-class-input');
            const hazardClassSelect = row.querySelector('.hazard-class-select:not([disabled])');
            
            if (fraseHInput && fraseHInput.value.trim()) {
                let hazardClass = '';
                
                // Cerca il valore hazard class sia nell'input che nella select
                if (hazardClassSelect && hazardClassSelect.value.trim()) {
                    hazardClass = hazardClassSelect.value.trim();
                } else if (hazardClassInput && hazardClassInput.value.trim()) {
                    hazardClass = hazardClassInput.value.trim();
                }
                
                if (hazardClass) {
                    frasiH.push({
                        fraseH: fraseHInput.value.trim(),
                        hazardClass: hazardClass
                    });
                }
            }
        });
        
        // Inserisci le frasi H associate
        for (const frase of frasiH) {
            // Inseriamo la frase H senza ID_PK
            const fraseHResult = await window.electronAPI.executeSQLite(
                'INSERT INTO "frasi H" (Nome_sostanza, CAS, Hazard_Statement, Hazard_Class_and_Category) VALUES (?, ?, ?, ?)',
                [nomeSostanza, codCAS, frase.fraseH, frase.hazardClass]
            );
            
            if (!fraseHResult.success) {
                console.warn(`Avviso: Errore nell'inserimento della frase H ${frase.fraseH}: ${fraseHResult.message}`);
            } else {
                // Aggiorniamo l'ID_PK per corrispondere al ROWID
                const newFraseHId = fraseHResult.lastID;
                await window.electronAPI.executeSQLite(
                    'UPDATE "frasi H" SET ID_PK = ? WHERE ROWID = ?',
                    [newFraseHId, newFraseHId]
                );
                console.log(`Frase H inserita con ROWID: ${newFraseHId}`);
            }
        }
        
        // Raccogli le frasi EUH
        const frasiEUH = [];
        document.querySelectorAll('.frase-euh-row').forEach(row => {
            const fraseEUHInput = row.querySelector('.frase-euh-input');
            
            if (fraseEUHInput && fraseEUHInput.value.trim()) {
                frasiEUH.push(fraseEUHInput.value.trim());
            }
        });
        
        // Inserisci le frasi EUH associate
        for (const fraseEUH of frasiEUH) {
            // Inseriamo la frase EUH senza ID_PK
            const fraseEUHResult = await window.electronAPI.executeSQLite(
                'INSERT INTO "EUH" (EUH, CAS_EK) VALUES (?, ?)',
                [fraseEUH, codCAS]
            );
            
            if (!fraseEUHResult.success) {
                console.warn(`Avviso: Errore nell'inserimento della frase EUH ${fraseEUH}: ${fraseEUHResult.message}`);
            } else {
                // Aggiorniamo l'ID_PK per corrispondere al ROWID
                const newFraseEUHId = fraseEUHResult.lastID;
                await window.electronAPI.executeSQLite(
                    'UPDATE "EUH" SET ID_PK = ? WHERE ROWID = ?',
                    [newFraseEUHId, newFraseEUHId]
                );
                console.log(`Frase EUH inserita con ROWID: ${newFraseEUHId}`);
            }
        }
        
        // Notifica di successo
        showNotification('Sostanza inserita con successo');
        
        // Aggiungi attività
        addActivity('Nuova sostanza', `${nomeSostanza} aggiunta al database`, 'fas fa-atom');
        
        // Reset del form
        resetFormNuovaSostanza();
        
        // Ricarica le tabelle
        await loadTabellaRiscontroSostanze();
        await loadTabellaRiscontroFrasiH();
        if (typeof loadTabellaRiscontroFrasiEUH === 'function') {
            await loadTabellaRiscontroFrasiEUH();
        }
        
        return true;
    } catch (error) {
        console.error('Errore nell\'inserimento della sostanza:', error);
        showNotification('Errore nell\'inserimento della sostanza: ' + error.message, 'error');
        return false;
    }
}


// Aggiungi stile CSS per evidenziare i campi con errore e i messaggi
function aggiungiStileBase() {
    // Verifica se lo stile esiste già
    if (!document.getElementById('stileBaseValidazione')) {
        const style = document.createElement('style');
        style.id = 'stileBaseValidazione';
        style.textContent = `
            .input-error {
                border: 2px solid #e74c3c !important;
                background-color: rgba(231, 76, 60, 0.05) !important;
            }
            
            .error-message {
                color: #e74c3c;
                font-size: 0.8rem;
                margin-top: 3px;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
}

// Inizializza lo stile quando il documento è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aggiungiStileBase);
} else {
    aggiungiStileBase();
}


// Funzione per validare il formato del codice CAS
function validaCodCAS(codCAS) {
    try {
        // Rimuovi spazi e converti a stringa
        const cas = codCAS.toString().trim();
        
        // Verifica che non sia vuoto
        if (!cas) {
            return {
                valido: false,
                messaggio: 'Il codice CAS non può essere vuoto'
            };
        }
        
        // Verifica che contenga solo numeri e trattini
        const soloNumeriETrattini = /^[0-9\-]+$/.test(cas);
        if (!soloNumeriETrattini) {
            return {
                valido: false,
                messaggio: 'Il codice CAS può contenere solo numeri e trattini'
            };
        }
        
        // Conta i trattini
        const numeroTrattini = (cas.match(/\-/g) || []).length;
        
        // Deve avere esattamente 2 trattini
        if (numeroTrattini !== 2) {
            return {
                valido: false,
                messaggio: 'Il codice CAS deve contenere esattamente 2 trattini (formato: XXXX-XX-X)'
            };
        }
        
        // Verifica che non inizi o finisca con un trattino
        if (cas.startsWith('-') || cas.endsWith('-')) {
            return {
                valido: false,
                messaggio: 'Il codice CAS non può iniziare o finire con un trattino'
            };
        }
        
        // Verifica che non ci siano trattini consecutivi
        if (cas.includes('--')) {
            return {
                valido: false,
                messaggio: 'Il codice CAS non può avere trattini consecutivi'
            };
        }
        
        // Dividi per trattini e verifica che ogni parte contenga solo numeri
        const parti = cas.split('-');
        
        // Verifica che ci siano esattamente 3 parti
        if (parti.length !== 3) {
            return {
                valido: false,
                messaggio: 'Il codice CAS deve avere il formato XXXX-XX-X'
            };
        }
        
        // Verifica che ogni parte non sia vuota e contenga solo numeri
        for (let i = 0; i < parti.length; i++) {
            const parte = parti[i];
            
            if (!parte) {
                return {
                    valido: false,
                    messaggio: 'Ogni sezione del codice CAS deve contenere almeno un numero'
                };
            }
            
            if (!/^\d+$/.test(parte)) {
                return {
                    valido: false,
                    messaggio: 'Ogni sezione del codice CAS deve contenere solo numeri'
                };
            }
        }
        
        // Se arriviamo qui, il formato è valido
        return {
            valido: true,
            messaggio: '',
            casFormattato: cas
        };
        
    } catch (error) {
        console.error('Errore nella validazione del codice CAS:', error);
        return {
            valido: false,
            messaggio: 'Errore nella validazione del codice CAS: ' + error.message
        };
    }
}

// Funzione per aggiungere la validazione in tempo reale al campo CAS
function aggiungiValidazioneCAS() {
    // Trova tutti i campi CAS nella pagina
    const campiCAS = document.querySelectorAll('#codCAS, #codCasSale, .cas-input');
    
    campiCAS.forEach(campo => {
        // Rimuovi eventuali listener esistenti per evitare duplicati
        campo.removeEventListener('input', validazioneCASInput);
        campo.removeEventListener('blur', validazioneCASBlur);
        
        // Aggiungi listener per validazione in tempo reale
        campo.addEventListener('input', validazioneCASInput);
        campo.addEventListener('blur', validazioneCASBlur);
    });
}

// Funzione per validazione durante la digitazione (meno invasiva)
function validazioneCASInput(event) {
    const campo = event.target;
    const valore = campo.value.trim();
    
    // Rimuovi eventuali classi di errore e messaggi precedenti
    campo.classList.remove('input-error');
    const messaggioErrore = campo.parentNode.querySelector('.cas-error-message');
    if (messaggioErrore) {
        messaggioErrore.remove();
    }
    
    // Se il campo è vuoto, non mostrare errori durante la digitazione
    if (!valore) {
        return;
    }
    
    // Controllo base durante la digitazione: solo numeri e trattini
    const caratteriValidi = /^[0-9\-]*$/.test(valore);
    if (!caratteriValidi) {
        campo.classList.add('input-error');
        mostraErroreCAS(campo, 'Solo numeri e trattini sono consentiti');
    }
}

// Funzione per validazione completa quando l'utente esce dal campo
function validazioneCASBlur(event) {
    const campo = event.target;
    const valore = campo.value.trim();
    
    // Rimuovi eventuali messaggi di errore precedenti
    const messaggioErrore = campo.parentNode.querySelector('.cas-error-message');
    if (messaggioErrore) {
        messaggioErrore.remove();
    }
    
    // Se il campo è vuoto, non validare (sarà gestito dalla validazione generale del form)
    if (!valore) {
        campo.classList.remove('input-error');
        return;
    }
    
    // Esegui validazione completa
    const risultato = validaCodCAS(valore);
    
    if (!risultato.valido) {
        campo.classList.add('input-error');
        mostraErroreCAS(campo, risultato.messaggio);
    } else {
        campo.classList.remove('input-error');
        // Opzionalmente, formatta il CAS se necessario
        if (risultato.casFormattato && risultato.casFormattato !== valore) {
            campo.value = risultato.casFormattato;
        }
    }
}

// Funzione per mostrare messaggi di errore specifici per CAS
function mostraErroreCAS(campo, messaggio) {
    // Verifica se esiste già un messaggio di errore
    let messaggioErrore = campo.parentNode.querySelector('.cas-error-message');
    
    if (!messaggioErrore) {
        messaggioErrore = document.createElement('div');
        messaggioErrore.className = 'cas-error-message error-message';
        campo.parentNode.appendChild(messaggioErrore);
    }
    
    messaggioErrore.textContent = messaggio;
}

// Integrazione con la funzione inserisciNuovaSostanza esistente
function integraValidazioneCASInInserimento() {
    // Salva il riferimento alla funzione originale
    const originalInserisciNuovaSostanza = window.inserisciNuovaSostanza;
    
    // Sostituisci la funzione originale per includere la validazione CAS
    window.inserisciNuovaSostanza = async function() {
        // Validazione CAS prima dell'inserimento
        const campoCAS = document.getElementById('codCAS');
        if (campoCAS) {
            const risultatoCAS = validaCodCAS(campoCAS.value);
            
            if (!risultatoCAS.valido) {
                // Evidenzia l'errore
                campoCAS.classList.add('input-error');
                mostraErroreCAS(campoCAS, risultatoCAS.messaggio);
                
                showNotification('Correggi il formato del codice CAS', 'warning');
                
                // Rimuovi automaticamente l'errore dopo 3 secondi
                setTimeout(() => {
                    campoCAS.classList.remove('input-error');
                    const messaggioErrore = campoCAS.parentNode.querySelector('.cas-error-message');
                    if (messaggioErrore) {
                        messaggioErrore.remove();
                    }
                }, 3000);
                
                return false;
            }
        }
        
        // Se la validazione CAS è passata, chiama la funzione originale
        return await originalInserisciNuovaSostanza();
    };
}

// Integrazione con inserisciNuovoSale
function integraValidazioneCASInSale() {
    const originalInserisciNuovoSale = window.inserisciNuovoSale;
    
    window.inserisciNuovoSale = async function() {
        // Validazione CAS prima dell'inserimento
        const campoCAS = document.getElementById('codCasSale');
        if (campoCAS) { 
            const risultatoCAS = validaCodCAS(campoCAS.value);
            
            if (!risultatoCAS.valido) {
                campoCAS.classList.add('input-error');
                mostraErroreCAS(campoCAS, risultatoCAS.messaggio);
                
                showNotification('Correggi il formato del codice CAS', 'warning');
                
                setTimeout(() => {
                    campoCAS.classList.remove('input-error');
                    const messaggioErrore = campoCAS.parentNode.querySelector('.cas-error-message');
                    if (messaggioErrore) {
                        messaggioErrore.remove();
                    }
                }, 3000);
                
                return false;
            }
        }
        
        return await originalInserisciNuovoSale();
    };
}

// Aggiungi CSS per gli errori CAS se non esiste già
function aggiungiStileCAS() {
    if (!document.getElementById('stileCASValidazione')) {
        const style = document.createElement('style');
        style.id = 'stileCASValidazione';
        style.textContent = `
            .cas-error-message {
                color: #e74c3c;
                font-size: 0.8rem;
                margin-top: 3px;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
}

// Inizializzazione
function inizializzaValidazioneCAS() {
    aggiungiStileCAS();
    aggiungiValidazioneCAS();
    integraValidazioneCASInInserimento();
    integraValidazioneCASInSale();
    
    // Osserva le modifiche al DOM per campi CAS aggiunti dinamicamente
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const nuoviCampiCAS = node.querySelectorAll ? 
                            node.querySelectorAll('#codCAS, #codCasSale, .cas-input') : [];
                        
                        nuoviCampiCAS.forEach(campo => {
                            campo.addEventListener('input', validazioneCASInput);
                            campo.addEventListener('blur', validazioneCASBlur);
                        });
                    }
                });
            }
        });
    });
    
    // Osserva i form container
    const formContainers = document.querySelectorAll('#sostanzeForm, #saliForm');
    formContainers.forEach(container => {
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
        }
    });
}

// Avvia l'inizializzazione quando il documento è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inizializzaValidazioneCAS);
} else {
    inizializzaValidazioneCAS();
}

// Aggiungi stile CSS per evidenziare il campo CAS con errore
function aggiungiStileErroreCAS() {
    // Verifica se lo stile esiste già
    if (!document.getElementById('stileErroreCAS')) {
        const style = document.createElement('style');
        style.id = 'stileErroreCAS';
        style.textContent = `
            .input-error {
                border: 2px solid #e74c3c !important;
                background-color: rgba(231, 76, 60, 0.1) !important;
                animation: pulsaErrore 1.5s ease-in-out;
            }
            
            @keyframes pulsaErrore {
                0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
                100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Inizializza lo stile quando il documento è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aggiungiStileErroreCAS);
} else {
    aggiungiStileErroreCAS();
}

// Reset del form nuova sostanza
function resetFormNuovaSostanza() {
    document.getElementById('nomeSostanza').value = '';
    document.getElementById('codCAS').value = '';
    document.getElementById('categoriaSostanza').value = '';
    
    // Reset frasi H - mantieni solo una riga vuota con i menu a tendina
    document.getElementById('frasiHContainer').innerHTML = `
        <div class="frase-h-row">
            <div class="form-group">
                <label>Frase H <span class="text-danger" style="color: red;">*</span></label>
                <input type="text" class="form-control frase-h-input" placeholder="Frase H">
            </div>
            <div class="form-group">
                <label>Hazard Class and Category <span class="text-danger" style="color: red;">*</span></label>
                <select class="form-control hazard-class-select" disabled>
                    <option value="">Seleziona prima una frase H</option>
                </select>
            </div>
            <button type="button" class="btn btn-sm btn-danger remove-frase-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Reset frasi EUH
    document.getElementById('frasiEUHContainer').innerHTML = '';
    
    // Aggiungi event listener alla frase H input
    const fraseHInput = document.querySelector('.frase-h-input');
    if (fraseHInput) {
        fraseHInput.addEventListener('input', function() {
            updateHazardClassOptions(this);
        });
    }
    
    // Rimuovi eventuali errori residui
    document.querySelectorAll('.input-error').forEach(el => {
        el.classList.remove('input-error');
    });
    document.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });
}


// Modifica la funzione inserisciNuovoSale esistente per includere frasi H e EUH
async function inserisciNuovoSaleConFrasiValidato() {
    try {
        // Ottieni i valori dal form
        const nomeSale = document.getElementById('nomeSale').value.trim();
        const fattoreConversione = document.getElementById('fattoreConversione').value.trim();
        const codCasSale = document.getElementById('codCasSale').value.trim();
        const sostanzaAssociataSelect = document.getElementById('sostanzaAssociata');
        
        // Rimuovi eventuali evidenziazioni di errore precedenti
        document.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
        });
        
        // Rimuovi messaggi di errore precedenti
        document.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });
        
        // Validazione base
        let hasErrors = false;
        let campiConErrore = [];
        
        if (!nomeSale) {
            document.getElementById('nomeSale').classList.add('input-error');
            campiConErrore.push('Nome Sale');
            hasErrors = true;
        }
        
        if (!fattoreConversione || isNaN(parseFloat(fattoreConversione))) {
            document.getElementById('fattoreConversione').classList.add('input-error');
            campiConErrore.push('Fattore di Conversione');
            hasErrors = true;
        } else if (fattoreConversione.includes(',')) {
            // Controllo specifico per la virgola
            document.getElementById('fattoreConversione').classList.add('input-error');
            
            // Aggiungi messaggio di errore specifico
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'Usa il punto (.) come separatore decimale, non la virgola (,)';
            document.getElementById('fattoreConversione').parentNode.appendChild(errorDiv);
            
            showNotification('Il fattore di conversione deve usare il punto come separatore decimale (es. 1.11)', 'warning');
            hasErrors = true;
        }
        
        // Validazione Metallo Associato
        if (!sostanzaAssociataSelect || sostanzaAssociataSelect.selectedIndex === 0) {
            document.getElementById('sostanzaAssociata').classList.add('input-error');
            campiConErrore.push('Metallo Associato');
            hasErrors = true;
        }

        // Validazione Codice CAS (obbligatorio)
        if (!codCasSale) {
            document.getElementById('codCasSale').classList.add('input-error');
            campiConErrore.push('Codice CAS');
            hasErrors = true;
        }


        // Se ci sono errori di base, mostra notifica e interrompi
        if (hasErrors) {
            const messaggioErrore = `Compila i seguenti campi obbligatori: ${campiConErrore.join(', ')}`;
            showNotification(messaggioErrore, 'warning');
            
            setTimeout(() => {
                document.querySelectorAll('.input-error').forEach(el => {
                    el.classList.remove('input-error');
                });
            }, 2000);
            
            return false;
        }
        
        // NUOVO: Verifica se il nome sale è già presente nel database
        const verificaDuplicati = await verificaNomeSaleEsistente(nomeSale);
        if (!verificaDuplicati.valido) {
            // Evidenzia il campo nome con errore
            document.getElementById('nomeSale').classList.add('input-error');
            
            // Aggiungi messaggio di errore sotto il campo
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = verificaDuplicati.messaggio;
            document.getElementById('nomeSale').parentNode.appendChild(errorDiv);
            
            showNotification(verificaDuplicati.messaggio, 'error', 4000);
            
            // Rimuovi automaticamente l'errore e il messaggio dopo 4 secondi
            setTimeout(() => {
                document.getElementById('nomeSale').classList.remove('input-error');
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 4000);
            
            return false;
        }
        
        // NUOVO: Verifica se il nome sale corrisponde a una sostanza esistente
        const verificaSostanze = await verificaNomeSaleVsSostanze(nomeSale);
        if (!verificaSostanze.valido) {
            // Evidenzia il campo nome con errore
            document.getElementById('nomeSale').classList.add('input-error');
            
            // Aggiungi messaggio di errore sotto il campo
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = verificaSostanze.messaggio;
            document.getElementById('nomeSale').parentNode.appendChild(errorDiv);
            
            showNotification(verificaSostanze.messaggio, 'error', 4000);
            
            // Rimuovi automaticamente l'errore e il messaggio dopo 4 secondi
            setTimeout(() => {
                document.getElementById('nomeSale').classList.remove('input-error');
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 4000);
            
            return false;
        }
        
        // Validazione CAS se fornito
        if (codCasSale) {
            const risultatoCAS = validaCodCAS(codCasSale);
            if (!risultatoCAS.valido) {
                document.getElementById('codCasSale').classList.add('input-error');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = risultatoCAS.messaggio;
                document.getElementById('codCasSale').parentNode.appendChild(errorDiv);
                hasErrors = true;
            }
        }
        
        // Validazione frasi H (il resto del codice rimane uguale)
        let fraseHValidaTrovata = false;
        const frasiHSaleContainer = document.getElementById('frasiHSaleContainer');
        
        if (frasiHSaleContainer) {
            const rows = frasiHSaleContainer.querySelectorAll('.frase-h-sale-row');
            
            if (rows.length > 0) {
                for (const row of rows) {
                    const fraseHInput = row.querySelector('.frase-h-sale-input');
                    const hazardClassSelect = row.querySelector('.hazard-class-sale-select:not([disabled])');
                    
                    if (fraseHInput) {
                        const fraseHValue = fraseHInput.value.trim();
                        
                        if (fraseHValue) {
                            if (!frasiHValide.includes(fraseHValue)) {
                                fraseHInput.classList.add('input-error');
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'error-message';
                                errorDiv.textContent = 'Errore frase H non gestita nel classificatore. Contattare il supporto.';
                                fraseHInput.parentNode.appendChild(errorDiv);
                                hasErrors = true;
                            } else {
                                let hazardClassValue = '';
                                
                                if (hazardClassSelect && !hazardClassSelect.disabled) {
                                    hazardClassValue = hazardClassSelect.value.trim();
                                }
                                
                                if (!hazardClassValue) {
                                    if (hazardClassSelect) hazardClassSelect.classList.add('input-error');
                                    hasErrors = true;
                                } else {
                                    fraseHValidaTrovata = true;
                                }
                            }
                        } else if (hazardClassSelect && hazardClassSelect.value.trim()) {
                            fraseHInput.classList.add('input-error');
                            hasErrors = true;
                        }
                    }
                }
            }
        }

        // Controllo se almeno una frase H valida è stata trovata
        if (!fraseHValidaTrovata) {
            campiConErrore.push('Frasi H e Hazard Class');
            
            // Evidenzia il primo campo se non ci sono errori già evidenziati
            if (!document.querySelector('.frase-h-sale-input.input-error')) {
                const primaRiga = frasiHSaleContainer.querySelector('.frase-h-sale-row');
                if (primaRiga) {
                    const fraseHInput = primaRiga.querySelector('.frase-h-sale-input');
                    const hazardClassSelect = primaRiga.querySelector('.hazard-class-sale-select');
                    
                    if (fraseHInput) fraseHInput.classList.add('input-error');
                    if (hazardClassSelect) hazardClassSelect.classList.add('input-error');
                }
            }
            
            hasErrors = true;
        }
        
        // Se ci sono errori di validazione, mostra notifica e interrompi
        if (hasErrors) {
            showNotification('Correggi gli errori nei campi evidenziati', 'warning');
            
            setTimeout(() => {
                document.querySelectorAll('.input-error').forEach(el => {
                    el.classList.remove('input-error');
                });
                document.querySelectorAll('.error-message').forEach(el => {
                    el.remove();
                });
            }, 3000);
            
            return false;
        }
        
        
        // Se tutti i controlli sono passati, procedi con l'inserimento
        // Ottieni informazioni sul metallo associato
        let metalloNome = "";
        if (sostanzaAssociataSelect && sostanzaAssociataSelect.selectedIndex > 0) {
            const selectedOption = sostanzaAssociataSelect.options[sostanzaAssociataSelect.selectedIndex];
            metalloNome = selectedOption.value; // Il value contiene il nome del metallo
        }
        
        // Preparazione dei dati da inviare
        const fattore = parseFloat(fattoreConversione);
        const isDefault = 0;
        
        console.log('Preparazione inserimento nuovo sale con frasi:', {
            nome: nomeSale,
            fattore: fattore,
            cas: codCasSale,
            metallo: metalloNome,
            default: isDefault
        });
        
        // Usa l'API per inserire nel database
        const result = await window.electronAPI.executeSQLite(
            'INSERT INTO sali (Sali, Sinonimi_Col_B_file_ECHA, CAS, Fattore, Metallo, "Default") VALUES (?, ?, ?, ?, ?, ?)',
            [nomeSale, nomeSale, codCasSale, fattore, metalloNome, isDefault]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'inserimento del sale: ${result.message}`);
        }
        
        const newSaleId = result.lastID;
        console.log(`Sale inserito con ROWID: ${newSaleId}`);
        
        // Aggiorniamo esplicitamente l'ID per assicurarci che corrisponda al ROWID
        await window.electronAPI.executeSQLite(
            'UPDATE sali SET ID = ? WHERE ROWID = ?',
            [newSaleId, newSaleId]
        );
        
        // Raccogli le frasi H se presenti
        const frasiH = [];
        if (fraseHValidaTrovata) {
            document.querySelectorAll('.frase-h-sale-row').forEach(row => {
                const fraseHInput = row.querySelector('.frase-h-sale-input');
                const hazardClassSelect = row.querySelector('.hazard-class-sale-select:not([disabled])');
                
                if (fraseHInput && fraseHInput.value.trim()) {
                    let hazardClass = '';
                    
                    if (hazardClassSelect && hazardClassSelect.value.trim()) {
                        hazardClass = hazardClassSelect.value.trim();
                    }
                    
                    if (hazardClass) {
                        frasiH.push({
                            fraseH: fraseHInput.value.trim(),
                            hazardClass: hazardClass
                        });
                    }
                }
            });
        }
        
        // Inserisci le frasi H associate se presenti
        for (const frase of frasiH) {
            const fraseHResult = await window.electronAPI.executeSQLite(
                'INSERT INTO "frasi H" (Nome_sostanza, CAS, Hazard_Statement, Hazard_Class_and_Category) VALUES (?, ?, ?, ?)',
                [nomeSale, codCasSale, frase.fraseH, frase.hazardClass]
            );
            
            if (!fraseHResult.success) {
                console.warn(`Avviso: Errore nell'inserimento della frase H ${frase.fraseH}: ${fraseHResult.message}`);
            } else {
                const newFraseHId = fraseHResult.lastID;
                await window.electronAPI.executeSQLite(
                    'UPDATE "frasi H" SET ID_PK = ? WHERE ROWID = ?',
                    [newFraseHId, newFraseHId]
                );
                console.log(`Frase H inserita per sale con ROWID: ${newFraseHId}`);
            }
        }
        
        // Raccogli le frasi EUH se presenti
        const frasiEUH = [];
        document.querySelectorAll('.frase-euh-sale-row').forEach(row => {
            const fraseEUHInput = row.querySelector('.frase-euh-sale-input');
            
            if (fraseEUHInput && fraseEUHInput.value.trim()) {
                frasiEUH.push(fraseEUHInput.value.trim());
            }
        });
        
        // Inserisci le frasi EUH associate se presenti
        for (const fraseEUH of frasiEUH) {
            const fraseEUHResult = await window.electronAPI.executeSQLite(
                'INSERT INTO "EUH" (EUH, CAS_EK) VALUES (?, ?)',
                [fraseEUH, codCasSale]
            );
            
            if (!fraseEUHResult.success) {
                console.warn(`Avviso: Errore nell'inserimento della frase EUH ${fraseEUH}: ${fraseEUHResult.message}`);
            } else {
                const newFraseEUHId = fraseEUHResult.lastID;
                await window.electronAPI.executeSQLite(
                    'UPDATE "EUH" SET ID_PK = ? WHERE ROWID = ?',
                    [newFraseEUHId, newFraseEUHId]
                );
                console.log(`Frase EUH inserita per sale con ROWID: ${newFraseEUHId}`);
            }
        }
        
        // Notifica di successo
        showNotification('Sale inserito con successo');
        
        // Aggiungi attività
        addActivity('Nuovo sale', `${nomeSale} aggiunto al database`, 'fas fa-flask');
        
        // Reset del form
        resetFormNuovoSaleCompleto();
        
        // Ricarica le tabelle
        await loadTabellaRiscontroSali();
        await loadTabellaRiscontroFrasiH();
        if (typeof loadTabellaRiscontroFrasiEUH === 'function') {
            await loadTabellaRiscontroFrasiEUH();
        }
        
        return true;
    } catch (error) {
        console.error('Errore nell\'inserimento del sale:', error);
        showNotification('Errore nell\'inserimento del sale: ' + error.message, 'error');
        return false;
    }
}


// Funzione per verificare che il nome sale non sia già presente nella tabella sali
async function verificaNomeSaleEsistente(nomeSale, idEscludere = null) {
    try {
        if (!nomeSale || nomeSale.trim() === '') {
            return {
                valido: false,
                messaggio: 'Il nome del sale non può essere vuoto'
            };
        }

        // Normalizza il nome per la ricerca (trim e converti a lowercase)
        const nomeNormalizzato = nomeSale.trim().toLowerCase();
        
        console.log(`Verifica nome sale esistente: Nome='${nomeNormalizzato}'`);
        
        // Ottieni tutti i sali dal database per fare un controllo flessibile
        let query = 'SELECT ID, Sali, Sinonimi_Col_B_file_ECHA, CAS FROM sali';
        let params = [];
        
        // Se stiamo modificando un sale esistente, escludiamo il suo ID
        if (idEscludere) {
            query += ' WHERE ID != ?';
            params.push(idEscludere);
        }
        
        const result = await window.electronAPI.querySQLite(query, params);
        
        if (!result.success) {
            throw new Error(`Errore nel controllo del database: ${result.message}`);
        }
        
        if (result.data && result.data.length > 0) {
            // Prepara il nome per il confronto: rimuovi spazi extra, converti in minuscolo
            const nomeComparazione = nomeNormalizzato.replace(/\s+/g, ' ');
            
            // Cerca corrispondenze nei sali esistenti
            for (const sale of result.data) {
                // Controlla sia il nome del sale che i sinonimi
                const campiDaControllare = [
                    { campo: 'Sali', valore: sale.Sali },
                    { campo: 'Sinonimi_Col_B_file_ECHA', valore: sale.Sinonimi_Col_B_file_ECHA }
                ];
                
                for (const campoInfo of campiDaControllare) {
                    if (!campoInfo.valore) continue;
                    
                    const saleComparazione = campoInfo.valore.toLowerCase().replace(/\s+/g, ' ');
                    
                    // 1. Confronto esatto (case-insensitive)
                    if (saleComparazione === nomeComparazione) {
                        return {
                            valido: false,
                            messaggio: `Un sale con il nome "${campoInfo.valore}" è già presente nel database (CAS: ${sale.CAS || 'N/A'})`,
                            saleCorrispondente: sale,
                            tipoCorrispondenza: 'esatta'
                        };
                    }
                    
                    // 2. Verifica se una è contenuta nell'altra (gestisce abbreviazioni/forme alternative)
                    if (saleComparazione.includes(nomeComparazione) || nomeComparazione.includes(saleComparazione)) {
                        // Se una è contenuta nell'altra e la più corta è almeno 4 caratteri
                        const lunghezzaMinima = Math.min(saleComparazione.length, nomeComparazione.length);
                        
                        if (lunghezzaMinima >= 4) {
                            return {
                                valido: false,
                                messaggio: `Un sale con nome simile "${campoInfo.valore}" è già presente nel database (CAS: ${sale.CAS || 'N/A'})`,
                                saleCorrispondente: sale,
                                tipoCorrispondenza: 'contenimento'
                            };
                        }
                    }
                    
                    // 3. Distanza di Levenshtein per nomi molto simili
                    const distanza = calcolaDistanzaLevenshtein(nomeComparazione, saleComparazione);
                    const lunghezzaMassima = Math.max(nomeComparazione.length, saleComparazione.length);
                    
                    // Soglia di similarità: massimo 3 caratteri o 20% della lunghezza
                    const sogliaSimilarità = Math.min(3, Math.floor(lunghezzaMassima * 0.2));
                    
                    if (distanza <= sogliaSimilarità && lunghezzaMassima > 4) {
                        return {
                            valido: false,
                            messaggio: `Un sale con nome molto simile "${campoInfo.valore}" è già presente nel database (CAS: ${sale.CAS || 'N/A'})`,
                            saleCorrispondente: sale,
                            tipoCorrispondenza: 'similarità',
                            distanza: distanza
                        };
                    }
                }
            }
        }
        
        // Se arriviamo qui, il nome non corrisponde a nessun sale esistente
        return {
            valido: true,
            messaggio: '',
            saleCorrispondente: null,
            tipoCorrispondenza: null
        };
        
    } catch (error) {
        console.error('Errore nella verifica nome sale esistente:', error);
        // In caso di errore, restituisci un risultato sicuro che non blocchi l'inserimento
        return {
            valido: true, // Permetti l'inserimento in caso di errore di sistema
            messaggio: 'Avviso: Impossibile verificare i duplicati a causa di un errore tecnico: ' + error.message,
            errore: true
        };
    }
}

// Funzione per verificare che il nome sale non corrisponda a una sostanza esistente
async function verificaNomeSaleVsSostanze(nomeSale) {
    try {
        if (!nomeSale || nomeSale.trim() === '') {
            return {
                valido: false,
                messaggio: 'Il nome del sale non può essere vuoto'
            };
        }

        // Normalizza il nome per la ricerca
        const nomeNormalizzato = nomeSale.trim().toLowerCase();
        
        console.log(`Verifica nome sale vs sostanze: Nome='${nomeNormalizzato}'`);
        
        // Ottieni tutte le sostanze dal database
        const result = await window.electronAPI.querySQLite(
            'SELECT ID, Nome, CAS, Categoria FROM sostanze',
            []
        );
        
        if (!result.success) {
            throw new Error(`Errore nel controllo del database: ${result.message}`);
        }
        
        if (result.data && result.data.length > 0) {
            const nomeComparazione = nomeNormalizzato.replace(/\s+/g, ' ');
            
            // Cerca corrispondenze nelle sostanze
            for (const sostanza of result.data) {
                if (!sostanza.Nome) continue;
                
                const sostanzaComparazione = sostanza.Nome.toLowerCase().replace(/\s+/g, ' ');
                
                // 1. Confronto esatto (case-insensitive)
                if (sostanzaComparazione === nomeComparazione) {
                    return {
                        valido: false,
                        messaggio: `Il nome "${nomeSale}" corrisponde esattamente alla sostanza "${sostanza.Nome}" (CAS: ${sostanza.CAS || 'N/A'}). Un sale non può avere lo stesso nome di una sostanza.`,
                        sostanzaCorrispondente: sostanza,
                        tipoCorrispondenza: 'esatta'
                    };
                }
                
                // 2. Verifica contenimento (per forme alternative)
                if (sostanzaComparazione.includes(nomeComparazione) || nomeComparazione.includes(sostanzaComparazione)) {
                    const lunghezzaMinima = Math.min(sostanzaComparazione.length, nomeComparazione.length);
                    
                    if (lunghezzaMinima >= 4) {
                        return {
                            valido: false,
                            messaggio: `Il nome "${nomeSale}" è molto simile alla sostanza "${sostanza.Nome}" (CAS: ${sostanza.CAS || 'N/A'}). Un sale non può avere lo stesso nome di una sostanza.`,
                            sostanzaCorrispondente: sostanza,
                            tipoCorrispondenza: 'contenimento'
                        };
                    }
                }
                
                // 3. Distanza di Levenshtein per similarità
                const distanza = calcolaDistanzaLevenshtein(nomeComparazione, sostanzaComparazione);
                const lunghezzaMassima = Math.max(nomeComparazione.length, sostanzaComparazione.length);
                const sogliaSimilarità = Math.min(3, Math.floor(lunghezzaMassima * 0.2));
                
                if (distanza <= sogliaSimilarità && lunghezzaMassima > 4) {
                    return {
                        valido: false,
                        messaggio: `Il nome "${nomeSale}" è molto simile alla sostanza "${sostanza.Nome}" (CAS: ${sostanza.CAS || 'N/A'}). Un sale non può avere lo stesso nome di una sostanza.`,
                        sostanzaCorrispondente: sostanza,
                        tipoCorrispondenza: 'similarità',
                        distanza: distanza
                    };
                }
            }
        }
        
        return {
            valido: true,
            messaggio: '',
            sostanzaCorrispondente: null,
            tipoCorrispondenza: null
        };
        
    } catch (error) {
        console.error('Errore nella verifica nome sale vs sostanze:', error);
        return {
            valido: true, // Permetti l'inserimento in caso di errore di sistema
            messaggio: 'Avviso: Impossibile verificare la corrispondenza con le sostanze a causa di un errore tecnico: ' + error.message,
            errore: true
        };
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////
////////// ========== FUNZIONI SPECIFICHE PER FRASI H E EUH DEI SALI ==========///////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

// Aggiungi un campo per la frase H del sale
function aggiungiCampoFraseHSale() {
    console.log("Aggiungendo nuovo campo frase H per sale...");
    const container = document.getElementById('frasiHSaleContainer');
    const row = document.createElement('div');
    row.className = 'frase-h-sale-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Frase H <span class="text-danger" style="color: red;">*</span></label>
            <input type="text" class="form-control frase-h-sale-input" placeholder="Frase H">
        </div>
        <div class="form-group">
            <label>Hazard Class and Category <span class="text-danger" style="color: red;">*</span></label>
            <select class="form-control hazard-class-sale-select" disabled>
                <option value="">Seleziona prima una frase H</option>
            </select>
        </div>
        <button type="button" class="btn btn-sm btn-danger remove-frase-sale-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
    
    // Trova l'input appena aggiunto
    const fraseHInput = row.querySelector('.frase-h-sale-input');
    
    console.log("Input frase H sale creato:", fraseHInput);
    
    // Aggiungi event listener alla frase H input
    if (fraseHInput) {
        fraseHInput.addEventListener('input', function() {
            console.log("Input frase H sale modificato:", this.value);
            updateHazardClassSaleOptions(this);
        });
        console.log("Event listener per updateHazardClassSaleOptions aggiunto");
    }
    
    // Aggiungi event listener per il bottone di rimozione
    const removeBtn = row.querySelector('.remove-frase-sale-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            row.remove();
        });
    }
}

// Aggiungi un campo per la frase EUH del sale
function aggiungiCampoFraseEUHSale() {
    const container = document.getElementById('frasiEUHSaleContainer');
    const row = document.createElement('div');
    row.className = 'frase-euh-sale-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Frase EUH</label>
            <input type="text" class="form-control frase-euh-sale-input" placeholder="Frase EUH (es. EUH029)">
        </div>
        <button type="button" class="btn btn-sm btn-danger remove-frase-sale-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}

// Funzione per aggiornare le opzioni del menu a tendina dell'Hazard Class per i sali
function updateHazardClassSaleOptions(fraseHInput, showErrors = false) {
    const fraseH = fraseHInput.value.trim();
    const row = fraseHInput.closest('.frase-h-sale-row');
    if (!row) return;
    
    const hazardClassSelect = row.querySelector('.hazard-class-sale-select');
    if (!hazardClassSelect) return;
    
    // Rimuovi eventuali errori precedenti se non stiamo mostrando errori
    if (!showErrors) {
        fraseHInput.classList.remove('input-error');
        const errorMsg = row.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    }
    
    // IMPORTANTE: Assicurati che il select sia sempre cliccabile
    hazardClassSelect.style.pointerEvents = 'auto';
    hazardClassSelect.style.position = 'relative';
    hazardClassSelect.style.zIndex = '1000';
    
    // Abilita/disabilita il select di Hazard Class in base alla presenza di una frase H valida
    const isValidPhrase = fraseH && frasiHValide.includes(fraseH);
    hazardClassSelect.disabled = !isValidPhrase;
    
    // Reset delle opzioni
    hazardClassSelect.innerHTML = '';
    
    // Opzione vuota predefinita
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    
    if (!fraseH) {
        defaultOption.textContent = 'Seleziona prima una frase H';
    } else if (!frasiHValide.includes(fraseH)) {
        defaultOption.textContent = 'Frase H non valida';
        
        // Mostra l'errore solo se richiesto (durante la validazione)
        if (showErrors) {
            // Evidenzia l'errore nella frase H
            fraseHInput.classList.add('input-error');
            
            // Aggiungi messaggio di errore se non esiste già
            if (!row.querySelector('.error-message')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = 'Errore frase H non gestita nel classificatore. Contattare il supporto.';
                fraseHInput.parentNode.appendChild(errorDiv);
            }
        }
    } else {
        // Frase H valida
        defaultOption.textContent = 'Seleziona un Hazard Class';
        
        // Assicurati che il select sia completamente abilitato
        hazardClassSelect.disabled = false;
        hazardClassSelect.style.opacity = '1';
        hazardClassSelect.style.cursor = 'pointer';
    }
    
    hazardClassSelect.appendChild(defaultOption);
    
    // Se c'è una frase H valida, popola le opzioni di Hazard Class
    if (fraseH && frasiHToHazardClass[fraseH]) {
        frasiHToHazardClass[fraseH].forEach(hazardClass => {
            const option = document.createElement('option');
            option.value = hazardClass;
            option.textContent = hazardClass;
            hazardClassSelect.appendChild(option);
        });
        
        // Forza il refresh del select per assicurare che sia funzionante
        hazardClassSelect.style.display = 'none';
        hazardClassSelect.offsetHeight; // Trigger reflow
        hazardClassSelect.style.display = 'block';
    }
    
    return frasiHValide.includes(fraseH);
}

// Funzione per validare tutte le frasi H del sale e mostrare errori
function validaFrasiHSale() {
    let tutteValide = true;
    let fraseHSenzaHazardClass = false;
    
    // Controlla tutte le frasi H del sale
    document.querySelectorAll('.frase-h-sale-row').forEach(row => {
        const fraseHInput = row.querySelector('.frase-h-sale-input');
        const hazardClassSelect = row.querySelector('.hazard-class-sale-select');
        
        if (!fraseHInput || !hazardClassSelect) return;
        
        const fraseH = fraseHInput.value.trim();
        const hazardClass = hazardClassSelect.value.trim();
        
        // Se la frase H è compilata ma non è valida, segna come errore
        if (fraseH && !frasiHValide.includes(fraseH)) {
            tutteValide = false;
            // Aggiorna le opzioni mostrando gli errori
            updateHazardClassSaleOptions(fraseHInput, true);
        } 
        // Se la frase H è valida ma manca l'Hazard Class
        else if (fraseH && frasiHValide.includes(fraseH) && !hazardClass) {
            fraseHSenzaHazardClass = true;
            hazardClassSelect.classList.add('input-error');
            
            // Aggiungi messaggio di errore sotto il select se non esiste già
            if (!row.querySelector('.hazard-error-message')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message hazard-error-message';
                errorDiv.textContent = 'Seleziona un Hazard Class per questa frase H';
                hazardClassSelect.parentNode.appendChild(errorDiv);
            }
        }
    });
    
    return { tutteValide, fraseHSenzaHazardClass };
}


// Inizializzazione specifica per i sali
function inizializzaFormFrasiHSale() {
    console.log("Inizializzazione form frasi H per sali...");
    
    // Aggiungi event listener all'input iniziale se esiste
    const initialFraseHInput = document.querySelector('.frase-h-sale-input');
    if (initialFraseHInput) {
        console.log("Trovato input iniziale frase H sale, aggiungendo listener...");
        initialFraseHInput.addEventListener('input', function() {
            updateHazardClassSaleOptions(this);
        });
    }
    
    // Monitora tutti gli input esistenti per i sali
    function monitoraInputSaleEsistenti() {
        // Monitora tutte le frasi H esistenti per i sali
        document.querySelectorAll('.frase-h-sale-input').forEach(input => {
            input.removeEventListener('input', validazioneFraseHSale);
            input.addEventListener('input', validazioneFraseHSale);
            
            // Aggiungi anche il listener per updateHazardClassSaleOptions
            input.removeEventListener('input', handleFraseHSaleInput);
            input.addEventListener('input', handleFraseHSaleInput);
        });
        
        // Monitora tutte le frasi EUH esistenti per i sali
        document.querySelectorAll('.frase-euh-sale-input').forEach(input => {
            input.removeEventListener('input', validazioneFraseEUHSale);
            input.addEventListener('input', validazioneFraseEUHSale);
        });
    }
    
    // Handler combinato per l'input della frase H del sale
    function handleFraseHSaleInput() {
        updateHazardClassSaleOptions(this);
        validazioneFraseHSale.call(this);
    }
    
    // Funzioni di validazione specifiche per i sali
    function validazioneFraseHSale() {
        const regexH = /^H\d{3}$/;
        validaInputSale(this, regexH, 'Formato richiesto: H seguito da 3 cifre (es. H230)');
    }
    
    function validazioneFraseEUHSale() {
        const regexEUH = /^EUH\d{3}$/;
        validaInputSale(this, regexEUH, 'Formato richiesto: EUH seguito da 3 cifre (es. EUH029)');
    }
    
    // Funzione per validare un input del sale
    function validaInputSale(input, regex, messaggioErrore) {
        const valore = input.value.trim();
        const contenitore = input.parentNode;
        
        // Rimuovi eventuali messaggi di errore esistenti
        const vecchioErrore = contenitore.querySelector('.messaggio-errore');
        if (vecchioErrore) {
            vecchioErrore.remove();
        }
        
        // Se l'input è vuoto, non mostrare errori
        if (valore === '') {
            input.classList.remove('input-error');
            return;
        }
        
        // Verifica se il valore corrisponde al formato richiesto
        if (!regex.test(valore)) {
            input.classList.add('input-error');
            
            // Crea e aggiungi messaggio di errore
            const errore = document.createElement('span');
            errore.className = 'messaggio-errore';
            errore.textContent = messaggioErrore;
            contenitore.appendChild(errore);
        } else {
            input.classList.remove('input-error');
        }
    }
    
    // Osserva le modifiche al DOM per intercettare nuovi input aggiunti per i sali
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Cerca nuovi input frase H per sali
                        const inputsH = node.querySelectorAll ? node.querySelectorAll('.frase-h-sale-input') : [];
                        inputsH.forEach(input => {
                            console.log("Nuovo input frase H sale aggiunto, aggiungendo listeners...");
                            input.addEventListener('input', validazioneFraseHSale);
                            input.addEventListener('input', function() {
                                updateHazardClassSaleOptions(this);
                            });
                        });
                        
                        // Cerca nuovi input frase EUH per sali
                        const inputsEUH = node.querySelectorAll ? node.querySelectorAll('.frase-euh-sale-input') : [];
                        inputsEUH.forEach(input => {
                            input.addEventListener('input', validazioneFraseEUHSale);
                        });
                    }
                });
            }
        });
    });
    
    // Avvia l'osservazione dei container per i sali
    const frasiHSaleContainer = document.getElementById('frasiHSaleContainer');
    const frasiEUHSaleContainer = document.getElementById('frasiEUHSaleContainer');
    
    if (frasiHSaleContainer) {
        observer.observe(frasiHSaleContainer, { 
            childList: true, 
            subtree: true 
        });
    }
    
    if (frasiEUHSaleContainer) {
        observer.observe(frasiEUHSaleContainer, { 
            childList: true, 
            subtree: true 
        });
    }
    
    // Monitora gli input già esistenti per i sali
    monitoraInputSaleEsistenti();
    
    // Assicuriamoci di monitorare anche quando si aggiungono nuovi campi per i sali
    const aggiungiHSaleBtn = document.getElementById('aggiungiHSaleBtn');
    if (aggiungiHSaleBtn) {
        aggiungiHSaleBtn.addEventListener('click', () => {
            setTimeout(() => {
                monitoraInputSaleEsistenti();
                console.log("Nuovi input monitorati dopo aggiunta campo H sale");
            }, 50);
        });
    }
    
    const aggiungiEUHSaleBtn = document.getElementById('aggiungiEUHSaleBtn');
    if (aggiungiEUHSaleBtn) {
        aggiungiEUHSaleBtn.addEventListener('click', () => {
            setTimeout(() => {
                monitoraInputSaleEsistenti();
                console.log("Nuovi input monitorati dopo aggiunta campo EUH sale");
            }, 50);
        });
    }
    
    console.log("Inizializzazione form frasi H per sali completata");
}

// ========== FINE FUNZIONI SPECIFICHE PER FRASI H E EUH DEI SALI ==========


// Carica le sostanze disponibili dal database per popolare il select
async function loadSostanzeSelect() {
    try {
        // Interroga il database per ottenere tutte le sostanze
        const result = await window.electronAPI.querySQLite(
            'SELECT ID, Nome FROM sostanze ORDER BY Nome',
            []
        );
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento delle sostanze');
        }
        
        const select = document.getElementById('sostanzaAssociata');
        
        if (select) {
            // Mantieni l'opzione vuota
            let html = '<option value="">Seleziona una sostanza</option>';
            
            // Aggiungi le opzioni dalle sostanze disponibili
            result.data.forEach(sostanza => {
                if (sostanza.Nome) {
                    html += `<option value="${sostanza.ID}">${sostanza.Nome}</option>`;
                }
            });
            
            select.innerHTML = html;
            console.log('Sostanze caricate nel select:', result.data.length);
        }
    } catch (error) {
        console.error('Errore nel caricamento delle sostanze per il select:', error);
        showNotification('Errore nel caricamento delle sostanze', 'error');
        
        // Fallback a una lista vuota in caso di errore
        const select = document.getElementById('sostanzaAssociata');
        if (select) {
            select.innerHTML = '<option value="">Errore nel caricamento</option>';
        }
    }
}


// Carica le categorie disponibili dal database per popolare il select
async function loadCategorieSelect() {
    try {
        // Interroga il database per ottenere le categorie uniche
        const result = await window.electronAPI.querySQLite(
            'SELECT DISTINCT Categoria FROM sostanze WHERE Categoria IS NOT NULL AND TRIM(Categoria) != \'\'',
            []
        );
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento delle categorie');
        }
        
        const select = document.getElementById('categoriaSostanza');
        
        if (select) {
            // Mantieni l'opzione vuota
            let html = '<option value="">Seleziona una categoria</option>';
            
            // Aggiungi le opzioni dalle categorie disponibili
            result.data.forEach(categoria => {
                if (categoria.Categoria) {
                    html += `<option value="${categoria.Categoria}">${categoria.Categoria}</option>`;
                }
            });
            
            // Aggiungi un'opzione "Altro" se non esiste già
            if (!result.data.some(c => c.Categoria === "Altro")) {
                html += '<option value="Altro">Altro</option>';
            }
            
            select.innerHTML = html;
            console.log('Categorie caricate:', result.data.length);
        }
    } catch (error) {
        console.error('Errore nel caricamento delle categorie per il select:', error);
        showNotification('Errore nel caricamento delle categorie', 'error');
        
        // Fallback a una lista di base in caso di errore
        const select = document.getElementById('categoriaSostanza');
        if (select) {
            select.innerHTML = `
                <option value="">Seleziona una categoria</option>
                <option value="Metallo">Metallo</option>
                <option value="Solvente">Solvente</option>
                <option value="Elemento">Elemento</option>
                <option value="Composto">Composto</option>
                <option value="Altro">Altro</option>
            `;
        }
    }
}


// Carica i metalli disponibili dalla tabella sostanze (categoria Metallo) per popolare il select
async function loadMetalliSelect() {
    try {
        // Interroga il database per ottenere le sostanze con categoria "Metallo"
        const result = await window.electronAPI.querySQLite(
            'SELECT ID, Nome FROM sostanze WHERE Categoria = ? ORDER BY Nome',
            ['Metallo']
        );
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento dei metalli');
        }
        
        const select = document.getElementById('sostanzaAssociata');
        
        if (select) {
            // Mantieni l'opzione vuota
            let html = '<option value="">Seleziona un metallo</option>';
            
            // Aggiungi le opzioni dai metalli disponibili
            result.data.forEach(metallo => {
                if (metallo.Nome) {
                    html += `<option value="${metallo.Nome}">${metallo.Nome}</option>`;
                }
            });
            
            select.innerHTML = html;
            console.log('Metalli caricati nel select:', result.data.length);
        }
    } catch (error) {
        console.error('Errore nel caricamento dei metalli per il select:', error);
        showNotification('Errore nel caricamento dei metalli', 'error');
        
        // Fallback a una lista di base in caso di errore
        const select = document.getElementById('sostanzaAssociata');
        if (select) {
            select.innerHTML = `
                <option value="">Seleziona un metallo</option>
                <option value="Rame">Rame</option>
                <option value="Piombo">Piombo</option>
                <option value="Zinco">Zinco</option>
                <option value="Ferro">Ferro</option>
                <option value="Alluminio">Alluminio</option>
                <option value="Nichel">Nichel</option>
                <option value="Cromo">Cromo</option>
            `;
        }
    }
}



// Reset del form nuovo sale con gestione frasi H e EUH
function resetFormNuovoSaleCompleto() {
    document.getElementById('nomeSale').value = '';
    document.getElementById('fattoreConversione').value = '';
    document.getElementById('codCasSale').value = '';
    const selectSostanza = document.getElementById('sostanzaAssociata');
    if (selectSostanza) {
        selectSostanza.selectedIndex = 0;
    }
    
    // Reset frasi H - mantieni solo una riga vuota con i menu a tendina
    document.getElementById('frasiHSaleContainer').innerHTML = `
        <div class="frase-h-sale-row">
            <div class="form-group">
                <label>Frase H <span class="text-danger" style="color: red;">*</span></label>
                <input type="text" class="form-control frase-h-sale-input" placeholder="Frase H">
            </div>
            <div class="form-group">
                <label>Hazard Class and Category <span class="text-danger" style="color: red;">*</span></label>
                <select class="form-control hazard-class-sale-select" disabled>
                    <option value="">Seleziona prima una frase H</option>
                </select>
            </div>
            <button type="button" class="btn btn-sm btn-danger remove-frase-sale-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Reset frasi EUH
    document.getElementById('frasiEUHSaleContainer').innerHTML = '';
    
    // Aggiungi event listener alla frase H input
    const fraseHInput = document.querySelector('.frase-h-sale-input');
    if (fraseHInput) {
        fraseHInput.addEventListener('input', function() {
            updateHazardClassSaleOptions(this);
        });
    }
    
    // Rimuovi eventuali errori residui
    document.querySelectorAll('.input-error').forEach(el => {
        el.classList.remove('input-error');
    });
    document.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });
}


// Ricerca in una tabella
function ricercaTabella(query, tableId) {
    query = query.toLowerCase().trim();
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Funzioni per modificare/eliminare elementi (stub, da implementare in produzione)
function modificaSale(id) {
    // Implementazione reale: aprirebbe un modal/dialog per la modifica
    showNotification(`Modifica sale con ID: ${id}`);
}

async function eliminaSale(id) {
    try {
        // Validazione dell'ID
        if (!id || isNaN(parseInt(id))) {
            throw new Error(`ID non valido: ${id}`);
        }
        
        // Prima ottieni i dettagli del sale per i messaggi informativi
        const saleResult = await window.electronAPI.querySQLite(
            'SELECT Sali, CAS, Metallo FROM sali WHERE ID = ?',
            [id]
        );
        
        if (!saleResult.success || saleResult.data.length === 0) {
            throw new Error("Sale non trovato nel database");
        }
        
        const sale = saleResult.data[0];
        const nomeSale = sale.Sali;
        const casSale = sale.CAS;
        const metalloSale = sale.Metallo;
        
        // Verifica quanti record correlati verranno eliminati
        // Cerca nelle frasi H per nome del sale e CAS
        const verificaFrasiH = await window.electronAPI.querySQLite(
            'SELECT COUNT(*) as count FROM "frasi H" WHERE Nome_sostanza = ? OR CAS = ?',
            [nomeSale, casSale]
        );
        
        // Cerca nelle frasi EUH per CAS
        const verificaFrasiEUH = await window.electronAPI.querySQLite(
            'SELECT COUNT(*) as count FROM "EUH" WHERE CAS_EK = ?',
            [casSale]
        );
        
        // Cerca nelle sostanze se il sale è stato erroneamente inserito anche lì
        const verificaSostanze = await window.electronAPI.querySQLite(
            'SELECT COUNT(*) as count FROM sostanze WHERE Nome = ? OR CAS = ?',
            [nomeSale, casSale]
        );
        
        const countFrasiH = verificaFrasiH.success ? verificaFrasiH.data[0].count : 0;
        const countFrasiEUH = verificaFrasiEUH.success ? verificaFrasiEUH.data[0].count : 0;
        const countSostanze = verificaSostanze.success ? verificaSostanze.data[0].count : 0;
        
        // Costruisci il messaggio di conferma con informazioni sui record correlati
        let messaggioConferma = `Sei sicuro di voler eliminare il sale "${nomeSale}"?`;
        
        if (countFrasiH > 0 || countFrasiEUH > 0 || countSostanze > 0) {
            messaggioConferma += `\n\nQuesta azione eliminerà anche:`;
            if (countSostanze > 0) {
                messaggioConferma += `\n• ${countSostanze} record/i nella tabella sostanze`;
            }
            if (countFrasiH > 0) {
                messaggioConferma += `\n• ${countFrasiH} frase/i H correlate`;
            }
            if (countFrasiEUH > 0) {
                messaggioConferma += `\n• ${countFrasiEUH} frase/i EUH correlate`;
            }
            messaggioConferma += `\n\nQuesta azione non può essere annullata.`;
        }
        
        // Usa showCustomAlert invece di confirm
        showCustomAlert(messaggioConferma, 
            async () => {
                try {
                    console.log('Eliminazione a cascata per sale:', nomeSale);
                    
                    // Array per tracciare le operazioni completate
                    const operazioniCompletate = [];
                    
                    // 1. Elimina dalle sostanze se presente (nel caso sia stato erroneamente inserito)
                    if (countSostanze > 0) {
                        const deleteSostanze = await window.electronAPI.executeSQLite(
                            'DELETE FROM sostanze WHERE Nome = ? OR CAS = ?',
                            [nomeSale, casSale]
                        );
                        
                        if (deleteSostanze.success && deleteSostanze.changes > 0) {
                            operazioniCompletate.push(`${deleteSostanze.changes} record/i sostanze eliminati`);
                        }
                    }
                    
                    // 2. Elimina le frasi H correlate (per nome e CAS)
                    if (countFrasiH > 0) {
                        const deleteFrasiH = await window.electronAPI.executeSQLite(
                            'DELETE FROM "frasi H" WHERE Nome_sostanza = ? OR CAS = ?',
                            [nomeSale, casSale]
                        );
                        
                        if (deleteFrasiH.success && deleteFrasiH.changes > 0) {
                            operazioniCompletate.push(`${deleteFrasiH.changes} frasi H eliminate`);
                        }
                    }
                    
                    // 3. Elimina le frasi EUH correlate (per CAS)
                    if (countFrasiEUH > 0) {
                        const deleteFrasiEUH = await window.electronAPI.executeSQLite(
                            'DELETE FROM "EUH" WHERE CAS_EK = ?',
                            [casSale]
                        );
                        
                        if (deleteFrasiEUH.success && deleteFrasiEUH.changes > 0) {
                            operazioniCompletate.push(`${deleteFrasiEUH.changes} frasi EUH eliminate`);
                        }
                    }
                    
                    // 4. Elimina il sale principale
                    const result = await window.electronAPI.executeSQLite(
                        'DELETE FROM sali WHERE ID = ?',
                        [id]
                    );
                    
                    if (!result.success) {
                        throw new Error(`Errore nell'eliminazione del sale: ${result.message}`);
                    }
                    
                    if (result.changes === 0) {
                        throw new Error("Nessun sale eliminato. L'ID potrebbe non esistere.");
                    }
                    
                    // Rimuovi la riga dalla tabella sali
                    const row = document.querySelector(`#saliTableBody tr[data-id="${id}"]`);
                    if (row) {
                        row.remove();
                    }
                    
                    // Ricarica le tabelle correlate per riflettere le eliminazioni
                    await Promise.all([
                        loadTabellaRiscontroSostanze(),
                        loadTabellaRiscontroFrasiH(),
                        loadTabellaRiscontroFrasiEUH()
                    ]);
                    
                    // Costruisci il messaggio di successo
                    let messaggioSuccesso = `Sale "${nomeSale}" eliminato con successo`;
                    if (operazioniCompletate.length > 0) {
                        messaggioSuccesso += ` (${operazioniCompletate.join(', ')})`;
                    }
                    
                    // Notifica utente
                    showNotification(messaggioSuccesso);
                    
                    // Aggiungi attività
                    addActivity('Sale eliminato', `${nomeSale} e riferimenti correlati eliminati`, 'fas fa-trash');
                    
                } catch (error) {
                    console.error('Errore nell\'eliminazione a cascata del sale:', error);
                    showNotification('Errore nell\'eliminazione: ' + error.message, 'error');
                }
            }
        );
    } catch (error) {
        console.error('Errore nell\'eliminazione del sale:', error);
        showNotification('Errore nell\'eliminazione: ' + error.message, 'error');
    }
}

function modificaSostanza(id) {
    // Implementazione reale: aprirebbe un modal/dialog per la modifica
    showNotification(`Modifica sostanza con ID: ${id}`);
}

function modificaFraseH(id) {
    // Implementazione reale: aprirebbe un modal/dialog per la modifica
    showNotification(`Modifica frase H con ID: ${id}`);
}


// Funzione di utilità per verificare l'integrità referenziale
async function verificaIntegritaReferenziale() {
    try {
        console.log('Verifica integrità referenziale in corso...');
        
        // Trova frasi H orfane (senza sostanza corrispondente)
        const frasiHOrfane = await window.electronAPI.querySQLite(`
            SELECT fh.ID_PK, fh.Nome_sostanza, fh.CAS, fh.Hazard_Statement
            FROM "frasi H" fh
            LEFT JOIN sostanze s ON (fh.Nome_sostanza = s.Nome OR fh.CAS = s.CAS)
            LEFT JOIN sali sa ON (fh.Nome_sostanza = sa.Sali OR fh.CAS = sa.CAS)
            WHERE s.ID IS NULL AND sa.ID IS NULL
        `, []);
        
        // Trova frasi EUH orfane
        const frasiEUHOrfane = await window.electronAPI.querySQLite(`
            SELECT euh.ID_PK, euh.EUH, euh.CAS_EK
            FROM "EUH" euh
            LEFT JOIN sostanze s ON euh.CAS_EK = s.CAS
            LEFT JOIN sali sa ON euh.CAS_EK = sa.CAS
            WHERE s.ID IS NULL AND sa.ID IS NULL
        `, []);
        
        const numFrasiHOrfane = frasiHOrfane.success ? frasiHOrfane.data.length : 0;
        const numFrasiEUHOrfane = frasiEUHOrfane.success ? frasiEUHOrfane.data.length : 0;
        
        if (numFrasiHOrfane > 0 || numFrasiEUHOrfane > 0) {
            console.warn(`Trovati record orfani: ${numFrasiHOrfane} frasi H, ${numFrasiEUHOrfane} frasi EUH`);
            
            // Opzionalmente, potresti voler pulire automaticamente i record orfani
            // o semplicemente segnalare il problema
            return {
                integra: false,
                frasiHOrfane: numFrasiHOrfane,
                frasiEUHOrfane: numFrasiEUHOrfane
            };
        }
        
        console.log('Integrità referenziale verificata: nessun record orfano trovato');
        return {
            integra: true,
            frasiHOrfane: 0,
            frasiEUHOrfane: 0
        };
        
    } catch (error) {
        console.error('Errore nella verifica dell\'integrità referenziale:', error);
        return {
            integra: false,
            errore: error.message
        };
    }
}

// Funzione per pulire i record orfani (da chiamare manualmente se necessario)
async function pulisciRecordOrfani() {
    try {
        const verifica = await verificaIntegritaReferenziale();
        
        if (verifica.integra) {
            showNotification('Nessun record orfano da pulire', 'info');
            return;
        }
        
        if (verifica.errore) {
            throw new Error(verifica.errore);
        }
        
        let messaggioConferma = 'Sono stati trovati record orfani nel database:\n';
        if (verifica.frasiHOrfane > 0) {
            messaggioConferma += `\n• ${verifica.frasiHOrfane} frasi H senza sostanza/sale corrispondente`;
        }
        if (verifica.frasiEUHOrfane > 0) {
            messaggioConferma += `\n• ${verifica.frasiEUHOrfane} frasi EUH senza sostanza/sale corrispondente`;
        }
        messaggioConferma += '\n\nVuoi eliminarli?';
        
        showCustomAlert(messaggioConferma, async () => {
            try {
                let recordEliminati = 0;
                
                // Elimina frasi H orfane
                if (verifica.frasiHOrfane > 0) {
                    const deleteFrasiH = await window.electronAPI.executeSQLite(`
                        DELETE FROM "frasi H" 
                        WHERE ID_PK IN (
                            SELECT fh.ID_PK
                            FROM "frasi H" fh
                            LEFT JOIN sostanze s ON (fh.Nome_sostanza = s.Nome OR fh.CAS = s.CAS)
                            LEFT JOIN sali sa ON (fh.Nome_sostanza = sa.Sali OR fh.CAS = sa.CAS)
                            WHERE s.ID IS NULL AND sa.ID IS NULL
                        )
                    `, []);
                    
                    if (deleteFrasiH.success) {
                        recordEliminati += deleteFrasiH.changes;
                    }
                }
                
                // Elimina frasi EUH orfane
                if (verifica.frasiEUHOrfane > 0) {
                    const deleteFrasiEUH = await window.electronAPI.executeSQLite(`
                        DELETE FROM "EUH" 
                        WHERE ID_PK IN (
                            SELECT euh.ID_PK
                            FROM "EUH" euh
                            LEFT JOIN sostanze s ON euh.CAS_EK = s.CAS
                            LEFT JOIN sali sa ON euh.CAS_EK = sa.CAS
                            WHERE s.ID IS NULL AND sa.ID IS NULL
                        )
                    `, []);
                    
                    if (deleteFrasiEUH.success) {
                        recordEliminati += deleteFrasiEUH.changes;
                    }
                }
                
                // Ricarica le tabelle
                await Promise.all([
                    loadTabellaRiscontroFrasiH(),
                    loadTabellaRiscontroFrasiEUH()
                ]);
                
                showNotification(`${recordEliminati} record orfani eliminati con successo`);
                addActivity('Pulizia database', `${recordEliminati} record orfani eliminati`, 'fas fa-broom');
                
            } catch (error) {
                console.error('Errore nella pulizia dei record orfani:', error);
                showNotification('Errore nella pulizia: ' + error.message, 'error');
            }
        });
        
    } catch (error) {
        console.error('Errore nella pulizia dei record orfani:', error);
        showNotification('Errore nella pulizia: ' + error.message, 'error');
    }
}

// Funzione per caricare la tabella frasi EUH dal database
async function loadTabellaRiscontroFrasiEUH() {
    try {
        // Ottieni i dati dal database SQLite
        const result = await window.electronAPI.querySQLite('SELECT * FROM "EUH"', []);
        
        if (result.success) {
            // Salva una copia dei dati originali
            frasiEUHOriginali = JSON.parse(JSON.stringify(result.data));
            renderTabellaRiscontroFrasiEUH(result.data);
        } else {
            throw new Error(result.message || 'Errore nel caricamento dei dati');
        }
    } catch (error) {
        console.error('Errore nel caricamento delle frasi EUH:', error);
        showNotification('Errore nel caricamento delle frasi EUH', 'error');
        
        // Fallback a dati di esempio in caso di errore
        const frasiEUHData = [
            {
                ID_PK: 1,
                EUH: "EUH001",
                CAS_EK: "7440-50-8"
            },
            {
                ID_PK: 2,
                EUH: "EUH014",
                CAS_EK: "7439-92-1"
            },
            {
                ID_PK: 3,
                EUH: "EUH029",
                CAS_EK: "7440-66-6"
            }
        ];
        
        frasiEUHOriginali = JSON.parse(JSON.stringify(frasiEUHData));
        renderTabellaRiscontroFrasiEUH(frasiEUHData);
    }
}

// Funzione per ottenere in modo sicuro i valori delle frasi EUH
function getFraseEUHValue(item, field, defaultValue = '') {
    if (field in item && item[field] !== null) {
        return item[field].toString();
    }
    return defaultValue;
}

// Renderizza la tabella frasi EUH
function renderTabellaRiscontroFrasiEUH(data) {
    const tbody = document.getElementById('frasiEUHTableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-table-message">
                    Nessuna frase EUH disponibile
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        // Ottieni i valori in modo sicuro
        const ID = getFraseEUHValue(item, 'ID_PK', item.id || '');
        const EUH = getFraseEUHValue(item, 'EUH');
        const CAS = getFraseEUHValue(item, 'CAS_EK');
        
        const row = document.createElement('tr');
        row.setAttribute('data-id', ID);
        
        // Salva valori come attributi di dati per un recupero più sicuro
        row.setAttribute('data-euh', EUH);
        row.setAttribute('data-cas', CAS);
        
        row.innerHTML = `
            <td class="euh-cell">${EUH}</td>
            <td class="cas-cell">${CAS}</td>
           <!-- <td class="actions-cell">
                <button class="btn btn-sm btn-primary edit-btn" onclick="attivaModeModificaFraseEUH(${ID})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-success save-btn" onclick="salvaFraseEUHSingola(${ID})" style="display:none;">
                    <i class="fas fa-save"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
            -->
        `;
        tbody.appendChild(row);
    });
    
    // Reset dello stato di modifica
    frasiEUHInEditMode = false;
    
    // Rimuovi eventuali classi di modifica dalla tabella
    const table = document.getElementById('frasiEUHTable');
    if (table) {
        table.classList.remove('edit-mode');
    }
    
    // Aggiorna la lista delle frasi EUH modificate
    frasiEUHModificate = [];
}

// Attiva la modalità di modifica per una frase EUH specifica
function attivaModeModificaFraseEUH(id) {
    // Se siamo già in modalità modifica, salva prima le modifiche correnti
    if (frasiEUHInEditMode) {
        const conferma = confirm('Hai delle modifiche non salvate. Vuoi salvare prima di procedere?');
        if (conferma) {
            salvaFrasiEUHModificate();
        }
    }
    
    // Trova la riga da modificare
    const row = document.querySelector(`#frasiEUHTableBody tr[data-id="${id}"]`);
    if (!row) return;
    
    // Se la riga è già in modalità modifica, non fare nulla
    if (row.classList.contains('edit-mode')) {
        return;
    }
    
    // Aggiungi classe alla tabella e alla riga per indicare modalità modifica
    document.getElementById('frasiEUHTable').classList.add('edit-mode');
    row.classList.add('edit-mode');
    
    // Ottieni i valori correnti
    const euhCell = row.querySelector('.euh-cell');
    const casCell = row.querySelector('.cas-cell');
    
    // Memorizza i valori originali come attributi data-*
    euhCell.setAttribute('data-original', euhCell.textContent);
    casCell.setAttribute('data-original', casCell.textContent);
    
    // Usa il valore degli attributi data-* salvati nella riga
    const euhValue = row.getAttribute('data-euh') || '';
    const casValue = row.getAttribute('data-cas') || '';
    
    // Trasforma le celle in campi di input
    euhCell.innerHTML = `<input type="text" value="${euhValue}" class="euh-input">`;
    casCell.innerHTML = `<input type="text" value="${casValue}" class="cas-input">`;
    
    // Aggiungi classe editable alle celle per gli stili
    euhCell.classList.add('editable');
    casCell.classList.add('editable');
    
    // Imposta lo stato di modifica
    frasiEUHInEditMode = true;
    
    // Nascondi il bottone modifica e mostra il bottone salva nella riga
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    if (editBtn && saveBtn) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
    }
    
    // Aggiungi questa frase EUH alla lista delle modificate
    if (!frasiEUHModificate.includes(id)) {
        frasiEUHModificate.push(id);
    }
}

// Funzione per salvare una singola frase EUH
async function salvaFraseEUHSingola(id) {
    try {
        console.log('Salvataggio frase EUH con ID:', id);
        
        // Trova la riga da salvare
        const row = document.querySelector(`#frasiEUHTableBody tr[data-id="${id}"]`);
        if (!row) {
            console.error('Riga non trovata');
            return;
        }
        
        // Ottieni i valori dai campi input
        const euhInput = row.querySelector('.euh-input');
        const casInput = row.querySelector('.cas-input');
        
        if (!euhInput || !casInput) {
            console.error('Uno o più campi non trovati');
            showNotification('Errore: campi non trovati', 'error');
            return;
        }
        
        // Crea oggetto con i dati aggiornati
        const updatedFraseEUH = {
            ID_PK: id,
            EUH: euhInput.value.trim(),
            CAS_EK: casInput.value.trim()
        };
        
        console.log('Dati aggiornati:', updatedFraseEUH);
        
        // Usa l'API per aggiornare il database
        const result = await window.electronAPI.executeSQLite(
            'UPDATE "EUH" SET EUH = ?, CAS_EK = ? WHERE ID_PK = ?',
            [updatedFraseEUH.EUH, updatedFraseEUH.CAS_EK, updatedFraseEUH.ID_PK]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'aggiornamento: ${result.message}`);
        }
        
        // Rimuovi dalla lista delle modificate
        frasiEUHModificate = frasiEUHModificate.filter(item => item !== id);
        
        // Se non ci sono più frasi EUH in modifica, reset della modalità
        if (frasiEUHModificate.length === 0) {
            frasiEUHInEditMode = false;
            document.getElementById('frasiEUHTable').classList.remove('edit-mode');
        }
        
        // Ripristina la visualizzazione normale della riga
        ripristinaCelleFraseEUH(row, updatedFraseEUH);
        
        // Mostra il bottone modifica e nascondi il bottone salva
        const editBtn = row.querySelector('.edit-btn');
        const saveBtn = row.querySelector('.save-btn');
        if (editBtn && saveBtn) {
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        // Rimuovi classe edit-mode dalla riga
        row.classList.remove('edit-mode');
        
        // Notifica all'utente
        showNotification('Frase EUH aggiornata con successo');
        
        // Aggiungi attività
        addActivity('Frase EUH aggiornata', `Modificata frase EUH ID: ${id}`, 'fas fa-exclamation-triangle');
        
    } catch (error) {
        console.error('Errore nel salvataggio della frase EUH:', error);
        showNotification('Errore nel salvataggio: ' + error.message, 'error');
    }
}

// Funzione per ripristinare l'aspetto normale delle celle dopo il salvataggio
function ripristinaCelleFraseEUH(row, fraseEUH) {
    // Aggiorna le celle con i nuovi valori
    const euhCell = row.querySelector('.euh-cell');
    const casCell = row.querySelector('.cas-cell');
    
    if (euhCell) {
        euhCell.textContent = fraseEUH.EUH;
        euhCell.classList.remove('editable');
    }
    
    if (casCell) {
        casCell.textContent = fraseEUH.CAS_EK;
        casCell.classList.remove('editable');
    }
    
    // Aggiorna anche gli attributi data-* della riga
    row.setAttribute('data-euh', fraseEUH.EUH);
    row.setAttribute('data-cas', fraseEUH.CAS_EK);
}

// Funzione per salvare tutte le frasi EUH modificate
async function salvaFrasiEUHModificate() {
    try {
        if (frasiEUHModificate.length === 0) {
            showNotification('Nessuna modifica da salvare', 'warning');
            return;
        }
        
        console.log('Salvataggio modifiche per le seguenti ID:', frasiEUHModificate);
        
        const updates = [];
        
        // Raccogli tutte le modifiche
        for (const id of frasiEUHModificate) {
            const row = document.querySelector(`#frasiEUHTableBody tr[data-id="${id}"]`);
            if (!row) {
                console.warn(`Riga con ID ${id} non trovata`);
                continue;
            }
            
            const euhInput = row.querySelector('.euh-input');
            const casInput = row.querySelector('.cas-input');
            
            if (!euhInput || !casInput) {
                console.warn(`Alcuni input non trovati per la riga ${id}`);
                continue;
            }
            
            // Crea oggetto con i dati aggiornati
            const updatedFraseEUH = {
                ID_PK: id,
                EUH: euhInput.value.trim(),
                CAS_EK: casInput.value.trim()
            };
            
            console.log('Dati da aggiornare:', updatedFraseEUH);
            updates.push(updatedFraseEUH);
        }
        
        // Verifica se ci sono effettivamente modifiche da salvare
        if (updates.length === 0) {
            showNotification('Nessuna modifica valida da salvare', 'warning');
            return;
        }
        
        // Esegui gli aggiornamenti nel database
        for (const fraseEUH of updates) {
            console.log('Esecuzione query per ID:', fraseEUH.ID_PK);
            // Usa l'API per aggiornare il database
            const result = await window.electronAPI.executeSQLite(
                'UPDATE "EUH" SET EUH = ?, CAS_EK = ? WHERE ID_PK = ?',
                [fraseEUH.EUH, fraseEUH.CAS_EK, fraseEUH.ID_PK]
            );
            
            console.log('Risultato query:', result);
            
            if (!result.success) {
                throw new Error(`Errore nell'aggiornamento della frase EUH ID ${fraseEUH.ID_PK}: ${result.message}`);
            }
        }
        
        // Ricarica i dati aggiornati
        await loadTabellaRiscontroFrasiEUH();
        
        showNotification(`${updates.length} frasi EUH aggiornate con successo`);
        
        // Aggiungi attività
        addActivity('Tabella frasi EUH aggiornata', `Modificate ${updates.length} frasi EUH`, 'fas fa-exclamation-triangle');
        
    } catch (error) {
        console.error('Errore nel salvataggio delle modifiche alle frasi EUH:', error);
        showNotification('Errore nel salvataggio delle modifiche: ' + error.message, 'error');
    }
}

// Annulla le modifiche alle frasi EUH e ripristina i valori originali
function annullaFrasiEUHModificate() {
    if (frasiEUHModificate.length === 0) return;
    
    const table = document.getElementById('frasiEUHTable');
    table.classList.remove('edit-mode');
    
    // Ripristina i valori originali
    for (const id of frasiEUHModificate) {
        const row = document.querySelector(`#frasiEUHTableBody tr[data-id="${id}"]`);
        if (!row) continue;
        
        const euhCell = row.querySelector('.euh-cell');
        const casCell = row.querySelector('.cas-cell');
        
        if (euhCell.classList.contains('editable')) {
            euhCell.textContent = euhCell.getAttribute('data-original') || '';
            euhCell.classList.remove('editable');
        }
        
        if (casCell.classList.contains('editable')) {
            casCell.textContent = casCell.getAttribute('data-original') || '';
            casCell.classList.remove('editable');
        }
        
        // Ripristina i bottoni
        const editBtn = row.querySelector('.edit-btn');
        const saveBtn = row.querySelector('.save-btn');
        if (editBtn && saveBtn) {
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        // Rimuovi classe edit-mode dalla riga
        row.classList.remove('edit-mode');
    }
    
    frasiEUHInEditMode = false;
    frasiEUHModificate = [];
    
    showNotification('Modifiche annullate');
}

// Funzione per eliminare una frase EUH
async function eliminaFraseEUH(id) {
    try {
        // Validazione dell'ID
        if (!id || isNaN(parseInt(id))) {
            throw new Error(`ID non valido: ${id}`);
        }
        
        // Usa showCustomAlert invece di confirm
        showCustomAlert(`Sei sicuro di voler eliminare questa frase EUH? Questa azione non può essere annullata.`, 
            async () => {
                console.log('Eliminazione frase EUH con ID:', id);
                
                // Usa l'API per eliminare dal database - Nota le virgolette per gestire lo spazio nel nome della tabella
                const result = await window.electronAPI.executeSQLite(
                    'DELETE FROM "EUH" WHERE ROWID = ?',
                    [id]
                );
                
                if (!result.success) {
                    throw new Error(`Errore nell'eliminazione: ${result.message}`);
                }
                
                // Verifica quante righe sono state modificate
                console.log(`Righe eliminate: ${result.changes}`);
                
                if (result.changes === 0) {
                    throw new Error("Nessuna riga eliminata. L'ID potrebbe non esistere.");
                }
                
                // Rimuovi la riga dalla tabella
                const row = document.querySelector(`#frasiEUHTableBody tr[data-id="${id}"]`);
                if (row) {
                    row.remove();
                }
                
                // Notifica utente
                showNotification('Frase EUH eliminata con successo');
                
                // Aggiungi attività
                addActivity('Frase EUH eliminata', `Eliminata frase EUH ID: ${id}`, 'fas fa-trash');
            }
        );
    } catch (error) {
        console.error('Errore nell\'eliminazione della frase EUH:', error);
        showNotification('Errore nell\'eliminazione: ' + error.message, 'error');
    }
}

// Funzione di supporto per cercare frasi EUH nella tabella
function ricercaFrasiEUH(query) {
    query = query.toLowerCase().trim();
    const table = document.getElementById('frasiEUHTable');
    const rows = table.querySelectorAll('tbody tr');
    
    let matchCount = 0;
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
            matchCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    return matchCount;
}

// Funzione per setup degli event listeners delle frasi EUH
function setupFrasiEUHEventListeners() {
    // Input di ricerca
    const searchInput = document.getElementById('frasiEUHSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const matchCount = ricercaFrasiEUH(this.value);
            const countLabel = document.getElementById('frasiEUHMatchCount');
            if (countLabel) {
                countLabel.textContent = matchCount > 0 ? `${matchCount} frasi EUH trovate` : 'Nessuna frase EUH trovata';
            }
        });
    }
    
    // Gestione tasto ESC per annullare modifiche
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && frasiEUHInEditMode) {
            annullaFrasiEUHModificate();
        }
    });
}

// Funzione per l'inserimento di una nuova frase EUH
async function inserisciNuovaFraseEUH(datiNuovaFraseEUH) {
    // Se la funzione viene chiamata senza parametri, interrompi silenziosamente
    if (arguments.length === 0) {
        return false;
    }

    try {
        // Validazione dei dati
        if (!datiNuovaFraseEUH.EUH) {
            showNotification('Il codice EUH è obbligatorio', 'warning');
            return false;
        }
        
        // Usa l'API per inserire nel database senza specificare ID_PK
        const result = await window.electronAPI.executeSQLite(
            'INSERT INTO "EUH" (EUH, CAS_EK) VALUES (?, ?)',
            [datiNuovaFraseEUH.EUH, datiNuovaFraseEUH.CAS_EK]
        );
        
        if (!result.success) {
            throw new Error(`Errore nell'inserimento: ${result.message}`);
        }
        
        const newFraseEUHId = result.lastID;
        console.log(`Frase EUH inserita con ROWID: ${newFraseEUHId}`);
        
        // Aggiorniamo l'ID_PK per corrispondere al ROWID
        await window.electronAPI.executeSQLite(
            'UPDATE "EUH" SET ID_PK = ? WHERE ROWID = ?',
            [newFraseEUHId, newFraseEUHId]
        );
        
        // Ricarica la tabella per mostrare la nuova frase EUH
        await loadTabellaRiscontroFrasiEUH();
        
        // Notifica utente
        showNotification('Nuova frase EUH inserita con successo');
        
        // Aggiungi attività
        addActivity('Frase EUH inserita', `Nuova frase: ${datiNuovaFraseEUH.EUH}`, 'fas fa-plus');
        
        return true;
    } catch (error) {
        console.error('Errore nell\'inserimento della frase EUH:', error);
        showNotification('Errore nell\'inserimento: ' + error.message, 'error');
        return false;
    }
}




// Funzione per aggiungere il controllo di validazione
function aggiungiControlloFrasiH() {
    // Controlla se siamo nella pagina corretta
    if (!document.getElementById('frasiHContainer') || !document.getElementById('frasiEUHContainer')) {
        // Non siamo nella pagina di inserimento, usciamo
        return;
    }
    
    // Definisci le espressioni regolari per le validazioni
    const regexH = /^H\d{3}$/;    // H seguito da esattamente 3 numeri
    const regexEUH = /^EUH\d{3}$/; // EUH seguito da esattamente 3 numeri
    
    // Funzione per aggiungere stile CSS al documento
    function aggiungiStile() {
        if (!document.getElementById('stileValidazione')) {
            const style = document.createElement('style');
            style.id = 'stileValidazione';
            style.textContent = `
                .input-error {
                    border: 2px solid #e74c3c !important;
                }
                .messaggio-errore {
                    color: #e74c3c;
                    font-size: 0.8rem;
                    margin-top: 0.25rem;
                    display: block;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Aggiungi lo stile necessario
    aggiungiStile();
    
    // Funzione per validare un input
    function validaInput(input, regex, messaggioErrore) {
        const valore = input.value.trim();
        const contenitore = input.parentNode;
        
        // Rimuovi eventuali messaggi di errore esistenti
        const vecchioErrore = contenitore.querySelector('.messaggio-errore');
        if (vecchioErrore) {
            vecchioErrore.remove();
        }
        
        // Se l'input è vuoto, non mostrare errori
        if (valore === '') {
            input.classList.remove('input-error');
            return;
        }
        
        // Verifica se il valore corrisponde al formato richiesto
        if (!regex.test(valore)) {
            input.classList.add('input-error');
            
            // Crea e aggiungi messaggio di errore
            const errore = document.createElement('span');
            errore.className = 'messaggio-errore';
            errore.textContent = messaggioErrore;
            contenitore.appendChild(errore);
        } else {
            input.classList.remove('input-error');
        }
    }
    
    // Funzione per monitorare gli input esistenti
    function monitoraInputEsistenti() {
        // Monitora tutte le frasi H esistenti
        document.querySelectorAll('.frase-h-input').forEach(input => {
            // Rimuovi eventuali listener esistenti per evitare duplicati
            input.removeEventListener('input', validazioneFraseH);
            input.addEventListener('input', validazioneFraseH);
        });
        
        // Monitora tutte le frasi EUH esistenti
        document.querySelectorAll('.frase-euh-input').forEach(input => {
            // Rimuovi eventuali listener esistenti per evitare duplicati
            input.removeEventListener('input', validazioneFraseEUH);
            input.addEventListener('input', validazioneFraseEUH);
        });
    }
    
    // Funzioni di validazione specifiche
    function validazioneFraseH() {
        validaInput(this, regexH, 'Formato richiesto: H seguito da 3 cifre (es. H230)');
    }
    
    function validazioneFraseEUH() {
        validaInput(this, regexEUH, 'Formato richiesto: EUH seguito da 3 cifre (es. EUH029)');
    }
    
    // Osserva le modifiche al DOM per intercettare nuovi input aggiunti
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    // Verifica se il nodo è un elemento HTML
                    if (node.nodeType === 1) {
                        // Cerca nuovi input frase H
                        const inputsH = node.querySelectorAll ? node.querySelectorAll('.frase-h-input') : [];
                        inputsH.forEach(input => {
                            input.addEventListener('input', validazioneFraseH);
                        });
                        
                        // Cerca nuovi input frase EUH
                        const inputsEUH = node.querySelectorAll ? node.querySelectorAll('.frase-euh-input') : [];
                        inputsEUH.forEach(input => {
                            input.addEventListener('input', validazioneFraseEUH);
                        });
                    }
                });
            }
        });
    });
    
    // Avvia l'osservazione dei container
    observer.observe(document.getElementById('frasiHContainer'), { 
        childList: true, 
        subtree: true 
    });
    
    observer.observe(document.getElementById('frasiEUHContainer'), { 
        childList: true, 
        subtree: true 
    });
    
    // Monitora gli input già esistenti
    monitoraInputEsistenti();
    
    // Assicuriamoci di monitorare anche quando si aggiungono nuovi campi
    const aggiungiHBtn = document.getElementById('aggiungiHBtn');
    if (aggiungiHBtn) {
        aggiungiHBtn.addEventListener('click', () => {
            // Attendiamo che il DOM sia aggiornato
            setTimeout(monitoraInputEsistenti, 50);
        });
    }
    
    const aggiungiEUHBtn = document.getElementById('aggiungiEUHBtn');
    if (aggiungiEUHBtn) {
        aggiungiEUHBtn.addEventListener('click', () => {
            // Attendiamo che il DOM sia aggiornato
            setTimeout(monitoraInputEsistenti, 50);
        });
    }
}

// Esegui la funzione quando il documento è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aggiungiControlloFrasiH);
} else {
    aggiungiControlloFrasiH();
}





//ESPOSIZIONE GLOBALE DELLE FUNZIONI
// Esponi le funzioni utilizzate da altri moduli
window.initTabellaRiscontro = initTabellaRiscontro;
window.loadTabellaRiscontroSali = loadTabellaRiscontroSali;
window.loadTabellaRiscontroSostanze = loadTabellaRiscontroSostanze;
window.loadTabellaRiscontroFrasiH = loadTabellaRiscontroFrasiH;
window.loadTabellaRiscontroFrasiEUH = loadTabellaRiscontroFrasiEUH;
window.aggiungiCampoFraseEUH = aggiungiCampoFraseEUH;
window.attivaModeModificaSale = attivaModeModificaSale;
window.salvaSaleSingolo = salvaSaleSingolo;
window.eliminaSale = eliminaSale;
window.attivaModeModificaSostanza = attivaModeModificaSostanza;
window.salvaSostanzaSingola = salvaSostanzaSingola;
window.eliminaSostanza = eliminaSostanza;
window.attivaModeModificaFraseH = attivaModeModificaFraseH;
window.salvaFraseHSingola = salvaFraseHSingola;
window.eliminaFraseH = eliminaFraseH;
window.attivaModeModificaFraseEUH = attivaModeModificaFraseEUH;
window.salvaFraseEUHSingola = salvaFraseEUHSingola;
window.eliminaFraseEUH = eliminaFraseEUH;
window.loadSostanzeSelect = loadSostanzeSelect;
window.loadCategorieSelect = loadCategorieSelect;
window.loadMetalliSelect = loadMetalliSelect;
window.salvaSaliModificati = salvaSaliModificati;
window.inserisciNuovaSostanza = inserisciNuovaSostanza;
window.resetFormNuovaSostanza = resetFormNuovaSostanza;
window.inserisciNuovoSale = inserisciNuovoSale;
window.inserisciNuovaFraseH = inserisciNuovaFraseH;
window.inserisciNuovaFraseEUH = inserisciNuovaFraseEUH;
window.initConfrontoSection = initConfrontoSection;
window.inserisciNuovaFraseEUH = inserisciNuovaFraseEUH;


// Esponi le funzioni utilizzate da altri moduli
window.loadEchaComparisonResults = loadEchaComparisonResults;
window.handleEchaUpdateAction = handleEchaUpdateAction;

// Esponi le funzioni globalmente
window.frasiHToHazardClass = frasiHToHazardClass;
window.frasiHValide = frasiHValide;
window.updateHazardClassOptions = updateHazardClassOptions;
window.inizializzaFormFrasiH = inizializzaFormFrasiH;

// Esponi le funzioni globalmente per uso esterno
window.validaCodCAS = validaCodCAS;
window.aggiungiValidazioneCAS = aggiungiValidazioneCAS;

// Esponi le nuove funzioni per i sali con frasi H e EUH
window.aggiungiCampoFraseHSale = aggiungiCampoFraseHSale;
window.aggiungiCampoFraseEUHSale = aggiungiCampoFraseEUHSale;
window.updateHazardClassSaleOptions = updateHazardClassSaleOptions;
window.validaFrasiHSale = validaFrasiHSale;
window.resetFormNuovoSaleCompleto = resetFormNuovoSaleCompleto;
window.inizializzaFormFrasiHSale = inizializzaFormFrasiHSale;

// Esponi le nuove funzioni globalmente
window.verificaNomeSaleEsistente = verificaNomeSaleEsistente;
window.verificaNomeSaleVsSostanze = verificaNomeSaleVsSostanze;
window.inserisciNuovoSaleConFrasiValidato = inserisciNuovoSaleConFrasiValidato;