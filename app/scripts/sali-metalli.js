/*
    Questo file gestisce la creazione dinamica della sezione sali metalli, inserendo solo
    le sostanze con categoria "metallo" nel campione. Questo file quindi interagisce anche con il dtabase
    per cercare quelle sostanze.

*/






// Variabile globale per memorizzare tutti i metalli dal database
let metalliDizionario = {};








function generateItalianTimestamp() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const timestamp = parts.find(p => p.type === 'year').value +
                     parts.find(p => p.type === 'month').value +
                     parts.find(p => p.type === 'day').value +
                     parts.find(p => p.type === 'hour').value +
                     parts.find(p => p.type === 'minute').value +
                     parts.find(p => p.type === 'second').value;
    
    return timestamp;
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
    
    // Controlla se ci sono metalli nel campione
    if (metalliNelCampione.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>Nessun metallo trovato nel campione. Verifica i dati caricati o controlla che i valori non siano sotto il limite di rilevabilità.</p>
            </div>
        `;
        return;
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
async function assegnaSaliMetalli() {
    try {
        // Crea un dizionario con le selezioni sale-metallo
        const selezioniSali = {};
        const metalliCampione = {};
        
        // Elabora ogni metallo
        for (const [id, metallo] of Object.entries(metalliDizionario)) {
            // Salta i metalli senza concentrazione
            if (metallo.concentrazione === null) continue;
            
            // Ottieni il sale selezionato dal dropdown
            const selectElement = document.getElementById(`sale-select-${id}`);
            
            if (selectElement) {
                const saleId = selectElement.value;
                const metalloNome = metallo.nome; // Usa direttamente il nome dal dizionario
                
                // Aggiungi la selezione al dizionario
                selezioniSali[metalloNome] = saleId;
                
                // Aggiungi al dizionario dei metalli del campione
                metalliCampione[metalloNome] = {
                    "concentrazione_ppm": metallo.concentrazione
                };
            }
        }
        
        // Controlla se ci sono metalli da elaborare
        if (Object.keys(metalliCampione).length === 0) {
            showNotification('Nessun metallo con concentrazione trovato per l\'elaborazione', 'warning');
            return {};
        }
        
        console.log('Metalli campione:', JSON.stringify(metalliCampione));
        console.log('Selezioni sali:', JSON.stringify(selezioniSali));
        
        // Salva metalli_campione in sessionStorage
        sessionStorage.setItem('metalliCampione', JSON.stringify(metalliCampione));
        
        // Chiama lo script Python per il calcolo
        const result = await window.electronAPI.runPythonScript(
            'calcola_metalli.py',
            [JSON.stringify(metalliCampione), JSON.stringify(selezioniSali)]
        );
        
        console.log('Risultato calcolo Python:', result);
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel calcolo delle concentrazioni');
        }
        
        // Risultati calcolati da Python
        const risultatiCalcolati = result.data;
        
        // Salva in sessionStorage per l'uso nella classificazione
        sessionStorage.setItem('metalliCalcolati', JSON.stringify(risultatiCalcolati));
        
        //Prepara e salva i dati completi del campione per il classificatore
        const datiCampione = {};

        // Includi i risultati calcolati (sali con fattori di conversione applicati)
        for (const [saleNome, saleDati] of Object.entries(risultatiCalcolati)) {
            datiCampione[saleNome] = {
                concentrazione_ppm: saleDati.concentrazione_ppm,
                concentrazione_percentuale: saleDati.concentrazione_percentuale,
                nome_originale: saleDati.nome_originale // Manteniamo il riferimento al nome originale
            };
        }
        
        // Prova a ottenere i dati Excel originali se disponibili
        try {
            const excelDataStr = sessionStorage.getItem('raccoltaExcelData');
            if (excelDataStr) {
                const excelData = JSON.parse(excelDataStr);
                
                // Cerca altre sostanze nei dati Excel che non sono metalli
                if (Array.isArray(excelData)) {
                    excelData.forEach(row => {
                        // Estrai il nome della sostanza e il valore
                        const sostanzaNome = row.Descriz || '';
                        const valoreStr = row.Valore_Txt || '';

                        // Normalizza il nome della sostanza rimuovendo spazi multipli
                        const sostanzaNomeNormalizzato = sostanzaNome.replace(/\s+/g, ' ').trim();
                        
                        // Controlla se la sostanza è già presente nei dati dei sali
                        let sostanzaGiaPresente = false;
                        for (const chiave in datiCampione) {
                            const chiaveNormalizzata = chiave.replace(/\s+/g, ' ').trim();
                            // Verifica anche se corrisponde a un nome_originale
                            if (chiaveNormalizzata === sostanzaNomeNormalizzato || 
                                (datiCampione[chiave].nome_originale && 
                                datiCampione[chiave].nome_originale.replace(/\s+/g, ' ').trim() === sostanzaNomeNormalizzato)) {
                                sostanzaGiaPresente = true;
                                break;
                            }
                        }
                        
                        // Salta sostanze già presenti nei metalli calcolati
                        if (sostanzaGiaPresente) return;
                        
                        // Salta valori sotto il limite di rilevabilità (che iniziano con "<")
                        if (valoreStr.trim().startsWith('<')) return;
                        
                        try {
                            // Converti il valore in numero
                            const valore = parseFloat(valoreStr);
                            if (!isNaN(valore) && valore > 0) {
                                datiCampione[sostanzaNome] = {
                                    concentrazione_ppm: valore,
                                    concentrazione_percentuale: valore / 10000
                                };
                                console.log(`Aggiunta sostanza non-metallo: ${sostanzaNome} (${valore} ppm)`);
                            }
                        } catch (e) {
                            console.warn(`Impossibile convertire valore per ${sostanzaNome}: ${valoreStr}`);
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Errore nell'elaborazione dei dati Excel:", e);
        }
        
        // Salva i dati completi per il classificatore
        try {
            // Genera timestamp per il nome del file
            const timestamp = generateItalianTimestamp();
            const fileName = `dati_campione_${timestamp}.json`;
            
            // Verifica quanti file ci sono già nella cartella
            const fileList = await window.electronAPI.getCampioneFiles();
            
            if (fileList.length >= 8) {
                showNotification('Limite massimo di 8 file raggiunto. Elimina alcuni file dalla sezione Classificazione prima di continuare.', 'warning');
                return {};
            }
            
            // Salva il file con il nuovo nome
            const saveResult = await window.electronAPI.saveCampioneData(datiCampione, fileName);
            
            if (saveResult.success) {
                console.log(`✅ File ${fileName} salvato con successo in: ${saveResult.filePath}`);
                showNotification(`File ${fileName} salvato con successo`);
                
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
        }
                
        // Mostra notifica
        showNotification('Sali assegnati e concentrazioni calcolate con successo!');
        
        // Aggiungi attività
        addActivity('Sali assegnati', 'Associazione sali-metalli completata', 'fas fa-flask');
        
        // Vai alla sezione di classificazione (opzionale)
        showSection('classificazione');

        // Chiamata per aggiornare l'interfaccia di classificazione
        if (typeof updateClassificationUI === 'function') {
            updateClassificationUI();
        }
        
        return risultatiCalcolati;
    } catch (error) {
        console.error('Errore nell\'assegnazione dei sali:', error);
        showNotification('Errore nell\'assegnazione dei sali: ' + error.message, 'error');
        return {};
    }
}

// Variabile globale per tenere traccia dell'ultimo hash dei dati caricati
let lastExcelDataHash = null;

function updateSaliMetalliWithExcelData() {
    // Recupera i dati dalla sessionStorage utilizzando la chiave corretta
    const raccoltaDataStr = sessionStorage.getItem('raccoltaExcelData');
    const excelData = raccoltaDataStr ? JSON.parse(raccoltaDataStr) : [];

    // Verifica se stiamo ripristinando (array vuoto)
    if (!excelData || excelData.length === 0) {
        console.log('Ripristino della sezione sali-metalli a vuoto');
        
        // Resetta il dizionario dei metalli
        for (const metallo of Object.values(metalliDizionario)) {
            metallo.concentrazione = null;
        }
        
        // Aggiorna l'interfaccia con il messaggio di default
        const container = document.getElementById('metalAssociationContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Carica un file dalla sezione Raccolta per visualizzare le associazioni</p>
                </div>
            `;
        }
        
        // Reset dell'hash quando svuotiamo i dati
        lastExcelDataHash = null;
        return;
    }
    
    // Calcola un hash semplice dei dati per verificare se sono cambiati
    const currentDataHash = JSON.stringify(excelData).length;
    
    // Controlla se i dati sono gli stessi dell'ultimo aggiornamento
    if (lastExcelDataHash === currentDataHash) {
        console.log('I dati sono invariati, nessun aggiornamento necessario');
        return;
    }
    
    // Aggiorna le concentrazioni dei metalli
    updateMetalliConcentrations(excelData);
    
    // Aggiorna l'interfaccia utente
    renderSaliMetalliUI();
    
    // Mostra notifica solo se i dati sono cambiati
    showNotification('Dati sali-metalli aggiornati con il nuovo file');
    
    // Memorizza l'hash dei dati correnti per il confronto successivo
    lastExcelDataHash = currentDataHash;
}


// Inizializza la sezione sali-metalli
async function initSaliMetalli() {
    try {
        // Prima controlla se abbiamo metalli_campione in sessionStorage (prioritario)
        const metalliCampioneStr = sessionStorage.getItem('metalliCampione');
        
        console.log("Controllando metalli_campione in sessionStorage:", metalliCampioneStr ? "trovato" : "non trovato");
        
        if (metalliCampioneStr) {
            console.log("Metalli campione trovati in sessionStorage:", metalliCampioneStr);
            const metalliCampione = JSON.parse(metalliCampioneStr);
            
            // Carica prima i metalli dal database
            await loadMetalli();
            await loadSaliMetalli();
            
            console.log("Metalli dal database:", metalliDizionario);
            console.log("Metalli dal campione:", metalliCampione);
            
            // Assegna le concentrazioni dai metalli_campione
            let metalliAssegnati = 0;
            
            for (const [metalloNome, metalloDati] of Object.entries(metalliCampione)) {
                console.log(`Processando metallo dal campione: ${metalloNome}`);
                
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
                    
                    // Log per debug
                    console.log(`Confronto: "${nomeNormalizzato}" con "${metalloDbNormalizzato}"`);
                    
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
            
            console.log(`Assegnate concentrazioni a ${metalliAssegnati} metalli`);
            
            // Aggiorna l'interfaccia
            renderSaliMetalliUI();
            return;
        }
        // Altrimenti, controlla se abbiamo dati Excel
        const excelDataStr = sessionStorage.getItem('raccoltaExcelData');
        if (excelDataStr) {
            console.log("Dati Excel trovati in sessionStorage, ma nessun metalli_campione");
            
            // Carica i metalli dal database
            await loadMetalli();
            await loadSaliMetalli();
            
            // Tenta di estrarre le concentrazioni dai dati Excel
            const excelData = JSON.parse(excelDataStr);
            updateMetalliConcentrations(excelData);
            
            // Aggiorna l'interfaccia
            renderSaliMetalliUI();
        } else {
            console.log("Nessun dato disponibile per sali-metalli");
            
            // Mostra un messaggio se non ci sono dati
            const container = document.getElementById('metalAssociationContainer');
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Carica un file dalla sezione Raccolta e salva le modifiche per visualizzare i metalli.</p>
                </div>
            `;
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
        const timestamp = generateItalianTimestamp();
        const fileName = `dati_campione_${timestamp}.json`;
        
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







// Esportazioni
window.salvaFileConTimestamp = salvaFileConTimestamp;