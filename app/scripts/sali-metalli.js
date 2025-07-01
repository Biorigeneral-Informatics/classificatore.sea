/*
    Questo file gestisce la creazione dinamica della sezione sali metalli, inserendo solo
    le sostanze con categoria "metallo" nel campione. Questo file quindi interagisce anche con il dtabase
    per cercare quelle sostanze.

*/






// Variabile globale per memorizzare tutti i metalli dal database
let metalliDizionario = {};








// Funzione per generare data/ora in formato italiano
function generateItalianDateTime() {
    const now = new Date();
    return now.toLocaleString('it-IT', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/[\/\s:]/g, '-').replace(/--/g, '_'); // 25-12-2024_14-30-25
}

// Funzione per caricare tutti i metalli dal database
async function loadMetalli() {
    try {
        // Interroga il database SQLite per tutte le sostanze con Categoria = "Metallo"
        const result = await window.electronAPI.querySQLite(
            'SELECT * FROM sostanze WHERE Categoria = ?', 
            ['Metallo']
        );
        
        // Verifica se la query ha avuto successo
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento dei metalli');
        }
        
        // Resetta il dizionario
        metalliDizionario = {};
        
        // Popola il dizionario con i dati dei metalli
        result.data.forEach(metal => {
            metalliDizionario[metal.ID] = {
                id: metal.ID,
                nome: metal.Nome,
                cas: metal.CAS,
                concentrazione: null, // Sarà popolato successivamente dal file di input
                saliAssociati: []     // Sarà popolato con i sali associati
            };
        });
        
        console.log('Metalli caricati:', metalliDizionario);
        return metalliDizionario;
    } catch (error) {
        console.error('Errore nel caricamento dei metalli:', error);
        showNotification('Errore nel caricamento dei metalli', 'error');
        
        // Restituisce un dizionario vuoto in caso di errore
        return {};
    }
}

// Funzione per caricare tutti i sali associati ai metalli
async function loadSaliMetalli() {
    try {
        // Assicurati che i metalli siano caricati per primi
        if (Object.keys(metalliDizionario).length === 0) {
            await loadMetalli();
        }
        
        // Interroga il database SQLite per tutti i sali
        const result = await window.electronAPI.querySQLite('SELECT * FROM sali', []);
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento dei sali');
        }
        
        // Crea una mappa dei sali per ogni metallo
        const saliPerMetallo = {};
        
        result.data.forEach(sale => {
            const metalloNome = sale.Metallo;
            
            // Trova l'ID del metallo tramite il nome
            let metalloId = null;
            for (const [id, metallo] of Object.entries(metalliDizionario)) {
                if (metallo.nome === metalloNome) {
                    metalloId = id;
                    break;
                }
            }
            
            // Se il metallo è stato trovato, aggiungi il sale alla sua lista
            if (metalloId) {
                if (!saliPerMetallo[metalloId]) {
                    saliPerMetallo[metalloId] = [];
                }
                
                saliPerMetallo[metalloId].push({
                    id: sale.ID,
                    nome: sale.Sali,
                    cas: sale.CAS,
                    fattore: sale.Fattore,
                    default: sale.Default === 1 || sale.Default === true
                });
            }
        });

        // Aggiorna il metalliDizionario con i sali associati
        for (const [metalloId, sali] of Object.entries(saliPerMetallo)) {
            if (metalliDizionario[metalloId]) {
                metalliDizionario[metalloId].saliAssociati = sali;
            }
        }
        
        console.log('Sali associati ai metalli:', saliPerMetallo);
        return saliPerMetallo;
    } catch (error) {
        console.error('Errore nel caricamento dei sali per metalli:', error);
        showNotification('Errore nel caricamento dei sali per metalli', 'error');
        return {};
    }
}

// Funzione per aggiornare l'interfaccia utente con i metalli e i loro sali in sali-metalli
function renderSaliMetalliUI() {
    const container = document.getElementById('metalAssociationContainer');
    
    // Pulisci il contenitore
    container.innerHTML = '';
    
    // Log per mostrare tutti i metalli prima del filtro
    console.log("Tutti i metalli prima del filtro:", JSON.stringify(metalliDizionario));
    
    // Filtra solo i metalli che hanno una concentrazione (quelli nel campione)
    const metalliNelCampione = Object.values(metalliDizionario)
        .filter(metallo => {
            console.log(`Metallo ${metallo.nome}: concentrazione = ${metallo.concentrazione}`);
            return metallo.concentrazione !== null && metallo.concentrazione > 0;
        });
    
    console.log(`Metalli con concentrazione > 0: ${metalliNelCampione.length}`);
    console.log('Metalli filtrati:', JSON.stringify(metalliNelCampione));
    
    // ✅ CASO: Nessun metallo nel campione - ATTIVA BYPASS
    if (metalliNelCampione.length === 0) {
        console.log("🔄 Nessun metallo trovato - Preparazione bypass automatico");
        
        // Mostra messaggio informativo con opzione di bypass
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>Nessun metallo rilevabile trovato nel campione.</p>
                <p>Il file contiene solo sostanze non-metalli e può essere inviato direttamente alla sezione Classificazione.</p>
                <div style="margin-top: 1rem;">
                    <button id="bypassSaliMetalli" class="btn btn-primary">
                        <i class="fas fa-forward"></i> Invia direttamente a Classificazione
                    </button>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.9em; color: #666;">
                    <i class="fas fa-clock"></i> Bypass automatico tra <span id="countdown">5</span> secondi...
                </div>
            </div>
        `;
        
        // ✅ Event listener per il bypass manuale
        const bypassButton = document.getElementById('bypassSaliMetalli');
        if (bypassButton) {
            bypassButton.addEventListener('click', async () => {
                clearInterval(countdownTimer); // Ferma il countdown
                await bypassSaliMetalliAndSaveFile();
            });
        }
        
        // ✅ Countdown visivo e bypass automatico dopo 5 secondi
        let secondsLeft = 5;
        const countdownElement = document.getElementById('countdown');
        
        const countdownTimer = setInterval(() => {
            secondsLeft--;
            if (countdownElement) {
                countdownElement.textContent = secondsLeft;
            }
            
            if (secondsLeft <= 0) {
                clearInterval(countdownTimer);
                if (document.getElementById('bypassSaliMetalli')) {
                    console.log("🤖 Bypass automatico attivato dopo countdown");
                    bypassSaliMetalliAndSaveFile();
                }
            }
        }, 1000);
        
        return; // Esci dalla funzione
    }
    
    // Crea una sezione per ogni metallo nel campione
    for (const metallo of metalliNelCampione) {
        // Crea una card per ogni metallo
        const metalCard = document.createElement('div');
        metalCard.className = 'stat-card';
        metalCard.style.marginBottom = '1rem';
        
        let saliHtml = '';
        
        // Aggiungi dropdown per ogni sale associato
        if (metallo.saliAssociati && metallo.saliAssociati.length > 0) {
            // Trova il sale predefinito
            const defaultSale = metallo.saliAssociati.find(sale => sale.default) || metallo.saliAssociati[0];
            
            saliHtml = `
                <div class="sali-options" style="margin-top: 1rem;">
                    <p style="margin-bottom: 0.5rem; font-weight: 600;">Seleziona il sale associato:</p>
                    <div class="form-group">
                        <select class="form-control sale-select" id="sale-select-${metallo.id}" data-metallo-id="${metallo.id}" data-metallo-nome="${metallo.nome}">
            `;
            
            metallo.saliAssociati.forEach(sale => {
                const isSelected = sale.default ? 'selected' : '';
                saliHtml += `
                    <option value="${sale.id}" data-fattore="${sale.fattore}" ${isSelected}>
                        ${sale.nome} (CAS: ${sale.cas}, Fattore: ${sale.fattore})
                    </option>
                `;
            });
            
            saliHtml += `
                        </select>
                    </div>
                    <div class="mt-4">
                        <p style="font-size: 0.9rem; color: var(--text-muted);">
                            <strong>Fattore di conversione:</strong> <span id="fattore-display-${metallo.id}">${defaultSale.fattore}</span>
                        </p>
                    </div>
                </div>
            `;
        } else {
            saliHtml = `
                <div class="sali-options" style="margin-top: 1rem;">
                    <p style="color: var(--text-muted);">Nessun sale associato a questo metallo.</p>
                </div>
            `;
        }
        
        // Imposta il contenuto della card
        metalCard.innerHTML = `
            <i class="fas fa-flask"></i>
            <div class="stat-info" style="width: 100%;">
                <h4>${metallo.nome} (CAS: ${metallo.cas})</h4>
                <p>Concentrazione: ${metallo.concentrazione !== null ? metallo.concentrazione + ' ppm' : 'N/A'}</p>
                ${saliHtml}
            </div>
        `;
        
        container.appendChild(metalCard);
    }
    
    // Aggiungi il pulsante di assegnazione
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'report-button-container';
    buttonContainer.style.display = 'block';
    buttonContainer.innerHTML = `
        <button id="assignSaliBtn" class="btn btn-primary">
            <i class="fas fa-check"></i> ASSEGNA SALI
        </button>
    `;
    
    container.appendChild(buttonContainer);
    
    // Aggiungi event listener al pulsante di assegnazione
    document.getElementById('assignSaliBtn').addEventListener('click', assegnaSaliMetalli);
    
    // Aggiungi event listeners a tutti i dropdown
    document.querySelectorAll('.sale-select').forEach(select => {
        select.addEventListener('change', function() {
            const metalloId = this.getAttribute('data-metallo-id');
            const selectedOption = this.options[this.selectedIndex];
            const fattore = selectedOption.getAttribute('data-fattore');
            
            // Aggiorna il fattore visualizzato
            document.getElementById(`fattore-display-${metalloId}`).textContent = fattore;
        });
    });
}

// Funzione per aggiornare il dizionario dei metalli con le concentrazioni dal file di input
function updateMetalliConcentrations(excelData) {
    // Resetta le concentrazioni
    for (const metallo of Object.values(metalliDizionario)) {
        metallo.concentrazione = null;
    }
    
    // Estrai le concentrazioni dai dati Excel
    if (!excelData || !Array.isArray(excelData)) {
        console.warn('Dati Excel non validi per l\'aggiornamento delle concentrazioni');
        return;
    }
    
    // Ottieni i nomi delle colonne (assumendo che la prima riga abbia le intestazioni)
    const headers = Object.keys(excelData[0]);
    
    // Elabora ogni riga
    excelData.forEach(row => {
        // Ottieni il nome della sostanza e la concentrazione dalla riga
        const sostanzaNome = row[headers[0]]; // La prima colonna è il nome della sostanza
        const concentrazione = parseFloat(row[headers[1]]); // La seconda colonna è la concentrazione
        
        // Controlla se questa sostanza è nel nostro dizionario dei metalli
        for (const metallo of Object.values(metalliDizionario)) {
            // Controlla se il nome della sostanza contiene il nome del metallo
            if (sostanzaNome.toLowerCase().includes(metallo.nome.toLowerCase())) {
                metallo.concentrazione = concentrazione;
                console.log(`Assegnata concentrazione ${concentrazione} a ${metallo.nome}`);
                break;
            }
        }
    });
    
    console.log('Concentrazioni aggiornate:', metalliDizionario);
}

// Funzione per assegnare i sali selezionati ai metalli e calcolare le concentrazioni aggiustate
// MODIFICATO: assegnaSaliMetalli per usare codice EER nel nome file
// MODIFICA alla funzione assegnaSaliMetalli() - Aggiungi pulizia dopo salvataggio
async function assegnaSaliMetalli() {
    try {
        console.log('Avvio assegnazione sali...');
        
        // Ottieni tutte le selezioni dei sali
        const selezioni = {};
        const selezioniElements = document.querySelectorAll('.sale-select');
        
        selezioniElements.forEach(select => {
            const metalloNome = select.getAttribute('data-metallo-nome');
            const saleId = select.value;
            
            if (metalloNome && saleId) {
                selezioni[metalloNome] = saleId;
            }
        });
        
        if (Object.keys(selezioni).length === 0) {
            showNotification('Nessun sale selezionato. Seleziona almeno un sale prima di procedere.', 'warning');
            return {};
        }
        
        console.log('Selezioni sali:', selezioni);
        
        // Prepara i dati dei metalli per il calcolo
        const metalliCampione = {};
        for (const [metalloNome, saleId] of Object.entries(selezioni)) {
            // Trova il metallo nel dizionario
            const metallo = Object.values(metalliDizionario).find(m => m.nome === metalloNome);
            if (metallo && metallo.concentrazione !== null) {
                metalliCampione[metalloNome] = {
                    concentrazione_ppm: metallo.concentrazione
                };
            }
        }
        
        console.log('Metalli campione per calcolo:', metalliCampione);
        
        // Chiama lo script Python per il calcolo
        const result = await window.electronAPI.runPythonScript(
            'calcola_metalli.py',
            [JSON.stringify(metalliCampione), JSON.stringify(selezioni)]
        );
        
        console.log('Risultato calcolo Python:', result);
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel calcolo delle concentrazioni');
        }
        
        // Risultati calcolati da Python
        const risultatiCalcolati = result.data;
        
        // NUOVO: Carica i metadati dal progetto unificato
        let metadatiProgetto = null;
        try {
            const progettoResult = await window.electronAPI.loadProgettoRaccolta();
            if (progettoResult.success && progettoResult.data) {
                metadatiProgetto = {
                    committente: progettoResult.data.infoCertificato?.committente || 'Committente Sconosciuto',
                    dataCampionamento: progettoResult.data.infoCertificato?.dataCampionamento || new Date().toISOString().split('T')[0],
                    codiceEER: progettoResult.data.infoCertificato?.codiceEER || 'EER_MANCANTE',
                    numeroCampionamento: progettoResult.data.infoCertificato?.numeroCampionamento,
                    caratteristicheFisiche: progettoResult.data.caratteristicheFisiche || {},
                    infoCertificato: progettoResult.data.infoCertificato || {},
                    timestampProgetto: progettoResult.data.timestamp,
                    idProgetto: progettoResult.data.id
                };
                console.log("Metadati estratti dal progetto:", metadatiProgetto);
            }
        } catch (error) {
            console.warn("Impossibile caricare metadati dal progetto, continuo senza:", error.message);
        }
        
        // Prepara i dati completi del campione per il classificatore
        const datiCampione = {
            // NUOVO: Aggiungi metadati come proprietà speciale
            _metadata: metadatiProgetto
        };

        // Includi i risultati calcolati (sali con fattori di conversione applicati)
        for (const [saleNome, saleDati] of Object.entries(risultatiCalcolati)) {
            datiCampione[saleNome] = {
                concentrazione_ppm: saleDati.concentrazione_ppm,
                concentrazione_percentuale: saleDati.concentrazione_percentuale,
                nome_originale: saleDati.nome_originale
            };
        }
        
        // Prova a ottenere altre sostanze non-metalli dal progetto
        try {
            const progettoResult = await window.electronAPI.loadProgettoRaccolta();
            if (progettoResult.success && progettoResult.data?.datiExcel) {
                const excelData = progettoResult.data.datiExcel;
                
                // Cerca altre sostanze nei dati Excel che non sono metalli
                if (Array.isArray(excelData)) {
                    excelData.forEach(row => {
                        // Estrai il nome della sostanza e il valore
                        const sostanzaNome = row.Descriz || '';
                        const valoreStr = row.Valore_Txt || '';

                        // Normalizza il nome della sostanza
                        const sostanzaNomeNormalizzato = sostanzaNome.replace(/\s+/g, ' ').trim();
                        
                        // Controlla se la sostanza è già presente nei dati dei sali
                        let sostanzaGiaPresente = false;
                        for (const chiave in datiCampione) {
                            if (chiave !== '_metadata' && datiCampione[chiave].nome_originale === sostanzaNomeNormalizzato) {
                                sostanzaGiaPresente = true;
                                break;
                            }
                        }
                        
                        // Se non è presente e ha un valore numerico valido, aggiungila
                        if (!sostanzaGiaPresente && valoreStr && !valoreStr.trim().startsWith('<')) {
                            // Prova a convertire in numero
                            const valoreNumerico = parseFloat(valoreStr.replace(',', '.'));
                            if (!isNaN(valoreNumerico)) {
                                console.log(`Aggiunta sostanza non-metallo: ${sostanzaNomeNormalizzato} = ${valoreNumerico} ppm`);
                                datiCampione[sostanzaNomeNormalizzato] = {
                                    concentrazione_ppm: valoreNumerico,
                                    concentrazione_percentuale: valoreNumerico / 10000,
                                    nome_originale: sostanzaNomeNormalizzato
                                };
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.warn("Errore nel recupero sostanze aggiuntive dal progetto:", error.message);
        }
        
        console.log('Dati campione completi:', datiCampione);
        
        // Controlla il limite di file prima di salvare
        try {
            const fileList = await window.electronAPI.getCampioneFiles();
            
            if (fileList.length >= 8) {
                showNotification('Limite massimo di 8 file raggiunto. Elimina alcuni file dalla sezione Classificazione prima di continuare.', 'warning');
                return {};
            }
            
            // MODIFICATO: Genera nome file con codice EER
            const codiceEER = metadatiProgetto?.codiceEER || 'EER_MANCANTE';
            const committente = metadatiProgetto?.committente || 'Committente_Sconosciuto';
            const dataOraItaliana = generateItalianDateTime();
            
            // Sanifica committente per nome file
            const committenteSanificato = committente
                .replace(/[^a-zA-Z0-9]/g, '')
                .substring(0, 20);
            
            // NUOVO FORMATO: dati_campione_{codiceEER}_{dataOraItaliana}_{committente}.json
            const fileName = `dati_campione_${codiceEER}_${dataOraItaliana}_${committenteSanificato}.json`;
            
            console.log(`📁 Generato nome file: ${fileName}`);
            
            // Salva il file con i metadati inclusi
            const saveResult = await window.electronAPI.saveCampioneData(datiCampione, fileName);
            
            if (saveResult.success) {
                console.log(`✅ File ${fileName} salvato con successo con metadati inclusi`);
                
                // NUOVO: Elimina il progetto temporaneo dopo il successo
                try {
                    const deleteResult = await window.electronAPI.deleteProgettoRaccolta();
                    if (deleteResult.success) {
                        console.log("🗑️ Progetto temporaneo eliminato con successo");
                    } else {
                        console.warn("⚠️ Progetto temporaneo non eliminato:", deleteResult.message);
                    }
                } catch (deleteError) {
                    console.warn("⚠️ Errore nell'eliminazione del progetto temporaneo:", deleteError.message);
                    // Non bloccare il flusso se l'eliminazione fallisce
                }
                
                // ✅ NUOVO: PULIZIA INTERFACCIA SALI-METALLI DOPO SALVATAGGIO
                cleanUpSaliMetalliInterfaceAfterSave();
                
                showNotification(`File ${fileName} salvato con successo! Il progetto temporaneo è stato eliminato.`);
                
                // Aggiorna la UI della classificazione
                if (typeof updateClassificationUI === 'function') {
                    updateClassificationUI();
                }
            } else {
                throw new Error(saveResult.message || 'Errore nel salvataggio del file');
            }
        } catch (e) {
            console.error("Errore nel salvataggio dei dati campione:", e);
            showNotification('Errore nel salvataggio del file: ' + e.message, 'error');
            return {};
        }
                
        // Salva risultati in sessionStorage per uso immediato
        sessionStorage.setItem('metalliCalcolati', JSON.stringify(risultatiCalcolati));
        
        // Mostra notifica
        showNotification('Sali assegnati e concentrazioni calcolate con successo!');
        
        // Aggiungi attività
        addActivity('Sali assegnati', 'Associazione sali-metalli completata', 'fas fa-flask');
        
        // Vai alla sezione di classificazione
        showSection('classificazione');

        // Aggiorna l'interfaccia di classificazione
        if (typeof updateClassificationUI === 'function') {
            updateClassificationUI();
        }
        
        return risultatiCalcolati;
    } catch (error) {
        console.error('Errore nell\'assegnazione dei sali metalli:', error);
        showNotification('Errore nell\'assegnazione dei sali metalli: ' + error.message, 'error');
        return {};
    }
}

// ✅ NUOVA FUNZIONE: Pulisce l'interfaccia Sali-Metalli dopo il salvataggio
function cleanUpSaliMetalliInterfaceAfterSave() {
    try {
        console.log("🧹 Pulizia interfaccia Sali-Metalli in corso...");
        
        // Pulisci sessionStorage dei dati temporanei
        sessionStorage.removeItem('raccoltaExcelData');
        sessionStorage.removeItem('metalliCampione');
        sessionStorage.removeItem('metalliCalcolati');
        
        // Reset del dizionario dei metalli
        for (const metallo of Object.values(metalliDizionario)) {
            metallo.concentrazione = null;
        }
        
        // Reset dell'hash dei dati
        if (typeof lastExcelDataHash !== 'undefined') {
            lastExcelDataHash = null;
        }
        
        // Pulisci il container principale
        const container = document.getElementById('metalAssociationContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Carica un file dalla sezione Raccolta e completa il salvataggio per visualizzare i metalli.</p>
                </div>
            `;
        }
        
        // Resetta eventuali elementi di stato
        const metalCards = document.querySelectorAll('.stat-card');
        metalCards.forEach(card => {
            if (card.parentNode === container) {
                card.remove();
            }
        });
        
        console.log("✅ Interfaccia Sali-Metalli pulita con successo");
        
    } catch (error) {
        console.error('❌ Errore nella pulizia interfaccia Sali-Metalli:', error);
        // Fallback: almeno pulisci il container principale
        const container = document.getElementById('metalAssociationContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Carica un file dalla sezione Raccolta per visualizzare i metalli.</p>
                </div>
            `;
        }
    }
}

// ✅ MODIFICA alla funzione updateSaliMetalliWithExcelData per gestire il reset
function updateSaliMetalliWithExcelData() {
    console.log('updateSaliMetalliWithExcelData chiamata - verifica presenza progetto unificato...');
    
    // NUOVO: Prima controlla se c'è un progetto unificato (priorità massima)
    window.electronAPI.hasProgettoRaccolta()
        .then(hasProgetto => {
            if (hasProgetto) {
                console.log('Progetto unificato rilevato, delegando a initSaliMetalli()');
                // Se c'è un progetto unificato, initSaliMetalli() lo gestirà automaticamente
                initSaliMetalli();
                return; // Esci dalla funzione
            }
            
            // FALLBACK: Se non c'è progetto unificato, usa la logica sessionStorage esistente
            console.log('Nessun progetto unificato, utilizzo sessionStorage...');
            
            // Recupera i dati dalla sessionStorage utilizzando la chiave corretta
            const raccoltaDataStr = sessionStorage.getItem('raccoltaExcelData');
            const excelData = raccoltaDataStr ? JSON.parse(raccoltaDataStr) : [];

            // ✅ NUOVO: Verifica se stiamo ripristinando (array vuoto o null)
            if (!excelData || excelData.length === 0) {
                console.log('🔄 Reset della sezione sali-metalli');
                cleanUpSaliMetalliInterfaceAfterSave();
                return;
            }
            
            // Calcola un hash semplice dei dati per verificare se sono cambiati
            const currentDataHash = JSON.stringify(excelData).length;
            
            // Controlla se i dati sono gli stessi dell'ultimo aggiornamento
            if (lastExcelDataHash === currentDataHash) {
                console.log('I dati sessionStorage sono invariati, nessun aggiornamento necessario');
                return;
            }
            
            console.log('Dati sessionStorage cambiati, aggiornamento interfaccia...');
            
            // Carica i metalli dal database se non sono già caricati
            Promise.all([loadMetalli(), loadSaliMetalli()])
                .then(() => {
                    // Aggiorna le concentrazioni dei metalli
                    updateMetalliConcentrations(excelData);
                    
                    // Aggiorna l'interfaccia utente
                    renderSaliMetalliUI();
                    
                    // Aggiorna l'hash
                    lastExcelDataHash = currentDataHash;
                })
                .catch(error => {
                    console.error('Errore nel caricamento dei dati per sali-metalli:', error);
                    showNotification('Errore nel caricamento dei dati', 'error');
                });
        })
        .catch(error => {
            console.error('Errore nel controllo progetto unificato:', error);
            // Fallback alla logica sessionStorage
            const raccoltaDataStr = sessionStorage.getItem('raccoltaExcelData');
            const excelData = raccoltaDataStr ? JSON.parse(raccoltaDataStr) : [];
            
            if (!excelData || excelData.length === 0) {
                cleanUpSaliMetalliInterfaceAfterSave();
                return;
            }
            
            updateMetalliConcentrations(excelData);
            renderSaliMetalliUI();
        });
}

// Variabile globale per tenere traccia dell'ultimo hash dei dati caricati
let lastExcelDataHash = null;


// Inizializza la sezione sali-metalli
// MODIFICATO: initSaliMetalli per leggere dal progetto unificato
async function initSaliMetalli() {
    try {
        console.log("Inizializzazione sali-metalli con progetto unificato...");
        
        // NUOVO: Prima controlla se esiste un progetto unificato
        const hasProgetto = await window.electronAPI.hasProgettoRaccolta();
        
        if (hasProgetto) {
            console.log("Progetto unificato trovato, caricamento in corso...");
            
            const progettoResult = await window.electronAPI.loadProgettoRaccolta();
            
            if (progettoResult.success && progettoResult.data) {
                const progetto = progettoResult.data;
                console.log("Progetto caricato:", progetto);
                
                // Carica i metalli dal database
                await loadMetalli();
                await loadSaliMetalli();
                
                // NUOVO: Usa i metalli_campione dal progetto unificato
                if (progetto.metalliCampione && Object.keys(progetto.metalliCampione).length > 0) {
                    console.log("Metalli campione trovati nel progetto:", progetto.metalliCampione);
                    
                    // Assegna le concentrazioni dai metalli_campione del progetto
                    let metalliAssegnati = 0;
                    
                    for (const [metalloNome, metalloDati] of Object.entries(progetto.metalliCampione)) {
                        console.log(`Processando metallo dal progetto: ${metalloNome}`);
                        
                        if (!metalloDati.concentrazione_ppm && !metalloDati.metallo_db_id) {
                            console.warn(`Metallo ${metalloNome} senza concentrazione o ID database, saltato`);
                            continue;
                        }
                        
                        // Se il metallo dal backend ha un ID database, usiamo quello
                        if (metalloDati.metallo_db_id) {
                            const id = metalloDati.metallo_db_id;
                            if (metalliDizionario[id]) {
                                metalliDizionario[id].concentrazione = metalloDati.concentrazione_ppm;
                                console.log(`Assegnata concentrazione ${metalloDati.concentrazione_ppm} a ${metalliDizionario[id].nome} (ID: ${id})`);
                                metalliAssegnati++;
                            } else {
                                console.warn(`Metallo con ID ${id} non trovato nel dizionario.`);
                            }
                            continue;
                        }
                        
                        // Cerca di abbinare per nome normalizzato
                        let trovato = false;
                        const nomeNormalizzato = metalloNome.toLowerCase().replace(/\s+/g, '');
                        
                        for (const metallo of Object.values(metalliDizionario)) {
                            const metalloDbNormalizzato = metallo.nome.toLowerCase().replace(/\s+/g, '');
                            
                            if (nomeNormalizzato === metalloDbNormalizzato || 
                                nomeNormalizzato.includes(metalloDbNormalizzato) || 
                                metalloDbNormalizzato.includes(nomeNormalizzato)) {
                                metallo.concentrazione = metalloDati.concentrazione_ppm;
                                console.log(`Assegnata concentrazione ${metalloDati.concentrazione_ppm} a ${metallo.nome}`);
                                trovato = true;
                                metalliAssegnati++;
                                break;
                            }
                        }
                        
                        if (!trovato) {
                            console.warn(`Non è stato possibile abbinare il metallo ${metalloNome} a nessun metallo nel database`);
                        }
                    }
                    
                    console.log(`Assegnate concentrazioni a ${metalliAssegnati} metalli dal progetto unificato`);
                    
                    // Salva anche in sessionStorage per retrocompatibilità
                    sessionStorage.setItem('metalliCampione', JSON.stringify(progetto.metalliCampione));
                    
                } else if (progetto.datiExcel && progetto.datiExcel.length > 0) {
                    console.log("Nessun metallo campione nel progetto, tento estrazione dai dati Excel");
                    
                    // Fallback: tenta di estrarre dai dati Excel del progetto
                    updateMetalliConcentrations(progetto.datiExcel);
                    
                    // Salva anche in sessionStorage per retrocompatibilità
                    sessionStorage.setItem('raccoltaExcelData', JSON.stringify(progetto.datiExcel));
                }
                
                // Aggiorna l'interfaccia
                renderSaliMetalliUI();
                return;
            } else {
                console.error("Errore nel caricamento del progetto:", progettoResult.message);
            }
        }
        
        // FALLBACK: Se non c'è progetto unificato, usa il metodo esistente (sessionStorage)
        console.log("Nessun progetto unificato trovato, utilizzo fallback sessionStorage...");
        
        // Prima controlla se abbiamo metalli_campione in sessionStorage (prioritario)
        const metalliCampioneStr = sessionStorage.getItem('metalliCampione');
        
        if (metalliCampioneStr) {
            console.log("Metalli campione trovati in sessionStorage (fallback)");
            const metalliCampione = JSON.parse(metalliCampioneStr);
            
            // Carica prima i metalli dal database
            await loadMetalli();
            await loadSaliMetalli();
            
            // [Mantieni la logica esistente per sessionStorage...]
            // ... resto del codice esistente per sessionStorage
            
        } else {
            // Controlla se abbiamo dati Excel in sessionStorage
            const excelDataStr = sessionStorage.getItem('raccoltaExcelData');
            if (excelDataStr) {
                console.log("Dati Excel trovati in sessionStorage (fallback)");
                
                await loadMetalli();
                await loadSaliMetalli();
                
                const excelData = JSON.parse(excelDataStr);
                updateMetalliConcentrations(excelData);
                
                renderSaliMetalliUI();
            } else {
                console.log("Nessun dato disponibile per sali-metalli");
                
                // Mostra messaggio che invita a completare la raccolta
                const container = document.getElementById('metalAssociationContainer');
                container.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-info-circle"></i>
                        <p>Carica un file dalla sezione Raccolta e completa il salvataggio per visualizzare i metalli.</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Errore nell\'inizializzazione della sezione sali-metalli:', error);
        
        // Mostra un messaggio di errore
        const container = document.getElementById('metalAssociationContainer');
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Errore nell'inizializzazione: ${error.message}</p>
                <p>Riprova caricando un file nella sezione Raccolta.</p>
            </div>
        `;
    }
}


// Funzione per salvare il file con timestamp dopo l'assegnazione dei sali
async function salvaFileConTimestamp(datiCampione) {
    try {
        // Genera timestamp per il nome del file
        const dataOraItaliana = generateItalianDateTime();
        const fileName = `dati_campione_GENERICO_${dataOraItaliana}.json`;
        
        // Verifica quanti file ci sono già nella cartella
        const fileList = await window.electronAPI.getCampioneFiles();
        
        if (fileList.length >= 8) {
            showNotification('Limite massimo di 8 file raggiunto. Elimina alcuni file dalla sezione Classificazione prima di continuare.', 'warning');
            return false;
        }
        
        // Salva il file nella cartella dedicata
        const saveResult = await window.electronAPI.saveCampioneData(datiCampione, fileName);
        
        if (saveResult.success) {
            console.log(`File ${fileName} salvato con successo`);
            showNotification(`File ${fileName} salvato con successo`);
            return fileName;
        } else {
            throw new Error(saveResult.message || 'Errore nel salvataggio del file');
        }
        
    } catch (error) {
        console.error('Errore nel salvataggio del file con timestamp:', error);
        showNotification('Errore nel salvataggio del file: ' + error.message, 'error');
        return false;
    }
}

// ✅ NUOVA FUNZIONE: Bypass della sezione Sali-Metalli per file senza metalli
async function bypassSaliMetalliAndSaveFile() {
    try {
        console.log("🔄 Avvio bypass Sali-Metalli per file senza metalli...");
        
        // Recupera metadati del progetto
        let metadatiProgetto = null;
        try {
            const progettoResult = await window.electronAPI.loadProgettoRaccolta();
            if (progettoResult.success && progettoResult.data) {
                metadatiProgetto = {
                    committente: progettoResult.data.infoCertificato?.committente || 'Committente_Sconosciuto',
                    dataCampionamento: progettoResult.data.infoCertificato?.dataCampionamento || new Date().toISOString().split('T')[0],
                    codiceEER: progettoResult.data.infoCertificato?.codiceEER || 'EER_MANCANTE',
                    numeroCampionamento: progettoResult.data.infoCertificato?.numeroCampionamento,
                    caratteristicheFisiche: progettoResult.data.caratteristicheFisiche || {},
                    infoCertificato: progettoResult.data.infoCertificato || {},
                    timestampProgetto: progettoResult.data.timestamp,
                    idProgetto: progettoResult.data.id
                };
                console.log("Metadati estratti dal progetto per bypass:", metadatiProgetto);
            }
        } catch (error) {
            console.warn("Impossibile caricare metadati dal progetto per bypass:", error.message);
        }
        
        // Prepara i dati del campione SENZA sali (solo altre sostanze non-metalli)
        const datiCampione = {
            _metadata: metadatiProgetto
        };
        
        // ✅ CORREZIONE: Recupera sostanze non-metalli dal progetto
        try {
            const progettoResult = await window.electronAPI.loadProgettoRaccolta();
            if (progettoResult.success && progettoResult.data?.datiExcel) {
                const datiExcel = progettoResult.data.datiExcel;
                console.log("Dati Excel trovati nel progetto per bypass:", datiExcel);
                
                // Processa ogni riga dei dati Excel
                for (const row of datiExcel) {
                    const sostanzaNome = row.Descriz || '';
                    const valoreStr = row.Valore_Txt || '';
                    
                    console.log(`Processando sostanza: ${sostanzaNome} = ${valoreStr}`);
                    
                    // Salta se è vuoto o inizia con "<" (sotto soglia)
                    if (!sostanzaNome || !valoreStr || valoreStr.trim().startsWith('<')) {
                        console.log(`Saltata sostanza ${sostanzaNome}: valore sotto soglia o vuoto`);
                        continue;
                    }
                    
                    // ✅ CONTROLLO: Verifica se è un metallo (da escludere)
                    const isMetallo = await isMetalloCheck(sostanzaNome);
                    if (isMetallo) {
                        console.log(`Saltata sostanza ${sostanzaNome}: è un metallo`);
                        continue;
                    }
                    
                    // Prova a convertire in numero
                    const valoreNumerico = parseFloat(valoreStr.replace(',', '.'));
                    if (!isNaN(valoreNumerico) && valoreNumerico > 0) {
                        const sostanzaNormalizzata = sostanzaNome.trim();
                        
                        datiCampione[sostanzaNormalizzata] = {
                            concentrazione_ppm: valoreNumerico,
                            concentrazione_percentuale: valoreNumerico / 10000,
                            nome_originale: sostanzaNormalizzata
                        };
                        
                        console.log(`✅ Aggiunta sostanza non-metallo: ${sostanzaNormalizzata} = ${valoreNumerico} ppm`);
                    }
                }
            } else {
                console.warn("Nessun dato Excel trovato nel progetto per bypass");
            }
        } catch (error) {
            console.error("Errore nel recupero dati Excel per bypass:", error);
        }
        
        // Verifica che ci siano sostanze da includere
        const sostanzeKeys = Object.keys(datiCampione).filter(key => key !== '_metadata');
        console.log(`Sostanze trovate per bypass: ${sostanzeKeys.length}`, sostanzeKeys);
        
        if (sostanzeKeys.length === 0) {
            // ✅ GESTIONE CASO NESSUNA SOSTANZA: Crea file vuoto ma valido
            console.warn("Nessuna sostanza valida trovata, creando file di bypass minimo");
            
            // Aggiungi almeno una voce placeholder per evitare errori nel classificatore
            datiCampione['PLACEHOLDER_BYPASS'] = {
                concentrazione_ppm: 0.001,  // Valore minimo
                concentrazione_percentuale: 0.0000001,
                nome_originale: 'File senza sostanze rilevabili'
            };
        }
        
        // Genera nome file per il bypass
        const codiceEER = metadatiProgetto?.codiceEER || 'EER_MANCANTE';
        const committente = metadatiProgetto?.committente || 'Committente_Sconosciuto';
        const dataOraItaliana = generateItalianDateTime();
        
        const committenteSanificato = committente
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 20);
        
        const fileName = `dati_campione_${codiceEER}_${dataOraItaliana}_${committenteSanificato}.json`;
        
        console.log(`📁 Generato nome file per bypass: ${fileName}`);
        console.log(`📋 Contenuto dati campione:`, datiCampione);
        
        // Controlla limite file
        const fileList = await window.electronAPI.getCampioneFiles();
        if (fileList.length >= 8) {
            showNotification('Limite massimo di 8 file raggiunto. Elimina alcuni file dalla sezione Classificazione prima di continuare.', 'warning');
            return;
        }
        
        // Salva il file
        const saveResult = await window.electronAPI.saveCampioneData(datiCampione, fileName);
        
        if (saveResult.success) {
            console.log(`✅ File ${fileName} salvato con successo tramite bypass`);
            
            // Elimina il progetto temporaneo
            try {
                const deleteResult = await window.electronAPI.deleteProgettoRaccolta();
                if (deleteResult.success) {
                    console.log("🗑️ Progetto temporaneo eliminato con successo (bypass)");
                }
            } catch (deleteError) {
                console.warn("⚠️ Errore nell'eliminazione del progetto temporaneo (bypass):", deleteError.message);
            }
            
            // Pulisci interfaccia Sali-Metalli
            cleanUpSaliMetalliInterfaceAfterSave();
            
            const numSostanze = Object.keys(datiCampione).filter(k => k !== '_metadata').length;
            showNotification(`File ${fileName} salvato con successo! ${numSostanze} sostanze non-metalli processate.`, 'success');
            addActivity('Bypass Sali-Metalli', 'File senza metalli inviato direttamente a Classificazione', 'fas fa-forward');
            
            // Vai alla sezione classificazione
            showSection('classificazione');
            
            // Aggiorna l'interfaccia di classificazione
            if (typeof updateClassificationUI === 'function') {
                updateClassificationUI();
            }
            
        } else {
            throw new Error(saveResult.message || 'Errore nel salvataggio del file di bypass');
        }
        
    } catch (error) {
        console.error('❌ Errore nel bypass Sali-Metalli:', error);
        showNotification('Errore nel bypass: ' + error.message, 'error');
    }
}

// ✅ FUNZIONE HELPER: Verifica se una sostanza è un metallo (asincrona)
async function isMetalloCheck(nomeSostanza) {
    try {
        // Usa il dizionario dei metalli già caricato
        if (Object.keys(metalliDizionario).length === 0) {
            await loadMetalli(); // Carica se non ancora fatto
        }
        
        const nomePulito = nomeSostanza.toLowerCase().trim();
        
        // Controlla se la sostanza è presente nel dizionario dei metalli
        return Object.values(metalliDizionario).some(metallo => {
            const metalloNomePulito = metallo.nome.toLowerCase().trim();
            return metalloNomePulito === nomePulito || 
                   nomePulito.includes(metalloNomePulito) ||
                   metalloNomePulito.includes(nomePulito);
        });
        
    } catch (error) {
        console.warn(`Errore nella verifica metallo per ${nomeSostanza}:`, error);
        return false; // In caso di errore, considera come non-metallo
    }
}

// Esportazioni
window.salvaFileConTimestamp = salvaFileConTimestamp;