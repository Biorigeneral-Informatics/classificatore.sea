// ==== Inizializzazione ====
document.addEventListener('DOMContentLoaded', async function() {
    // Inizializza interfaccia
    initSidebar();
    initThemeToggle();
    updateAppVersion();
    
    // Carica dati salvati
    await loadSavedEchaData();
    
    // Inizializza event listeners
    initEchaEventListeners();
});

// ==== Funzioni di inizializzazione ====

// Inizializza la sidebar
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarExpand = document.getElementById('sidebarExpand');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        // Mostra/nascondi il bottone di espansione
        sidebarExpand.style.display = sidebar.classList.contains('collapsed') ? 'flex' : 'none';
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    if (sidebarExpand) {
        sidebarExpand.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }
}

// Inizializza il toggle del tema
function initThemeToggle() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }

    // Theme toggle click handler
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update button icon
        themeToggleBtn.innerHTML = newTheme === 'dark' 
            ? '<i class="fas fa-moon"></i>' 
            : '<i class="fas fa-sun"></i>';
    });
}

// Aggiorna la versione dell'applicazione
function updateAppVersion() {
    const appVersionElements = document.querySelectorAll('#appVersion');
    const version = window.appInfo?.appVersion || '1.0.0';
    
    appVersionElements.forEach(el => {
        el.textContent = `WasteGuard ${version}`;
    });
}

// Carica dati ECHA salvati
async function loadSavedEchaData() {
    try {
        // Controlla se ci sono informazioni sul file ECHA
        const echaFileInfoStr = localStorage.getItem('echaFileInfo');
        if (echaFileInfoStr) {
            const echaFileInfo = JSON.parse(echaFileInfoStr);
            
            // Verifica che il file e il database esistano
            const excelPath = echaFileInfo.path;
            const dbPath = echaFileInfo.dbPath;
            
            // Verifica esistenza file
            const excelExists = await window.electronAPI.fileExists(excelPath);
            const dbExists = await window.electronAPI.fileExists(dbPath);
            
            if (excelExists && dbExists) {
                // Nascondi la zona di caricamento
                hideEchaDropZone();
                
                // Aggiorna le informazioni sul file
                updateEchaFileInfo();
                
                // Carica il database
                await loadEchaFromDatabase(dbPath);
            } else {
                // Qualcosa è stato eliminato, reset delle info
                localStorage.removeItem('echaFileInfo');
                sessionStorage.removeItem('echaFilePath');
                sessionStorage.removeItem('echaDbPath');
                
                // Mostra la zona di upload
                showEchaDropZone();
            }
        } else {
            // Nessun file caricato in precedenza
            showEchaDropZone();
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati ECHA:', error);
        showNotification('Errore nel caricamento dei dati ECHA', 'error');
        // Assicurati che la zona di caricamento sia visibile
        showEchaDropZone();
    }
}

// Inizializza gli event listeners
function initEchaEventListeners() {
    // Event listener per drop zone
    const dropZone = document.getElementById('echaDropZone');
    if (dropZone) {
        dropZone.addEventListener('click', () => selectEchaFile());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.backgroundColor = '#e8f5e9';
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.backgroundColor = '';
        });
        
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                await importEchaExcel(file.path);
            }
        });
    }
    
    // Event listener per search
    const searchInput = document.getElementById('echaSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchEchaData(this.value);
        });
    }
    
    // Event listener per clear button
    const clearButton = document.getElementById('clearEchaDataBtn');
    if (clearButton) {
        clearButton.addEventListener('click', clearEchaData);
    }
}

// ==== Funzioni per gestione file ECHA ====

// Seleziona file ECHA
async function selectEchaFile() {
    try {
        const filePath = await window.electronAPI.selectFile({
            title: 'Seleziona file Excel ECHA',
            filters: [
                { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
            ],
            properties: ['openFile']
        });
        
        if (filePath) {
            await importEchaExcel(filePath);
        }
    } catch (error) {
        console.error('Errore nella selezione del file:', error);
        showNotification('Errore nella selezione del file', 'error');
    }
}

// Importa file Excel ECHA
async function importEchaExcel(filePath) {
    try {
        console.log("Avvio importazione file ECHA:", filePath);
        const fileName = filePath.split(/[\\/]/).pop();
        
        // Mostra notifica di caricamento
        showNotification(`Caricamento file ECHA "${fileName}" in corso...`, 'info');
        
        // Crea percorsi per i file di destinazione nella cartella echa/data
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const excelFileName = `echa_${timestamp}_${fileName}`;
        const dbFileName = excelFileName.replace(/\.(xlsx|xls)$/i, '.db');
        
        // Percorsi completi
        const scriptDir = window.electronAPI.getAppPath();
        const dataDirRelative = './data';
        
        // Crea cartella di destinazione se non esiste
        await window.electronAPI.ensureDir(dataDirRelative);
        
        // Copia il file Excel nella cartella echa/data
        const saveResult = await window.electronAPI.copyFile(
            filePath, 
            `${dataDirRelative}/${excelFileName}`
        );
        
        if (!saveResult.success) {
            throw new Error(saveResult.message || 'Errore nella copia del file ECHA');
        }
        
        // Percorso del file Excel salvato
        const savedExcelPath = saveResult.destPath;
        // Percorso per il database SQLite (usa il percorso restituito)
        const dbPath = savedExcelPath.replace(/\.(xlsx|xls)$/i, '.db');
        
        // Mostra notifica di conversione
        showNotification(`Conversione di "${fileName}" in database SQLite...`, 'info');
        
        // Chiama lo script Python per convertire il file Excel in SQLite
        const conversionResult = await window.electronAPI.runPythonScript(
            'echa/convert_echa.py', 
            [savedExcelPath, dbPath]
        );
        
        if (!conversionResult.success) {
            throw new Error(conversionResult.message || 'Errore nella conversione in database SQLite');
        }
        
        console.log('Risultato conversione in SQLite:', conversionResult);
        
        // Usa il percorso del database restituito dallo script Python
        // Il percorso è ora corretto e non viene manipolato ulteriormente
        const actualDbPath = conversionResult.database_path || dbPath;
        
        // Salva info sul file e database nei sessionStorage/localStorage
        sessionStorage.setItem('echaFilePath', savedExcelPath);
        sessionStorage.setItem('echaDbPath', actualDbPath);
        
        const fileInfo = {
            name: fileName,
            path: savedExcelPath,
            date: new Date().toISOString(),
            dbPath: actualDbPath,  // Usa il percorso aggiornato
            dbInfo: conversionResult
        };

        console.log(`Percorso database salvato: ${actualDbPath}`);
        
        localStorage.setItem('echaFileInfo', JSON.stringify(fileInfo));
        
        // Nascondi la zona di caricamento
        hideEchaDropZone();
        
        // Aggiorna le informazioni del file nell'UI
        updateEchaFileInfo();
        
        // Mostra notifica di successo
        showNotification(`File ECHA "${fileName}" caricato e convertito in database con successo!`);
        
        // Aggiungi attività
        addActivity('File ECHA caricato', `${fileName} convertito in database SQLite`, 'fas fa-database');
        
        // Carica ed elabora il file per la visualizzazione
        await loadEchaFromDatabase(actualDbPath);  // Usa il percorso aggiornato
        
        return true;
    } catch (error) {
        console.error('Errore nel caricamento del file ECHA:', error);
        showNotification('Errore nel caricamento del file ECHA: ' + error.message, 'error');
        return null;
    }
}

// Mostra la zona di caricamento
function showEchaDropZone() {
    const dropZone = document.getElementById('echaDropZone');
    const searchContainer = document.getElementById('echaSearchContainer');
    const resultsContainer = document.getElementById('echaResultsContainer');
    const tableSelectorContainer = document.getElementById('echaTableSelectorContainer');
    
    if (dropZone) dropZone.style.display = 'block';
    if (searchContainer) searchContainer.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (tableSelectorContainer) tableSelectorContainer.style.display = 'none';
}

// Nascondi la zona di caricamento
function hideEchaDropZone() {
    const dropZone = document.getElementById('echaDropZone');
    const searchContainer = document.getElementById('echaSearchContainer');
    const resultsContainer = document.getElementById('echaResultsContainer');
    
    if (dropZone) dropZone.style.display = 'none';
    if (searchContainer) searchContainer.style.display = 'flex';
    if (resultsContainer) resultsContainer.style.display = 'flex';
}

// Elimina dati ECHA
async function clearEchaData() {
    try {
        // Chiedi conferma all'utente
        const confirmation = confirm("Sei sicuro di voler eliminare il database ECHA? Questa azione non può essere annullata.");
        if (!confirmation) return;
        
        // Ottieni i percorsi dei file
        const echaFileInfoStr = localStorage.getItem('echaFileInfo');
        if (!echaFileInfoStr) {
            showNotification('Nessun dato ECHA da eliminare', 'warning');
            return;
        }
        
        const echaFileInfo = JSON.parse(echaFileInfoStr);
        const excelPath = echaFileInfo.path;
        const dbPath = echaFileInfo.dbPath;
        
        // Elimina il file Excel se esiste
        if (excelPath) {
            try {
                const excelDeleted = await window.electronAPI.deleteFile(excelPath);
                console.log(`File Excel eliminato: ${excelDeleted.success}`);
            } catch (fileError) {
                console.warn(`Impossibile eliminare il file Excel: ${fileError.message}`);
            }
        }
        
        // Elimina il database SQLite se esiste
        if (dbPath) {
            try {
                const dbDeleted = await window.electronAPI.deleteFile(dbPath);
                console.log(`Database eliminato: ${dbDeleted.success}`);
            } catch (fileError) {
                console.warn(`Impossibile eliminare il database: ${fileError.message}`);
            }
        }
        
        // Rimuovi i riferimenti ai file
        localStorage.removeItem('echaFileInfo');
        sessionStorage.removeItem('echaFilePath');
        sessionStorage.removeItem('echaDbPath');
        
        // Reset UI
        const resultsContainer = document.getElementById('echaSearchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>Nessun risultato disponibile.</p>
            </div>
            `;
        }
        
        // Rimuovi il selettore di tabelle se presente
        const tableSelector = document.getElementById('echaTableSelector');
        if (tableSelector) {
            tableSelector.remove();
        }
        
        // Nascondi le informazioni sul file
        const fileInfoElement = document.getElementById('echaFileInfo');
        if (fileInfoElement) {
            fileInfoElement.style.display = 'none';
        }
        
        // Aggiorna il contatore
        const resultsCount = document.getElementById('echaResultsCount');
        if (resultsCount) {
            resultsCount.textContent = '0 record';
        }
        
        // Mostra nuovamente la zona di caricamento
        showEchaDropZone();
        
        showNotification('Dati ECHA eliminati con successo');
    } catch (error) {
        console.error('Errore nell\'eliminazione dei dati ECHA:', error);
        showNotification('Errore nell\'eliminazione dei dati ECHA', 'error');
    }
}

// Aggiorna le informazioni sul file ECHA
function updateEchaFileInfo() {
    const fileInfoStr = localStorage.getItem('echaFileInfo');
    if (!fileInfoStr) return;
    
    try {
        const fileInfo = JSON.parse(fileInfoStr);
        const fileInfoElement = document.getElementById('echaFileInfo');
        const fileNameElement = document.getElementById('echaFileName');
        const fileDateElement = document.getElementById('echaFileDate');
        
        if (fileInfoElement && fileNameElement && fileDateElement) {
            fileInfoElement.style.display = 'block';
            
            // Aggiorna le informazioni base del file
            fileNameElement.textContent = `File: ${fileInfo.name}`;
            fileDateElement.textContent = `Caricato il ${new Date(fileInfo.date).toLocaleString('it-IT')}`;
            
            // Se abbiamo informazioni sul database, aggiungiamole
            if (fileInfo.dbInfo && fileInfo.dbInfo.tables) {
                // Crea un elemento per mostrare le tabelle disponibili nel database
                const infoDetails = document.createElement('div');
                infoDetails.className = 'file-info-details';
                infoDetails.style.marginTop = '0.5rem';
                infoDetails.style.fontSize = '0.85rem';
                infoDetails.style.color = 'var(--text-muted)';
                
                // Calcola il numero totale di tabelle e righe
                const tableCount = Object.keys(fileInfo.dbInfo.tables).length;
                const totalRows = fileInfo.dbInfo.total_rows || 
                    Object.values(fileInfo.dbInfo.tables).reduce((sum, table) => sum + table.rows, 0);
                
                infoDetails.innerHTML = `
                    <div>Database SQLite: ${tableCount} tabelle, ${totalRows.toLocaleString()} record totali</div>
                `;
                
                // Rimuovi eventuali dettagli esistenti
                const existingDetails = fileInfoElement.querySelector('.file-info-details');
                if (existingDetails) {
                    existingDetails.remove();
                }
                
                // Aggiungi i dettagli
                fileInfoElement.appendChild(infoDetails);
            }
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento delle info del file ECHA:', error);
    }
}

// ==== Funzioni per la visualizzazione del database ====

// Variabili per la paginazione
let currentEchaPage = 1;
let echaPageSize = 50;
let totalEchaRows = 0;

// Carica e visualizza i dati ECHA dal database SQLite
async function loadEchaFromDatabase(dbPath) {
    try {
        console.log(`Caricamento dati ECHA dal database: ${dbPath}`);
        
        // Converti il percorso assoluto in un percorso relativo alla cartella app/
        // Estrai solo la parte "echa/data/db_echa.db" dal percorso completo
        // Questa è la soluzione più semplice che evita problemi di risoluzione dei percorsi
        
        // Estrai il nome del file dal percorso
        const dbFilename = dbPath.split(/[\\/]/).pop();
        
        // Crea un percorso relativo semplice
        const relativePath = `echa/data/${dbFilename}`;
        
        console.log(`Percorso relativo database utilizzato: ${relativePath}`);
        
        // Recupera le tabelle disponibili nel database
        const echaDbQueryResult = await window.electronAPI.querySQLite(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", 
            [],
            relativePath  // Usa il percorso relativo semplice
        );
        
        if (!echaDbQueryResult.success) {
            throw new Error(`Errore nel recupero delle tabelle: ${echaDbQueryResult.message}`);
        }
        
        // Lista delle tabelle
        const echaDbTables = echaDbQueryResult.data.map(row => row.name);
        console.log(`Tabelle trovate nel database: ${echaDbTables.join(', ')}`);
        
        if (echaDbTables.length === 0) {
            throw new Error('Nessuna tabella trovata nel database');
        }
        
        // Seleziona la prima tabella per default
        const defaultTable = echaDbTables[0];
        
        // Ottieni un'anteprima dei dati (prime 50 righe)
        const echaDataResult = await window.electronAPI.querySQLite(
            `SELECT * FROM "${defaultTable}" LIMIT ${echaPageSize}`, 
            [],
            relativePath  // Usa il percorso relativo semplice
        );
        
        if (!echaDataResult.success) {
            throw new Error(`Errore nel recupero dei dati: ${echaDataResult.message}`);
        }
        
        // Ottieni il conteggio totale delle righe
        const echaCountResult = await window.electronAPI.querySQLite(
            `SELECT COUNT(*) AS total FROM "${defaultTable}"`, 
            [],
            relativePath  // Usa il percorso relativo semplice
        );
        
        totalEchaRows = echaCountResult.success ? echaCountResult.data[0].total : echaDataResult.data.length;
        
        // Aggiorna l'interfaccia
        updateEchaTableSelector(echaDbTables, defaultTable);
        renderEchaTable(echaDataResult.data);
        
        // Aggiorna la paginazione
        updateEchaPagination(defaultTable, '');
        
        // Mostra i container necessari
        const tableSelectorContainer = document.getElementById('echaTableSelectorContainer');
        const resultsContainer = document.getElementById('echaResultsContainer');
        
        if (tableSelectorContainer) tableSelectorContainer.style.display = 'block';
        if (resultsContainer) resultsContainer.style.display = 'flex';
        
        // Mostra il numero di record
        document.getElementById('echaResultsCount').textContent = `${totalEchaRows} record totali (${Math.min(echaPageSize, echaDataResult.data.length)} visualizzati)`;
        
        // Salva il percorso relativo in sessionStorage per future operazioni
        sessionStorage.setItem('echaDbRelativePath', relativePath);
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati dal database:', error);
        showNotification('Errore nel caricamento dei dati: ' + error.message, 'error');
        
        // Visualizza un messaggio di errore nella tabella
        const resultsContainer = document.getElementById('echaSearchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Errore nel caricamento dei dati: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Aggiorna il selettore delle tabelle ECHA
function updateEchaTableSelector(tables, selectedTable) {
    // Container per il selettore
    const selectorContainer = document.getElementById('echaTableSelectorContainer');
    
    if (!selectorContainer) return;
    
    // Crea il selettore come dropdown
    selectorContainer.innerHTML = `
        <div class="echa-table-selector">
            <label for="echaTableSelect" style="margin-right: 0.5rem; font-weight: 500;">Tabella:</label>
            <select id="echaTableSelect" class="form-control" style="display: inline-block; width: auto; min-width: 200px;">
                ${tables.map(table => `<option value="${table}" ${table === selectedTable ? 'selected' : ''}>${table}</option>`).join('')}
            </select>
        </div>
    `;
    
    // Aggiungi event listener per il cambio di tabella
    document.getElementById('echaTableSelect').addEventListener('change', function() {
        const selectedTable = this.value;
        const dbPath = sessionStorage.getItem('echaDbPath');
        
        if (dbPath) {
            // Reset paginazione
            currentEchaPage = 1;
            loadEchaTableData(dbPath, selectedTable);
        }
    });
}

// Carica i dati di una specifica tabella con paginazione
async function loadEchaTableData(dbPath, tableName, searchQuery = '', page = 1) {
    try {
        console.log(`Caricamento tabella: ${tableName} dal database: ${dbPath} (pagina ${page})`);
        
        // Usa il percorso relativo se è stato memorizzato
        const relativePath = sessionStorage.getItem('echaDbRelativePath');
        
        // Se non abbiamo un percorso relativo salvato, creiamone uno
        const pathToUse = relativePath || `echa/data/${dbPath.split(/[\\/]/).pop()}`;
        
        console.log(`Percorso relativo database utilizzato: ${pathToUse}`);
        
        // Memorizza la pagina corrente
        currentEchaPage = page;
        
        // Calcola l'offset per la paginazione
        const offset = (page - 1) * echaPageSize;
        
        // Base della query SQL
        let query = `SELECT * FROM "${tableName}"`;
        let params = [];
        
        // Se c'è una query di ricerca, aggiungi la condizione WHERE
        if (searchQuery && searchQuery.trim() !== '') {
            // Ottieni prima i nomi delle colonne
            const columnsResult = await window.electronAPI.querySQLite(
                `PRAGMA table_info("${tableName}")`,
                [],
                pathToUse
            );
            
            if (!columnsResult.success) {
                throw new Error(`Errore nel recupero delle colonne: ${columnsResult.message}`);
            }
            
            const columns = columnsResult.data.map(col => col.name);
            
            // Crea condizioni di ricerca per ogni colonna
            const searchConditions = columns.map(col => `${col} LIKE ?`).join(' OR ');
            const searchValue = `%${searchQuery}%`;
            
            // Aggiunge i parametri per ogni colonna
            params = Array(columns.length).fill(searchValue);
            
            // Aggiunge la condizione WHERE alla query
            query += ` WHERE ${searchConditions}`;
        }
        
        // Aggiungi LIMIT e OFFSET per la paginazione
        query += ` LIMIT ${echaPageSize} OFFSET ${offset}`;
        
        // Esegui la query
        const dataResult = await window.electronAPI.querySQLite(query, params, pathToUse);
        
        if (!dataResult.success) {
            throw new Error(`Errore nel recupero dei dati: ${dataResult.message}`);
        }
        
        // Ottieni il conteggio totale delle righe che corrispondono alla ricerca
        let countQuery = `SELECT COUNT(*) AS total FROM "${tableName}"`;
        let countParams = [];
        
        if (searchQuery && searchQuery.trim() !== '') {
            // Ottieni prima i nomi delle colonne se non li abbiamo già
            let columns;
            if (!params.length) {
                const columnsResult = await window.electronAPI.querySQLite(
                    `PRAGMA table_info("${tableName}")`,
                    [],
                    pathToUse
                );
                
                if (!columnsResult.success) {
                    throw new Error(`Errore nel recupero delle colonne: ${columnsResult.message}`);
                }
                
                columns = columnsResult.data.map(col => col.name);
            }
            
            // Crea condizioni di ricerca per ogni colonna
            const searchConditions = columns.map(col => `${col} LIKE ?`).join(' OR ');
            const searchValue = `%${searchQuery}%`;
            
            // Aggiunge i parametri per ogni colonna
            countParams = Array(columns.length).fill(searchValue);
            
            // Aggiunge la condizione WHERE alla query
            countQuery += ` WHERE ${searchConditions}`;
        }
        
        const countResult = await window.electronAPI.querySQLite(countQuery, countParams, pathToUse);
        totalEchaRows = countResult.success ? countResult.data[0].total : dataResult.data.length;
        
        // Aggiorna l'interfaccia
        renderEchaTable(dataResult.data);
        
        // Aggiorna la paginazione
        updateEchaPagination(tableName, searchQuery);
        
        // Mostra il numero di record trovati
        if (searchQuery && searchQuery.trim() !== '') {
            document.getElementById('echaResultsCount').textContent = 
                `${totalEchaRows} record trovati (pagina ${page}, ${Math.min(echaPageSize, dataResult.data.length)} visualizzati)`;
        } else {
            document.getElementById('echaResultsCount').textContent = 
                `${totalEchaRows} record totali (pagina ${page}, ${Math.min(echaPageSize, dataResult.data.length)} visualizzati)`;
        }
        
    } catch (error) {
        console.error('Errore nel caricamento della tabella:', error);
        showNotification('Errore nel caricamento della tabella: ' + error.message, 'error');
        
        // Visualizza un messaggio di errore nella tabella
        const resultsContainer = document.getElementById('echaSearchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Errore nel caricamento della tabella: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Funzione di ricerca per il database ECHA
function searchEchaData(query) {
    const dbPath = sessionStorage.getItem('echaDbPath');
    if (!dbPath) {
        showNotification('Nessun database ECHA caricato', 'warning');
        return;
    }
    
    // Ottieni la tabella attualmente selezionata
    const tableSelect = document.getElementById('echaTableSelect');
    if (!tableSelect) {
        showNotification('Errore: selettore tabella non trovato', 'error');
        return;
    }
    
    const selectedTable = tableSelect.value;
    
    // Reset paginazione e carica i dati
    currentEchaPage = 1;
    loadEchaTableData(dbPath, selectedTable, query);
}

// Renderizza la tabella ECHA
function renderEchaTable(data) {
    const resultsContainer = document.getElementById('echaSearchResults');
    
    if (!Array.isArray(data) || data.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>Nessun risultato disponibile.</p>
            </div>
        `;
        return;
    }
    
    try {
        // Ottieni le intestazioni dalla prima riga
        const headers = Object.keys(data[0]);
        
        // Crea la tabella
        let tableHtml = '<table class="echa-table">';
        
        // Aggiungi l'header della tabella
        tableHtml += '<thead><tr>';
        headers.forEach(header => {
            // Formatta il nome dell'header per una migliore visualizzazione
            const displayHeader = header.replace(/_/g, ' ');
            tableHtml += `<th title="${header}">${displayHeader}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Aggiungi il corpo della tabella
        tableHtml += '<tbody>';
        
        // Aggiungi le righe di dati
        data.forEach(row => {
            tableHtml += '<tr>';
            
            headers.forEach(header => {
                const value = row[header] !== null && row[header] !== undefined ? row[header] : '';
                tableHtml += `<td title="${value}">${value}</td>`;
            });
            
            tableHtml += '</tr>';
        });
        
        tableHtml += '</tbody></table>';
        
        // Aggiorna il container
        resultsContainer.innerHTML = tableHtml;
        
        // Aggiungi event listeners per la visualizzazione migliorata delle celle
        document.querySelectorAll('.echa-table td').forEach(cell => {
            cell.addEventListener('click', function() {
                // Evidenzia la cella quando viene cliccata
                const selectedCells = document.querySelectorAll('.echa-table td.selected');
                selectedCells.forEach(selected => selected.classList.remove('selected'));
                this.classList.add('selected');
                
                // Se il contenuto è molto lungo, mostra un popup
                if (this.textContent.length > 50) {
                    showCellPopup(this, this.textContent);
                }
            });
        });
        
    } catch (error) {
        console.error('Errore nella renderizzazione della tabella ECHA:', error);
        resultsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Errore nella visualizzazione dei dati: ${error.message}</p>
            </div>
        `;
    }
}

// Aggiorna la paginazione
function updateEchaPagination(tableName, searchQuery) {
    // Calcola il numero totale di pagine
    const totalPages = Math.ceil(totalEchaRows / echaPageSize);
    
    // Trova o crea il container per la paginazione
    let paginationContainer = document.getElementById('echaPaginationContainer');
    
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'echaPaginationContainer';
        paginationContainer.className = 'echa-pagination';
        
        // Cerca il container dei risultati per aggiungere la paginazione
        const resultsContainer = document.getElementById('echaResultsContainer');
        if (resultsContainer) {
            resultsContainer.appendChild(paginationContainer);
        }
    }
    
    // Se c'è solo una pagina, nascondi la paginazione
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    // Mostra la paginazione
    paginationContainer.style.display = 'flex';
    
    // Determinare quali pulsanti di pagina mostrare
    let paginationButtons = '';
    
    // Pulsante precedente
    paginationButtons += `
        <button ${currentEchaPage === 1 ? 'disabled' : ''} class="prev-page">
            <i class="fas fa-chevron-left"></i> Precedente
        </button>
    `;
    
    // Mostra al massimo 5 pulsanti di pagina
    const maxButtons = 5;
    let startPage = Math.max(1, currentEchaPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    // Aggiusta startPage se siamo vicini alla fine
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // Aggiungi pulsanti numerici
    for (let i = startPage; i <= endPage; i++) {
        paginationButtons += `
            <button class="page-number ${i === currentEchaPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // Pulsante successivo
    paginationButtons += `
        <button ${currentEchaPage === totalPages ? 'disabled' : ''} class="next-page">
            Successivo <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    // Aggiorna il container
    paginationContainer.innerHTML = paginationButtons;
    
    // Usa il percorso relativo salvato in sessionStorage invece del percorso completo
    const dbRelativePath = sessionStorage.getItem('echaDbRelativePath');
    
    // Se non abbiamo un percorso relativo, usiamo quello originale (ma questo non dovrebbe succedere)
    const dbPath = dbRelativePath || sessionStorage.getItem('echaDbPath');
    
    // Gestione pulsante pagina precedente
    paginationContainer.querySelector('.prev-page').addEventListener('click', function() {
        if (currentEchaPage > 1) {
            loadEchaTableData(dbPath, tableName, searchQuery, currentEchaPage - 1);
        }
    });
    
    // Gestione pulsante pagina successiva
    paginationContainer.querySelector('.next-page').addEventListener('click', function() {
        if (currentEchaPage < totalPages) {
            loadEchaTableData(dbPath, tableName, searchQuery, currentEchaPage + 1);
        }
    });
    
    // Gestione pulsanti numerici
    paginationContainer.querySelectorAll('.page-number').forEach(button => {
        button.addEventListener('click', function() {
            const page = parseInt(this.getAttribute('data-page'));
            loadEchaTableData(dbPath, tableName, searchQuery, page);
        });
    });
}

// Mostra un popup per visualizzare contenuti lunghi
function showCellPopup(cell, content) {
    // Rimuovi eventuali popup esistenti
    const existingPopup = document.getElementById('cell-content-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Crea elemento popup
    const popup = document.createElement('div');
    popup.id = 'cell-content-popup';
    popup.className = 'cell-popup';
    popup.innerHTML = `
        <div class="cell-popup-header">
            <span>Contenuto cella</span>
            <button class="popup-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="cell-popup-content">${content}</div>
    `;
    
    // Stili inline per il popup
    popup.style.position = 'fixed';
    popup.style.zIndex = '1000';
    popup.style.background = 'var(--card-bg)';
    popup.style.border = '1px solid var(--border-color)';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = 'var(--card-shadow)';
    popup.style.maxWidth = '80%';
    popup.style.maxHeight = '80%';
    popup.style.overflow = 'auto';
    popup.style.padding = '0';
    
    // Stili per l'header del popup
    const header = popup.querySelector('.cell-popup-header');
    header.style.padding = '0.75rem 1rem';
    header.style.borderBottom = '1px solid var(--border-color)';
    header.style.fontWeight = 'bold';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    // Stili per il pulsante di chiusura
    const closeBtn = popup.querySelector('.popup-close-btn');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = 'var(--text-color)';
    closeBtn.style.fontSize = '1rem';
    
    // Stili per il contenuto
    const contentDiv = popup.querySelector('.cell-popup-content');
    contentDiv.style.padding = '1rem';
    contentDiv.style.overflowWrap = 'break-word';
    contentDiv.style.wordBreak = 'break-all';
    
    // Aggiungi il popup al documento
    document.body.appendChild(popup);
    
    // Posiziona il popup vicino alla cella
    const cellRect = cell.getBoundingClientRect();
    const popupWidth = Math.min(600, window.innerWidth * 0.8);
    const popupHeight = Math.min(400, window.innerHeight * 0.8);
    
    let left = cellRect.left + cellRect.width / 2 - popupWidth / 2;
    let top = cellRect.top + cellRect.height / 2 - popupHeight / 2;
    
    // Assicurati che il popup rimanga all'interno della finestra
    left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - popupHeight - 10));
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.width = `${popupWidth}px`;
    popup.style.height = `${popupHeight}px`;
    
    // Aggiungi event listener per chiudere il popup
    closeBtn.addEventListener('click', () => {
        popup.remove();
    });
    
    // Chiudi il popup anche cliccando fuori da esso
    document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target) && e.target !== cell) {
            popup.remove();
            document.removeEventListener('click', closePopup);
        }
    });
    
    // Aggiungi classe CSS per animazione di apparizione
    setTimeout(() => {
        popup.classList.add('visible');
    }, 10);
}

// ==== Funzioni di utilità ====

// Mostra notifica
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notification.className = 'notification';
    notification.classList.add(`notification-${type}`);
    
    notificationText.textContent = message;
    notification.style.display = 'block';
    
    // Auto-hide dopo 3 secondi
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Aggiunge un'attività alla lista (utilizza il localStorage)
function addActivity(title, description, icon) {
    const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    
    activities.unshift({
        title,
        description,
        icon,
        timestamp: new Date().toISOString()
    });
    
    // Mantiene solo le 20 attività più recenti
    if (activities.length > 20) {
        activities.pop();
    }
    
    localStorage.setItem('recentActivities', JSON.stringify(activities));
}