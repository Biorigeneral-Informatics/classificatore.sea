//INIZIALIZZAZIONE DASHBOARD
//==================================================================================================

document.addEventListener('DOMContentLoaded', async function() {
    // Inizializza interfaccia
    initNavigation();
    initSidebar();
    initThemeToggle();
    updateAppVersion();
    
    // Carica dati salvati
    await loadSavedData();
    
    // Inizializza listeners degli eventi
    initEventListeners();
    initElectronListeners();
    initTabellaRiscontro();
    
    // Inizializza sezione sali-metalli
    await initSaliMetalli();

    // Inizializza sezione classificazione
    initClassificazione();          // Questa chiama la funzione dal modulo classificazione.js
    updateClassificationUI();       // Assicura che l'UI sia aggiornata all'avvio

    // Inizializza la sezione reports
    initEventListenersReports();
    
    // Se siamo nella sezione report, carica i report
    if (window.location.hash === '#report') {
        loadReports();
    }

    // Aggiungi un listener per il cambio di tab
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'aggiornamenti') {
                // Inizializza o aggiorna la sezione di confronto quando viene selezionata
                setTimeout(initConfrontoSection, 100);
            }
        });
    });
});
//==================================================================================================
//==================================================================================================
//==================================================================================================
//==================================================================================================
//==================================================================================================
//==================================================================================================
//==================================================================================================
//==================================================================================================
//==================================================================================================
//==================================================================================================








// Funzione helper per estrarre il nome del file da un percorso
function getBasename(filePath) {
    // Gestisce sia percorsi Windows che Unix
    return filePath.split(/[\\/]/).pop();
}



// ==== Funzioni di inizializzazione ====

// Aggiorna la versione dell'applicazione
function updateAppVersion() {
    const appVersionElements = document.querySelectorAll('#appVersion, #aboutAppVersion');
    const version = window.appInfo?.appVersion || '1.0.0';
    
    appVersionElements.forEach(el => {
        if (el.id === 'aboutAppVersion') {
            el.textContent = `Versione ${version}`;
        } else {
            el.textContent = `WasteGuard ${version}`;
        }
    });
}

// Inizializza la navigazione tra le sezioni
function initNavigation() {
    // Get the current hash from URL or default to 'home'
    const currentHash = window.location.hash.slice(1) || 'home';
    showSection(currentHash);
    
    // Add click handlers to nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
            window.location.hash = sectionId;
        });
    });

    // Handle browser back/forward
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || 'home';
        showSection(hash);
    });
}

// Mostra la sezione selezionata
function showSection(sectionId) {
    // Hide all sections and remove active class from links
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    
    // Show selected section and activate corresponding link
    const selectedSection = document.getElementById(sectionId);
    const selectedLink = document.querySelector(`[data-section="${sectionId}"]`);
    
    if (selectedSection && selectedLink) {
        selectedSection.classList.add('active');
        selectedLink.classList.add('active');
    }
}

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










// EVENT LISTNERS
function initEventListeners() {
    // Home page buttons
    initTabellaRiscontro();
    document.getElementById('supportBtn').addEventListener('click', showSupportDialog);
    document.getElementById('openGuideBtn').addEventListener('click', openGuide);
    
    // Dialog buttons
    document.getElementById('closeSupportDialog').addEventListener('click', closeSupportDialog);
    document.getElementById('closeAboutDialog').addEventListener('click', closeAboutDialog);
    
    // Dialog overlay click to close
    document.getElementById('supportDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSupportDialog();
        }
    });
    
    document.getElementById('aboutDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAboutDialog();
        }
    });


    // Modifica il comportamento del bottone "Aggiorna ECHA"
    const importEchaBtn = document.getElementById('importEchaBtn');
    if (importEchaBtn) {
        importEchaBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Vai';
        importEchaBtn.addEventListener('click', () => {
            // Usa l'API per aprire direttamente la pagina ECHA
            window.electronAPI.openPage('./echa/echa.html');
        });
    }



    // EventListener per raggiungimento sezione ECHA database dal menù
    const echaLink = document.getElementById('echaLink');
    if (echaLink) {
        echaLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Apri la finestra ECHA usando shell
            window.electronAPI.openPage('./echa/echa.html');
        });
    }
    
    // File upload nella sezione Raccolta
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.addEventListener('click', () => selectFile());
        
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
                await handleFileSelection(file.path);
            }
        });

    // Aggiungi event listener per il pulsante Salva Modifiche nella sezione raccolta
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveChanges);
        console.log("Event listener aggiunto al bottone Salva Modifiche");
    } else {
        console.error("Bottone Salva Modifiche non trovato!");
    }

    // Aggiungi event listener per il pulsante Elimina File
    const deleteFileBtn = document.getElementById('deleteFileBtn');
    if (deleteFileBtn) {
        deleteFileBtn.addEventListener('click', deleteUploadedFile);
        console.log("Event listener aggiunto al bottone Elimina File");
    } else {
        console.error("Bottone Elimina File non trovato!");
    }
    
    // Aggiungi event listener per il pulsante Esporta nella sezione raccolta
    const exportToExcelBtn = document.getElementById('exportToExcelBtn');
    if (exportToExcelBtn) {
        exportToExcelBtn.addEventListener('click', exportToExcel);
    }
    }



    document.addEventListener('click', function(e) {
        // Trova il pulsante delete-btn o l'icona all'interno che ha ricevuto il click
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            // Trova la riga più vicina e ottieni l'attributo data-id
            const row = deleteBtn.closest('tr');
            if (row) {
                const id = row.getAttribute('data-id');
                // Determina il tipo di elemento da eliminare in base alla classe della tabella
                const tableName = row.closest('table').id;
                
                if (tableName === 'sostanzeTable' || deleteBtn.classList.contains('delete-sostanza')) {
                    eliminaSostanza(id);
                } else if (tableName === 'saliTable' || deleteBtn.classList.contains('delete-sale')) {
                    eliminaSale(id);
                } else if (tableName === 'frasiHTable' || deleteBtn.classList.contains('delete-frase-h')) {
                    eliminaFraseH(id);
                } else if (tableName === 'frasiEUHTable' || deleteBtn.classList.contains('delete-frase-euh')) {
                    eliminaFraseEUH(id);
                }
            }
        }
    });


    
}

// Inizializza i listener di eventi Electron
function initElectronListeners() {
    // Listener per eventi dal main process
    window.electronAPI.onMenuNewProject(() => {
        showSection('raccolta');
    });
    
    window.electronAPI.onShowAbout(() => {
        showAboutDialog();
    });
    
    window.electronAPI.onShowSupport(() => {
        showSupportDialog();
    });
}


// Carica le sostanze nel select
async function loadSostanzeSelect() {
    try {
        // Interroga il database per ottenere le sostanze di categoria "Metallo"
        const result = await window.electronAPI.querySQLite(
            'SELECT ID, Nome FROM sostanze WHERE Categoria = ?',
            ['Metallo']
        );
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel caricamento delle sostanze');
        }
        
        const select = document.getElementById('sostanzaAssociata');
        
        if (select) {
            // Mantiene l'opzione vuota
            let html = '<option value="">Seleziona una sostanza</option>';
            
            // Aggiunge le opzioni dalle sostanze disponibili
            result.data.forEach(sostanza => {
                html += `<option value="${sostanza.ID}">${sostanza.Nome}</option>`;
            });
            
            select.innerHTML = html;
        }
    } catch (error) {
        console.error('Errore nel caricamento delle sostanze per il select:', error);
        showNotification('Errore nel caricamento delle sostanze', 'error');
        
        // Fallback a una lista vuota in caso di errore
        const select = document.getElementById('sostanzaAssociata');
        if (select) {
            select.innerHTML = '<option value="">Seleziona una sostanza</option>';
        }
    }
}



















//==========================================================================================================
//==========================================================================================================
//==========================================================================================================
//==========================================================================================================
//==========================================================================================================
//==========================================================================================================
//==========================================================================================================
//==========================================================================================================





/*  FUNZIONI PER I DATI */

// Carica i dati salvati
async function loadSavedData() {
    try {
        // Carica lista report
        const reportsList = await window.electronAPI.getReportsList();
        document.getElementById('reportsCount').textContent = reportsList.length;
        
        // Carica dati Excel Raccolta se disponibili
        const raccoltaDataStr = sessionStorage.getItem('raccoltaExcelData');
        if (raccoltaDataStr) {
            try {
                const raccoltaData = JSON.parse(raccoltaDataStr);
                // Aggiorna la sezione sali-metalli con i dati
                updateSaliMetalliWithExcelData(raccoltaData);
            } catch (error) {
                console.error('Errore nel caricamento dei dati Excel salvati:', error);
            }
        }
        
        // Aggiorna la UI
        updateRecentActivities();
        updateSavedFiles();
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        showNotification('Errore nel caricamento dei dati', 'error');
    }
}

// Aggiorna la sezione attività recenti
function updateRecentActivities() {
    const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    const container = document.getElementById('activitiesContainer');
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="no-activities-message">
                <i class="fas fa-info-circle"></i>
                <p>Nessuna attività recente</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // Mostra solo le 5 attività più recenti
    const recentActivities = activities.slice(0, 5);
    
    recentActivities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-details">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
                <small>${formatTimeAgo(new Date(activity.timestamp))}</small>
            </div>
        `;
        container.appendChild(activityItem);
    });
}

// Aggiunge una nuova attività
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
    updateRecentActivities();
}

// Aggiorna la sezione file salvati
function updateSavedFiles() {
    const savedFiles = JSON.parse(localStorage.getItem('savedFiles') || '[]');
    const tbody = document.getElementById('savedFilesTable');
    
    if (savedFiles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table-message">
                    <i class="fas fa-info-circle"></i>
                    Nessun file salvato
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    savedFiles.forEach(file => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${file.name}</td>
            <td>${new Date(file.date).toLocaleString('it-IT')}</td>
            <td>${file.format.toUpperCase()}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openFile('${file.path}')">
                    <i class="fas fa-folder-open"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteFile('${file.path}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
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
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Formatta il tempo passato
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
        return `${diffDay} giorno/i fa`;
    }
    if (diffHour > 0) {
        return `${diffHour} ora/e fa`;
    }
    if (diffMin > 0) {
        return `${diffMin} minuto/i fa`;
    }
    return 'Pochi secondi fa';
}













// ==== Dialogs e UI ====

// Mostra dialog di supporto
function showSupportDialog() {
    document.getElementById('supportDialog').style.display = 'flex';
}

// Chiudi dialog di supporto
function closeSupportDialog() {
    document.getElementById('supportDialog').style.display = 'none';
}

// Mostra dialog about
function showAboutDialog() {
    document.getElementById('aboutDialog').style.display = 'flex';
}

// Chiudi dialog about
function closeAboutDialog() {
    document.getElementById('aboutDialog').style.display = 'none';
}

// Apri guida
function openGuide() {
    window.electronAPI.openExternal('https://biorigeneral.it/guida-waste-guard');
}













// ==== Gestione file ====

// Seleziona file
async function selectFile() {
    try {
        const filePath = await window.electronAPI.selectFile({
            title: 'Seleziona file Excel',
            filters: [
                { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
            ],
            properties: ['openFile']
        });
        
        if (filePath) {
            await handleFileSelection(filePath);
        }
    } catch (error) {
        console.error('Errore nella selezione del file:', error);
        showNotification('Errore nella selezione del file', 'error');
    }
}

// Valida il file excel e lo mostra, nella sezione RACCOLTA
function validateAndDisplayExcel(worksheet) {
    try {
        // Ottieni il range delle celle
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Controllo del numero di colonne
        const numColumns = range.e.c - range.s.c + 1;
        
        if (numColumns !== 2) {
            showNotification(`Errore: il file deve contenere esattamente 2 colonne con i dati. Attualmente contiene ${numColumns} colonne.`, 'error');
            
            // Nascondi la tabella Excel se già visualizzata
            document.getElementById('excelDataTable').style.display = 'none';
            
            return false; // Validazione fallita
        }

        // Estrai i dati JSON con filtro righe vuote
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',     // Imposta un valore di default per le celle vuote
            blankrows: false // Ignora le righe completamente vuote
        });
        
        // Filtra ulteriormente le righe che potrebbero avere solo spazi o valori vuoti
        const filteredData = jsonData.filter(row => {
            return Object.values(row).some(value => 
                value !== undefined && 
                value !== null && 
                value.toString().trim() !== ''
            );
        });

        // Se non ci sono righe valide dopo il filtraggio
        if (filteredData.length === 0) {
            showNotification('Il file non contiene righe valide con dati.', 'error');
            document.getElementById('excelDataTable').style.display = 'none';
            return false;
        }

        // Se la validazione passa, procedi con la visualizzazione
        let tableHtml = `
            <table class="excel-data-table">
                <thead>
                    <tr>`;

        // Aggiungi headers
        const headers = Object.keys(filteredData[0]);
        headers.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });

        tableHtml += `
                    </tr>
                </thead>
                <tbody>`;

        // Aggiungi righe
        filteredData.forEach((row, rowIndex) => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                const value = row[header] !== undefined ? row[header] : '';
                tableHtml += `<td contenteditable="true" data-row="${rowIndex}" data-col="${header}">${value}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';

        // Mostra la tabella nella sezione di raccolta
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.innerHTML = tableHtml;
            document.getElementById('excelDataTable').style.display = 'block';

            // Aggiungi event listeners per segnalare celle modificate
            document.querySelectorAll('.excel-data-table td').forEach(cell => {
                cell.addEventListener('input', function() {
                    this.classList.add('modified');
                });
            });
        }
        
        return true; // Validazione passata
    } catch (error) {
        console.error('Errore nella visualizzazione del file Excel:', error);
        showNotification('Errore nella visualizzazione del file Excel', 'error');
        
        // Nascondi la tabella Excel in caso di errore
        document.getElementById('excelDataTable').style.display = 'none';
        
        return false; // Validazione fallita a causa di errore
    }
}

//questa funzione è il ponte tra il file Excel caricato dall'utente e i dati strutturati che 
// l'applicazione può elaborare per le successive fasi di analisi e classificazione dei rifiuti.
async function handleFileSelection(filePath) {
    try {
        showNotification('Caricamento file in corso...', 'info');
        
        const fileData = await window.electronAPI.readFile(filePath);
        const fileName = filePath.split(/[\\/]/).pop();
        
        // Elabora il file Excel
        const workbook = XLSX.read(new Uint8Array(fileData), {
            type: 'array',
            cellDates: true,
            cellNF: true
        });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Valida e visualizza il file Excel
        const isValid = validateAndDisplayExcel(worksheet);
        
        // Procedi solo se la validazione è passata
        if (isValid) {
            // Estrai i dati come JSON con l'opzione per escludere le righe vuote
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                defval: '',     // Imposta un valore di default per le celle vuote
                blankrows: false // Ignora le righe completamente vuote
            });
            
            // Filtra ulteriormente le righe che potrebbero avere solo spazi o valori vuoti
            const filteredData = jsonData.filter(row => {
                // Verifica che almeno una proprietà abbia un valore non vuoto
                return Object.values(row).some(value => 
                    value !== undefined && 
                    value !== null && 
                    value.toString().trim() !== ''
                );
            });
            
            // Salva i dati filtrati in sessionStorage
            sessionStorage.setItem('raccoltaExcelData', JSON.stringify(filteredData));

            // Mostra le informazioni sul file caricato
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.innerHTML = `
                <div class="file-info-header">
                    <div>
                        <p class="text-lg font-semibold">File: ${fileName}</p>
                        <p class="text-sm text-gray-600">Caricato il ${new Date().toLocaleString('it-IT')}</p>
                        <p class="text-sm text-gray-600">Righe valide: ${filteredData.length}</p>
                    </div>
                </div>
            `;

            // Inserisci le informazioni prima della tabella
            const excelTable = document.getElementById('excelDataTable');
            if (excelTable) {
                // Rimuovi eventuali file-info precedenti
                const oldFileInfo = document.querySelector('.file-info');
                if (oldFileInfo) {
                    oldFileInfo.remove();
                }
                
                excelTable.parentNode.insertBefore(fileInfo, excelTable);
            }

            // Nascondi la zona di drop
            const dropZone = document.getElementById('dropZone');
            if (dropZone) {
                dropZone.style.display = 'none';
            }

            // Mostra notifica di successo
            showNotification(`File ${fileName} caricato con successo! (${filteredData.length} righe valide)`, 'success');
            document.getElementById('salvaInfoRaccoltaBtn').style.display = 'inline-flex';  // Attivazione bottone forms        
        }
        
    } catch (error) {
        console.error('Errore nel caricamento del file:', error);
        showNotification('Errore nel caricamento del file', 'error');
    }
}

// Funzione per salvare i dati excell presi da Raccolta in python
async function saveExcelDataToPython() {
    try {
        // Ottieni i dati dalla tabella
        const table = document.querySelector('.excel-data-table');
        if (!table) {
            showNotification('Nessuna tabella trovata', 'error');
            return false;
        }

        // Crea un array di oggetti con i dati della tabella
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const data = [];
        
        table.querySelectorAll('tbody tr').forEach(row => {
            const rowData = {};
            row.querySelectorAll('td').forEach((cell, index) => {
                rowData[headers[index]] = cell.textContent.trim();
            });
            data.push(rowData);
        });

        // Invia i dati a Python attraverso l'API Electron
        const result = await window.electronAPI.saveExcelToPython(data);
        
        if (result.success) {
            showNotification('Dati trasferiti con successo a Python');
            return true;
        } else {
            throw new Error(result.message || 'Errore nel trasferimento dei dati');
        }
    } catch (error) {
        console.error('Errore nel salvataggio dei dati in Python:', error);
        showNotification('Errore nel trasferimento dei dati a Python', 'error');
        return false;
    }
}

// In dashboard.js - Funzione saveChanges migliorata per salvare i dati di raccolta
async function saveChanges() {
    console.log("Funzione saveChanges avviata per dati RACCOLTA");
    
    // Notifica l'utente che il processo di salvataggio è iniziato
    showNotification('Salvataggio delle modifiche in corso...', 'info');
    
    try {
        const table = document.querySelector('.excel-data-table');
        if (!table) {
            console.error("Nessuna tabella Excel trovata nell'interfaccia");
            showNotification('Nessuna tabella trovata', 'error');
            return;
        }

        // Crea un array di oggetti con i dati aggiornati
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const updatedData = [];
        
        table.querySelectorAll('tbody tr').forEach(row => {
            const rowData = {};
            row.querySelectorAll('td').forEach((cell, index) => {
                rowData[headers[index]] = cell.textContent.trim();
            });
            updatedData.push(rowData);
        });

        // Salva i dati in sessionStorage con chiave specifica per la sezione Raccolta
        sessionStorage.setItem('raccoltaExcelData', JSON.stringify(updatedData));

        // Recupera i dati salvati dal sessionStorage
        const raccoltaDataStr = sessionStorage.getItem('raccoltaExcelData');
        const raccoltaData = JSON.parse(raccoltaDataStr);
        console.log("Dati RACCOLTA da salvare:", raccoltaData);

        // Rimuovi markature di modifiche per pulizia visiva
        document.querySelectorAll('.excel-data-table td.modified').forEach(cell => {
            cell.classList.remove('modified');
        });

        // Salva in Python e attendi il risultato, specificando CHIARAMENTE che sono dati di raccolta
        try {
            console.log("Invio dei dati RACCOLTA a Python...");
            // Specifica esplicitamente 'raccolta' come tipo
            const pythonResult = await window.electronAPI.saveExcelToPython(raccoltaData, 'raccolta');
            console.log("Risultato Python dopo il salvataggio RACCOLTA:", pythonResult);
            
            if (pythonResult.success) {
                // Verifica che metalli_campione esista nella risposta
                if (pythonResult.metalli_campione && Object.keys(pythonResult.metalli_campione).length > 0) {
                    // Salva in sessionStorage per uso nella sezione sali-metalli
                    sessionStorage.setItem('metalliCampione', JSON.stringify(pythonResult.metalli_campione));
                    console.log("Metalli campione salvati:", pythonResult.metalli_campione);
                    
                    // Mostra notifica specifica per i metalli
                    showNotification('Metalli rilevati! Vai alla sezione Sali-Metalli per assegnare i sali.', 'info');
                } else {
                    console.warn("Nessun metallo trovato nei dati del campione o valori non numerici");
                    showNotification('Dati salvati ma nessun metallo con valore numerico trovato nel campione', 'warning');
                }
                
                // Aggiorna la sezione sali-metalli
                await initSaliMetalli();
                
                // Notifica generale di successo
                showNotification('Modifiche salvate con successo');
                
                // Aggiungi attività
                addActivity('Modifiche salvate', 'Dati Excel aggiornati', 'fas fa-save');
            } else {
                throw new Error(pythonResult.message || 'Errore nel salvataggio in Python');
            }
        } catch (pythonError) {
            console.error("Errore nell'elaborazione Python:", pythonError);
            showNotification('Errore nel salvataggio dei dati in Python: ' + pythonError.message, 'error');
        }
        
    } catch (error) {
        console.error('Errore nel salvataggio delle modifiche:', error);
        showNotification('Errore nel salvataggio delle modifiche: ' + error.message, 'error');
    }
}


// Esporta in Excel
async function exportToExcel() {
    try {
        const table = document.querySelector('.excel-data-table');
        if (!table) {
            showNotification('Nessuna tabella da esportare', 'error');
            return;
        }

        // Prepara i dati
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const data = [];
        
        table.querySelectorAll('tbody tr').forEach(row => {
            const rowData = {};
            row.querySelectorAll('td').forEach((cell, index) => {
                rowData[headers[index]] = cell.textContent.trim();
            });
            data.push(rowData);
        });

        // Dialog per salvataggio file
        const filePath = await window.electronAPI.saveFile({
            title: 'Esporta dati Excel',
            defaultPath: 'dati_esportati.xlsx',
            filters: [
                { name: 'Excel Files', extensions: ['xlsx'] }
            ]
        });
        
        if (!filePath) return;
        
        // Crea workbook e worksheet
        const Excel = require('exceljs');
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Dati');
        
        // Aggiungi intestazioni
        worksheet.addRow(headers);
        
        // Aggiungi righe
        data.forEach(row => {
            const values = headers.map(header => row[header]);
            worksheet.addRow(values);
        });
        
        // Formattazione
        worksheet.getRow(1).font = { bold: true };
        
        // Salva il file
        await workbook.xlsx.writeFile(filePath);
        
        showNotification('File esportato con successo');
        
        // Aggiunge l'attività
        addActivity('File esportato', path.basename(filePath), 'fas fa-file-export');
        
    } catch (error) {
        console.error('Errore nell\'esportazione del file:', error);
        showNotification('Errore nell\'esportazione del file', 'error');
    }
}

// Funzione per eliminare il file caricato su raccolta
// Elimina file caricato su raccolta
function deleteUploadedFile() {
    try {
        // Rimuovi le informazioni del file
        sessionStorage.removeItem('uploadedFileName');
        sessionStorage.removeItem('uploadedFileDate');
        // Usa la chiave dedicata per la sezione Raccolta
        sessionStorage.removeItem('raccoltaExcelData');
        // Scomparsa pulsante del form in raccolta
        document.getElementById('salvaInfoRaccoltaBtn').style.display = 'none';
        
        // Rimuovi anche i dati relativi ai metalli
        sessionStorage.removeItem('metalliCampione');
        sessionStorage.removeItem('metalliCalcolati');
        
        // Nascondi la tabella Excel
        const excelTable = document.getElementById('excelDataTable');
        if (excelTable) {
            excelTable.style.display = 'none';
            const tableContainer = excelTable.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.innerHTML = '';
            }
        }
        
        // Rimuovi la visualizzazione del file
        const fileInfo = document.querySelector('.file-info');
        if (fileInfo) {
            fileInfo.remove();
        }
        
        // Ripristina la sezione di caricamento
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.style.display = 'block';
        }
        
        // Aggiorna la sezione sali-metalli
        updateSaliMetalliWithExcelData([]);
        
        // Aggiungi attività
        addActivity('File eliminato', 'Dati Excel rimossi', 'fas fa-trash');
        
        showNotification('File eliminato con successo');
    } catch (error) {
        console.error('Errore nell\'eliminazione del file:', error);
        // Anche in caso di errore, proviamo a ripristinare l'interfaccia
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.style.display = 'block';
        }
        showNotification('Errore nell\'eliminazione del file, ma l\'interfaccia è stata ripristinata', 'warning');
    }
}

// Apri file
async function openFile(filePath) {
    try {
        const { shell } = window.electronAPI;
        await shell.openPath(filePath);
    } catch (error) {
        console.error('Errore nell\'apertura del file:', error);
        showNotification('Errore nell\'apertura del file', 'error');
    }
}

// Elimina file
async function deleteFile(filePath) {
    try {
        // Rimuovi dalla lista
        const savedFiles = JSON.parse(localStorage.getItem('savedFiles') || '[]');
        const updatedFiles = savedFiles.filter(file => file.path !== filePath);
        localStorage.setItem('savedFiles', JSON.stringify(updatedFiles));
        
        // Aggiorna UI
        updateSavedFiles();
        
        showNotification('File rimosso dalla lista');
    } catch (error) {
        console.error('Errore nella rimozione del file:', error);
        showNotification('Errore nella rimozione del file', 'error');
    }
}













// ==== Funzioni per la sezione Reports ====

// Genera report di classificazione
async function generateClassificationReport() {
    try {
        const reportData = JSON.parse(sessionStorage.getItem('reportData'));
        if (!reportData) {
            showNotification('Nessun dato disponibile per il report', 'error');
            return;
        }
        
        // Genera nome report
        const date = new Date();
        const reportName = `Report_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}`;
        
        // Salva report
        await window.electronAPI.saveReport(`${reportName}.json`, reportData);
        
        // Aggiorna UI e naviga alla sezione report
        showSection('report');
        await updateReportsList();
        
        showNotification('Report generato con successo');
        
        // Aggiunge l'attività
        addActivity('Report generato', reportName, 'fas fa-file-alt');
        
    } catch (error) {
        console.error('Errore nella generazione del report:', error);
        showNotification('Errore nella generazione del report', 'error');
    }
}

// Aggiorna lista reports
async function updateReportsList() {
    try {
        const reportsContainer = document.querySelector('.reports-container');
        const noReportsMessage = document.querySelector('.no-reports-message');
        
        // Carica lista report
        const reportsList = await window.electronAPI.getReportsList();
        
        // Aggiorna contatore
        document.getElementById('reportsCount').textContent = reportsList.length;
        
        if (reportsList.length === 0) {
            if (noReportsMessage) {
                noReportsMessage.style.display = 'block';
            }
            reportsContainer.innerHTML = noReportsMessage ? '' : `
                <div class="no-reports-message" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fas fa-folder-open" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Nessun Report Disponibile</p>
                </div>
            `;
            return;
        }
        
        // Nascondi messaggio
        if (noReportsMessage) {
            noReportsMessage.style.display = 'none';
        }
        
        // Crea cards per ogni report
        let html = '';
        
        // Ordina i report per data (dal più recente)
        reportsList.sort().reverse().forEach(report => {
            const reportName = report.replace('.json', '');
            const date = new Date().toLocaleString('it-IT');
            
            html += `
                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="report-info">
                        <h4>${reportName}</h4>
                        <p>Generato il: ${date}</p>
                        <div class="report-actions">
                            <button class="action-btn" onclick="exportReport('${report}', 'excel')" title="Esporta Excel">
                                <i class="fas fa-file-excel"></i>
                                <span>Excel</span>
                            </button>
                            <button class="action-btn" onclick="exportReport('${report}', 'pdf')" title="Esporta PDF">
                                <i class="fas fa-file-pdf"></i>
                                <span>PDF</span>
                            </button>
                            <button class="action-btn" onclick="previewReport('${report}')" title="Anteprima">
                                <i class="fas fa-eye"></i>
                                <span>Anteprima</span>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteReport('${report}')" title="Elimina">
                                <i class="fas fa-trash"></i>
                                <span>Elimina</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        reportsContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento della lista dei report:', error);
        showNotification('Errore nell\'aggiornamento della lista dei report', 'error');
    }
}

// Esporta report
async function exportReport(reportName, format) {
    try {
        // Carica dati report
        const reportData = await window.electronAPI.loadReport(reportName);
        if (!reportData) {
            showNotification('Errore nel caricamento del report', 'error');
            return;
        }
        
        const outputName = reportName.replace('.json', '');
        
        switch (format) {
            case 'excel':
                const excelPath = await window.electronAPI.saveFile({
                    title: 'Salva report Excel',
                    defaultPath: `${outputName}.xlsx`,
                    filters: [
                        { name: 'Excel Files', extensions: ['xlsx'] }
                    ]
                });
                
                if (excelPath) {
                    await window.electronAPI.exportReportExcel(reportData, excelPath);
                    showNotification('Report esportato in formato Excel');
                    addActivity('Report esportato', `${outputName}.xlsx`, 'fas fa-file-excel');
                }
                break;
                
            case 'pdf':
                const pdfPath = await window.electronAPI.saveFile({
                    title: 'Salva report PDF',
                    defaultPath: `${outputName}.pdf`,
                    filters: [
                        { name: 'PDF Files', extensions: ['pdf'] }
                    ]
                });
                
                if (pdfPath) {
                    await window.electronAPI.exportReportPdf(reportData, pdfPath);
                    showNotification('Report esportato in formato PDF');
                    addActivity('Report esportato', `${outputName}.pdf`, 'fas fa-file-pdf');
                }
                break;
        }
        
    } catch (error) {
        console.error(`Errore nell'esportazione del report in formato ${format}:`, error);
        showNotification(`Errore nell'esportazione del report in formato ${format}`, 'error');
    }
}

// Anteprima report
async function previewReport(reportName) {
    try {
        // Implementazione anteprima report...
        showNotification(`Anteprima di ${reportName}...`);
    } catch (error) {
        console.error('Errore nella visualizzazione dell\'anteprima:', error);
        showNotification('Errore nella visualizzazione dell\'anteprima', 'error');
    }
}

// Elimina report
async function deleteReport(reportName) {
    try {
        showCustomAlert(`Sei sicuro di voler eliminare ${reportName}?`, 
            async () => {
                // Elimina il report
                await window.electronAPI.deleteReport(reportName);
                
                // Aggiorna UI
                await updateReportsList();
                
                showNotification('Report eliminato con successo');
                addActivity('Report eliminato', reportName, 'fas fa-trash');
            }
        );
    } catch (error) {
        console.error('Errore nell\'eliminazione del report:', error);
        showNotification('Errore nell\'eliminazione del report', 'error');
    }
}








// ==== Funzioni di dialogo personalizzate ====

// Mostra dialogo di conferma personalizzato
function showCustomAlert(message, onConfirm, onCancel) {
    // Crea elementi del dialogo
    const overlay = document.createElement('div');
    overlay.className = 'alert-overlay';
    
    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert';
    alertBox.innerHTML = `
        <h3>${message}</h3>
        <div class="custom-alert-buttons">
            <button class="btn btn-primary confirm-btn">
                <i class="fas fa-check"></i> Conferma
            </button>
            <button class="btn btn-primary cancel-btn">
                <i class="fas fa-times"></i> Annulla
            </button>
        </div>
    `;

    // Aggiungi al DOM
    document.body.appendChild(overlay);
    document.body.appendChild(alertBox);

    // Gestione eventi
    alertBox.querySelector('.confirm-btn').addEventListener('click', () => {
        overlay.remove();
        alertBox.remove();
        if (onConfirm) onConfirm();
    });

    alertBox.querySelector('.cancel-btn').addEventListener('click', () => {
        overlay.remove();
        alertBox.remove();
        if (onCancel) onCancel();
    });
}











/////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
///////////////////////SEZIONE REPORTS//////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

// Funzioni per la sezione Reports

// Carica e visualizza i report disponibili
async function loadReports() {
    try {
        console.log("Inizio caricamento reports");
        
        // Ottieni i container
        const reportsContainer = document.querySelector('.reports-container');
        const noReportsMessage = document.querySelector('.no-reports-message');
        
        if (!reportsContainer) {
            console.error("Container reports non trovato");
            return;
        }
        
        // Svuota il container prima di riempirlo
        reportsContainer.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><p>Caricamento in corso...</p></div>';
        
        // Carica la lista dei report
        console.log("Richiesta lista report");
        const reportsList = await window.electronAPI.getReportsList();
        console.log("Report ricevuti:", reportsList);
        
        // Aggiorna conteggio
        if (document.getElementById('reportsCount')) {
            document.getElementById('reportsCount').textContent = reportsList.length || 0;
        }
        
        // Verifica se ci sono report
        if (!reportsList || reportsList.length === 0) {
            console.log("Nessun report trovato");
            if (noReportsMessage) {
                noReportsMessage.style.display = 'block';
            }
            reportsContainer.innerHTML = '';
            return;
        }
        
        // Nascondi messaggio "nessun report"
        if (noReportsMessage) {
            noReportsMessage.style.display = 'none';
        }
        
        // Crea HTML per ogni report
        let html = '';
        
        reportsList.forEach(report => {
            console.log("Elaborazione report:", report);
            const reportName = report.replace('.json', '');
            
            html += `
                <div class="report-card" data-type="json" data-name="${reportName.toLowerCase()}">
                    <div class="report-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="report-info">
                        <h4>${reportName}</h4>
                        <p>Tipo: JSON</p>
                        <div class="report-actions">
                            <button class="action-btn" onclick="previewReport('${report}')" title="Anteprima">
                                <i class="fas fa-eye"></i>
                                <span>Anteprima</span>
                            </button>
                            <button class="action-btn" onclick="exportReport('${report}', 'excel')" title="Esporta Excel">
                                <i class="fas fa-file-excel"></i>
                                <span>Excel</span>
                            </button>
                            <button class="action-btn" onclick="exportReport('${report}', 'pdf')" title="Esporta PDF">
                                <i class="fas fa-file-pdf"></i>
                                <span>PDF</span>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteReport('${report}')" title="Elimina">
                                <i class="fas fa-trash"></i>
                                <span>Elimina</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Aggiorna il container con i dati
        reportsContainer.innerHTML = html;
        
        // Log di completamento
        console.log("Reports caricati:", reportsList.length);
        showNotification(`Caricati ${reportsList.length} report`);
        
    } catch (error) {
        console.error('Errore dettagliato nel caricamento dei report:', error);
        
        // Mostra messaggio di errore nel container
        if (document.querySelector('.reports-container')) {
            document.querySelector('.reports-container').innerHTML = `
                <div style="text-align:center;padding:2rem;color:red;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:1rem;"></i>
                    <p>Errore nel caricamento dei report: ${error.message}</p>
                    <p>Controlla la console per maggiori dettagli.</p>
                </div>
            `;
        }
        
        showNotification('Errore nel caricamento dei report: ' + error.message, 'error');
    }
}

// Configura filtri e ricerca per i report
function setupReportFilters() {
    const searchInput = document.getElementById('reportSearchInput');
    const formatFilter = document.getElementById('reportFormatFilter');
    
    if (!searchInput || !formatFilter) return;
    
    // Funzione per applicare i filtri
    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const formatValue = formatFilter.value;
        
        document.querySelectorAll('.report-card').forEach(card => {
            const reportName = card.getAttribute('data-name');
            const reportType = card.getAttribute('data-type');
            
            const matchesSearch = reportName.includes(searchTerm);
            const matchesFormat = formatValue === 'all' || reportType === formatValue;
            
            card.style.display = matchesSearch && matchesFormat ? 'flex' : 'none';
        });
        
        // Mostra messaggio se non ci sono risultati
        const visibleCards = document.querySelectorAll('.report-card[style="display: flex"]').length;
        const noResultsMessage = document.querySelector('.no-reports-message');
        
        if (noResultsMessage) {
            if (visibleCards === 0) {
                noResultsMessage.style.display = 'block';
                noResultsMessage.innerHTML = `
                    <i class="fas fa-search"></i>
                    <p>Nessun report corrisponde ai criteri di ricerca</p>
                    <button class="btn btn-primary" onclick="resetReportFilters()">
                        Azzera filtri
                    </button>
                `;
            } else {
                noResultsMessage.style.display = 'none';
            }
        }
    };
    
    // Aggiungi event listeners
    searchInput.addEventListener('input', applyFilters);
    formatFilter.addEventListener('change', applyFilters);
    
    // Esporta la funzione di reset globalmente
    window.resetReportFilters = function() {
        if (searchInput) searchInput.value = '';
        if (formatFilter) formatFilter.value = 'all';
        applyFilters();
    };
}

// Funzione per aprire un report
async function openReport(reportPath) {
    try {
        await window.electronAPI.openExternal(reportPath);
        showNotification('Report aperto');
    } catch (error) {
        console.error('Errore nell\'apertura del report:', error);
        showNotification('Errore nell\'apertura del report: ' + error.message, 'error');
    }
}

// Funzione migliorata per l'anteprima dei report
async function previewReport(reportName) {
    try {
        // Carica i dati del report
        const reportData = await window.electronAPI.loadReport(reportName);
        if (!reportData) {
            showNotification('Errore nel caricamento del report', 'error');
            return;
        }
        
        // Ottieni il container di anteprima
        const previewDialog = document.getElementById('reportPreviewDialog');
        const previewContent = document.getElementById('reportPreviewContent');
        
        if (!previewDialog || !previewContent) {
            showNotification('Componenti di anteprima non trovati', 'error');
            return;
        }
        
        // Genera HTML per l'anteprima
        let contentHtml = `
            <div class="preview-header">
                <h3>${reportName.replace('.json', '')}</h3>
                <p class="preview-date">Generato il: ${new Date().toLocaleString('it-IT')}</p>
            </div>
            <div class="preview-table-container">
                <table class="preview-table">
                    <thead>
                        <tr>
        `;
        
        // Aggiungi intestazioni
        if (reportData.length > 0) {
            const headers = Object.keys(reportData[0]);
            headers.forEach(header => {
                contentHtml += `<th>${header}</th>`;
            });
            
            contentHtml += `
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            // Aggiungi righe
            reportData.forEach(row => {
                contentHtml += '<tr>';
                headers.forEach(header => {
                    contentHtml += `<td>${row[header] !== undefined ? row[header] : ''}</td>`;
                });
                contentHtml += '</tr>';
            });
            
            contentHtml += `
                    </tbody>
                </table>
            </div>
            `;
        } else {
            contentHtml += `
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5">Nessun dato disponibile</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            `;
        }
        
        // Aggiorna il contenuto e mostra il dialog
        previewContent.innerHTML = contentHtml;
        previewDialog.style.display = 'flex';
        
        // Aggiungi event listeners per i pulsanti di esportazione nell'anteprima
        document.getElementById('exportPreviewExcelBtn').onclick = () => {
            exportReport(reportName, 'excel');
        };
        document.getElementById('exportPreviewPdfBtn').onclick = () => {
            exportReport(reportName, 'pdf');
        };
        document.getElementById('closePreviewBtn').onclick = () => {
            previewDialog.style.display = 'none';
        };
        
    } catch (error) {
        console.error('Errore nella visualizzazione dell\'anteprima:', error);
        showNotification('Errore nella visualizzazione dell\'anteprima: ' + error.message, 'error');
    }
}

// Funzione migliorata per esportare report
async function exportReport(reportName, format) {
    try {
        // Notifica inizio esportazione
        showNotification(`Esportazione in ${format.toUpperCase()} in corso...`, 'info');
        
        // Carica dati report
        const reportData = await window.electronAPI.loadReport(reportName);
        if (!reportData) {
            throw new Error('Errore nel caricamento del report');
        }
        
        const outputName = reportName.replace('.json', '');
        
        switch (format) {
            case 'excel':
                const excelPath = await window.electronAPI.saveFile({
                    title: 'Salva report Excel',
                    defaultPath: `${outputName}.xlsx`,
                    filters: [
                        { name: 'Excel Files', extensions: ['xlsx'] }
                    ]
                });
                
                if (excelPath) {
                    const result = await window.electronAPI.exportReportExcel(reportData, excelPath);
                    if (result.success) {
                        showNotification('Report esportato in formato Excel');
                        addActivity('Report esportato', `${outputName}.xlsx`, 'fas fa-file-excel');
                        
                        // Chiedi se l'utente vuole aprire il file
                        const shouldOpen = confirm("Esportazione completata. Vuoi aprire il file?");
                        if (shouldOpen) {
                            await window.electronAPI.openExternal(excelPath);
                        }
                    } else {
                        throw new Error(result.message || 'Errore nell\'esportazione Excel');
                    }
                }
                break;
                
            case 'pdf':
                const pdfPath = await window.electronAPI.saveFile({
                    title: 'Salva report PDF',
                    defaultPath: `${outputName}.pdf`,
                    filters: [
                        { name: 'PDF Files', extensions: ['pdf'] }
                    ]
                });
                
                if (pdfPath) {
                    const result = await window.electronAPI.exportReportPdf(reportData, pdfPath);
                    if (result) {
                        showNotification('Report esportato in formato PDF');
                        addActivity('Report esportato', `${outputName}.pdf`, 'fas fa-file-pdf');
                        
                        // Chiedi se l'utente vuole aprire il file
                        const shouldOpen = confirm("Esportazione completata. Vuoi aprire il file?");
                        if (shouldOpen) {
                            await window.electronAPI.openExternal(pdfPath);
                        }
                    } else {
                        throw new Error('Errore nell\'esportazione PDF');
                    }
                }
                break;
        }
    } catch (error) {
        console.error(`Errore nell'esportazione del report in formato ${format}:`, error);
        showNotification(`Errore nell'esportazione: ${error.message}`, 'error');
    }
}

// Funzione migliorata per eliminare report
async function deleteReport(reportName) {
    try {
        // Usa il dialog personalizzato per conferma
        showCustomAlert(`Sei sicuro di voler eliminare "${reportName}"?`, 
            async () => {
                try {
                    // Mostra notifica di processo in corso
                    showNotification('Eliminazione in corso...', 'info');
                    
                    // Elimina il report
                    const result = await window.electronAPI.deleteReport(reportName);
                    
                    if (!result) {
                        throw new Error('Operazione fallita');
                    }
                    
                    // Ricarica e aggiorna l'UI
                    await loadReports();
                    
                    showNotification('Report eliminato con successo');
                    addActivity('Report eliminato', reportName, 'fas fa-trash');
                } catch (deleteError) {
                    console.error('Errore durante l\'eliminazione:', deleteError);
                    showNotification('Errore nell\'eliminazione: ' + deleteError.message, 'error');
                }
            }
        );
    } catch (error) {
        console.error('Errore nell\'eliminazione del report:', error);
        showNotification('Errore nell\'eliminazione del report: ' + error.message, 'error');
    }
}

// Modifica la funzione initEventListeners per aggiungere il caricamento dei report
function initEventListenersReports() {
    // Event listener per il cambio di sezione
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            // Controlla se si sta navigando alla sezione report
            if (this.getAttribute('data-section') === 'report') {
                // Carica i report quando si naviga alla sezione
                setTimeout(() => {
                    loadReports();
                }, 100);
            }
        });
    });
    
    // Per il caricamento dei report all'avvio della pagina se siamo già nella sezione reports
    // (ad esempio dopo un refresh o in caso di deep linking)
    if (window.location.hash === '#report') {
        setTimeout(() => {
            loadReports();
        }, 100);
    }
}

// Chiamare questa funzione nel documento onload o in initEventListeners
// initEventListenersReports();

// Aggiungi queste funzioni per la generazione di report di classificazione
async function generateClassificationReport(classificationData = null) {
    try {
        // Se non vengono forniti dati, usa quelli in sessione
        if (!classificationData) {
            const dataStr = sessionStorage.getItem('classificationResults');
            if (!dataStr) {
                showNotification('Nessun dato di classificazione disponibile', 'error');
                return null;
            }
            try {
                classificationData = JSON.parse(dataStr);
            } catch (e) {
                console.error('Errore nel parsing dei dati di classificazione:', e);
                showNotification('Formato dati non valido', 'error');
                return null;
            }
        }
        
        // Genera nome univoco per il report
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
        const reportName = `Classificazione_${timestamp}`;
        
        // Prepara i dati per il report
        const reportData = [];
        
        // Se i dati provengono dal classificatore, estraili correttamente
        if (classificationData.data && classificationData.data.campione) {
            const campione = classificationData.data.campione;
            const hp = classificationData.data.caratteristiche_pericolo || [];
            
            // Crea un oggetto riassuntivo per ogni sostanza
            for (const [sostanza, info] of Object.entries(campione)) {
                reportData.push({
                    'Sostanza': sostanza,
                    'Concentrazione (ppm)': info.concentrazione_ppm || 0,
                    'Frasi H': info.frasi_h ? info.frasi_h.join(', ') : 'N/A',
                    'Caratteristiche HP': info.caratteristiche_pericolo ? info.caratteristiche_pericolo.join(', ') : 'Nessuna',
                    'CAS': info.cas || 'N/A'
                });
            }
            
            // Aggiungi una riga con il risultato complessivo
            reportData.push({
                'Sostanza': '** RISULTATO TOTALE **',
                'Concentrazione (ppm)': '',
                'Frasi H': '',
                'Caratteristiche HP': hp.join(', ') || 'Nessuna caratteristica di pericolo',
                'CAS': ''
            });
        } else if (Array.isArray(classificationData)) {
            // Se i dati sono già in formato tabellare, usali direttamente
            reportData.push(...classificationData);
        }
        
        // Ottieni il percorso della cartella reports
        const reportsPath = await window.electronAPI.getReportsPath();
        const reportFilePath = path.join(reportsPath, `${reportName}.json`);
        
        // Salva il report in formato JSON
        const writeResult = await window.electronAPI.writeFile(reportFilePath, JSON.stringify(reportData, null, 2));
        
        if (!writeResult.success) {
            throw new Error(writeResult.message || 'Errore nel salvataggio del report');
        }
        
        // Salva anche come report ufficiale nell'API dedicata
        await window.electronAPI.saveReport(`${reportName}.json`, reportData);
        
        showNotification(`Report "${reportName}" generato con successo!`);
        
        // Aggiorna la visualizzazione dei report
        await loadReports();
        
        // Vai alla sezione report
        showSection('report');
        
        // Aggiunge l'attività
        addActivity('Report generato', reportName, 'fas fa-file-alt');
        
        return reportName;
    } catch (error) {
        console.error('Errore nella generazione del report:', error);
        showNotification('Errore nella generazione del report: ' + error.message, 'error');
        return null;
    }
}



    // Inizializzazione eventi per i bottoni della sezione report
    document.getElementById('openReportsFolderBtn').addEventListener('click', async function() {
        try {
            const reportsPath = await window.electronAPI.getReportsPath();
            await window.electronAPI.openFolder(reportsPath);
        } catch (error) {
            console.error('Errore nell\'apertura della cartella reports:', error);
            showNotification('Errore nell\'apertura della cartella reports', 'error');
        }
    });
    
    // Crea un report demo per testare
    document.getElementById('createDemoReportBtn').addEventListener('click', async function() {
        try {
            // Crea dati demo
            const demoData = [
                {
                    "Sostanza": "Rame",
                    "Concentrazione (ppm)": 250,
                    "Frasi H": "H400, H410",
                    "Caratteristiche HP": "HP14",
                    "CAS": "7440-50-8"
                },
                {
                    "Sostanza": "Piombo",
                    "Concentrazione (ppm)": 150,
                    "Frasi H": "H360, H373",
                    "Caratteristiche HP": "HP10, HP5",
                    "CAS": "7439-92-1"
                },
                {
                    "Sostanza": "Zinco",
                    "Concentrazione (ppm)": 350,
                    "Frasi H": "H400, H410",
                    "Caratteristiche HP": "HP14",
                    "CAS": "7440-66-6"
                },
                {
                    "Sostanza": "** RISULTATO TOTALE **",
                    "Concentrazione (ppm)": "",
                    "Frasi H": "",
                    "Caratteristiche HP": "HP5, HP10, HP14",
                    "CAS": ""
                }
            ];
            
            // Genera nome univoco per il report
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
            const reportName = `Demo_${timestamp}`;
            
            // Salva il report demo
            await window.electronAPI.saveReport(`${reportName}.json`, demoData);
            
            // Aggiorna la visualizzazione dei report
            await loadReports();
            
            // Notifica all'utente
            showNotification('Report demo creato con successo');
            
            // Aggiungi attività
            addActivity('Report demo', 'Creato report di esempio', 'fas fa-file-alt');
        } catch (error) {
            console.error('Errore nella creazione del report demo:', error);
            showNotification('Errore nella creazione del report demo', 'error');
        }
    });
    
    // Chiudere la finestra di anteprima
    document.getElementById('closeReportPreviewDialog').addEventListener('click', function() {
        document.getElementById('reportPreviewDialog').style.display = 'none';
    });
    
    document.getElementById('closePreviewBtn').addEventListener('click', function() {
        document.getElementById('reportPreviewDialog').style.display = 'none';
    });
    
    // Chiudere l'anteprima quando si clicca fuori da essa
    document.getElementById('reportPreviewDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Assicurati che la funzione loadReports sia disponibile
    if (typeof loadReports !== 'function') {
        console.warn('Attenzione: la funzione loadReports non è definita. Includere il file reports.js prima di questo script.');
    }



