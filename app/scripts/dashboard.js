//INIZIALIZZAZIONE DASHBOARD
//==================================================================================================

document.addEventListener('DOMContentLoaded', async function() {

    initUpdateSystem();

    // Inizializza interfaccia
    initNavigation();
    initSidebar();
    initThemeToggle();
    await updateAppVersion();
    
    // Carica dati salvati
    await loadSavedData();
    
    // Inizializza listeners degli eventi
    initEventListeners();
    initElectronListeners();
    initTabellaRiscontro();

    // Inizializza sezione sali-metalli
    await initSaliMetalli();

    // Inizializza check raccolta
    addSostanzeMissingDialogCSS();

    // Inizializza sezione classificazione
    initClassificazione();          // Questa chiama la funzione dal modulo classificazione.js
    updateClassificationUI();       // Assicura che l'UI sia aggiornata all'avvio

    // Inizializza la sezione reports
    if (typeof initReports === 'function') {
        initReports();
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
async function updateAppVersion() {
    const appVersionElements = document.querySelectorAll('#appVersion, #aboutAppVersion');
    
    try {
        // Ottieni la versione dal main process
        const version = await window.appInfo.getAppVersion();
        
        appVersionElements.forEach(el => {
            if (el.id === 'aboutAppVersion') {
                el.textContent = `Versione ${version}`;
            } else {
                el.textContent = `WasteGuard ${version}`;
            }
        });
    } catch (error) {
        console.error('Errore nel recupero della versione:', error);
        
        // Fallback alla versione hardcoded
        appVersionElements.forEach(el => {
            if (el.id === 'aboutAppVersion') {
                el.textContent = `Versione 1.0.3`;
            } else {
                el.textContent = `WasteGuard 1.0.3`;
            }
        });
    }
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































// EVENT LISTNERS - MODIFICATO
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

        // MODIFICATO: Event listener unificato per il pulsante Salva Tutto
        const saveChangesBtn = document.getElementById('saveChangesBtn');
        if (saveChangesBtn) {
            saveChangesBtn.addEventListener('click', saveAllData);
            console.log("Event listener aggiunto al bottone Salva Tutto");
        } else {
            console.error("Bottone Salva Tutto non trovato!");
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

    // Resto dei listener rimane invariato...
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

    // Verifica se siamo nella sezione tabella-di-riscontro quando la pagina carica
    if (window.location.hash === '#tabella-di-riscontro') {
        // Esegui con un leggero ritardo per assicurarsi che tutto sia caricato
        setTimeout(() => {
            // Se ci sono risultati di confronto ECHA, caricali nella tab aggiornamenti
            if (localStorage.getItem('echaComparisonResults')) {
                console.log("Rilevati risultati confronto ECHA al caricamento pagina");
                
                // Attiva la tab aggiornamenti
                document.querySelectorAll('.tab-item').forEach(tab => {
                    if (tab.getAttribute('data-tab') === 'aggiornamenti') {
                        tab.click();
                    }
                });
                
                // Carica i risultati se la funzione è disponibile
                if (typeof window.loadEchaComparisonResults === 'function') {
                    window.loadEchaComparisonResults();
                }
            }
        }, 500);
    }

    // Aggiungi un listener per il cambio di hash/sezione
    window.addEventListener('hashchange', function() {
        const newHash = window.location.hash.slice(1);
        console.log("Hash changed to:", newHash);
        
        // Se il cambio è verso tabella-di-riscontro, verifica i risultati ECHA
        if (newHash === 'tabella-di-riscontro' && localStorage.getItem('echaComparisonResults')) {
            console.log("Hash change: tabella-di-riscontro con risultati ECHA");
            
            // Attendi che la sezione sia attivata e poi carica i risultati
            setTimeout(() => {
                // Attiva la tab aggiornamenti
                document.querySelectorAll('.tab-item').forEach(tab => {
                    if (tab.getAttribute('data-tab') === 'aggiornamenti') {
                        tab.click();
                    }
                });
                
                // Carica i risultati ECHA
                if (typeof window.loadEchaComparisonResults === 'function') {
                    window.loadEchaComparisonResults();
                } else {
                    console.error("Funzione loadEchaComparisonResults non disponibile");
                }
            }, 500);
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
function showNotification(message, type = 'success', duration = 5000) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notification.className = 'notification';
    notification.classList.add(`notification-${type}`);
    
    notificationText.textContent = message;
    notification.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, duration);
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
// Modifiche alla funzione handleFileSelection() per gestire l'errore di sostanze mancanti
// MODIFICATO: handleFileSelection - Aggiornata la logica di visibilità dei pulsanti
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
            
            // NUOVO CODICE: Verifica immediata delle sostanze nel database
            try {
                // Invia i dati a Python per verifica (ma senza salvarli permanentemente)
                const verifyResult = await window.electronAPI.verifyExcelData(filteredData, 'raccolta');
                
                // Se la verifica fallisce a causa di sostanze mancanti
                if (!verifyResult.success && verifyResult.sostanze_mancanti && verifyResult.sostanze_mancanti.length > 0) {
                    showSostanzeMissingDialog(verifyResult.sostanze_mancanti);
                    return; // Interrompi il caricamento
                }
            } catch (verifyError) {
                console.error("Errore nella verifica delle sostanze:", verifyError);
                // Continua comunque, il controllo verrà fatto durante il salvataggio
            }
            
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

            // MODIFICATO: Mostra il pulsante Salva Tutto solo quando il file è caricato
            updateSaveButtonVisibility();

            // Mostra notifica di successo
            showNotification(`File ${fileName} caricato con successo! (${filteredData.length} righe valide)`, 'success');
        }
        
    } catch (error) {
        console.error('Errore nel caricamento del file:', error);
        showNotification('Errore nel caricamento del file', 'error');
    }
}

// Gestisce la visibilità del pulsante Salva Tutto
function updateSaveButtonVisibility() {
    const saveBtn = document.getElementById('saveChangesBtn');
    const hasExcelData = sessionStorage.getItem('raccoltaExcelData') !== null;
    
    if (saveBtn) {
        if (hasExcelData) {
            saveBtn.style.display = 'inline-flex';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Tutto';
        } else {
            saveBtn.style.display = 'none';
        }
    }
}



// Versione FINALE di saveAllData() che usa le API esistenti (senza verifyExcelData)

async function saveAllData() {
    console.log("=== INIZIO saveAllData() ===");
    
    // Notifica l'utente che il processo di salvataggio è iniziato
    showNotification('Salvataggio di tutti i dati in corso...', 'info');
    
    try {
        // STEP 0: Verifica delle sostanze nel database usando saveExcelToPython
        console.log("Step 0: Verifica sostanze nel database...");
        
        // Ottieni i dati Excel dalla sessionStorage
        const raccoltaExcelData = sessionStorage.getItem('raccoltaExcelData');
        
        if (!raccoltaExcelData) {
            throw new Error('Nessun dato Excel trovato. Caricare prima un file Excel.');
        }
        
        let excelData = JSON.parse(raccoltaExcelData);
        console.log("Dati Excel caricati per verifica:", excelData.length, "righe");
        
        try {
            // Usa l'API esistente saveExcelToPython che già verifica le sostanze
            console.log("Chiamata saveExcelToPython per verifica sostanze...");
            const verifyResult = await window.electronAPI.saveExcelToPython(excelData, 'raccolta');
            
            console.log("Risultato verifica:", verifyResult);
            
            // Se la verifica fallisce a causa di sostanze mancanti
            if (!verifyResult.success) {
                if (verifyResult.sostanze_mancanti && verifyResult.sostanze_mancanti.length > 0) {
                    console.log("Sostanze mancanti trovate:", verifyResult.sostanze_mancanti);
                    
                    // Mostra il dialog delle sostanze mancanti
                    showSostanzeMissingDialog(verifyResult.sostanze_mancanti);
                    
                    // Interrompi il processo di salvataggio
                    showNotification('Salvataggio annullato: sostanze mancanti nel database', 'error');
                    return;
                } else {
                    // Se non ci sono sostanze_mancanti nel risultato, prova a estrarle dal messaggio
                    if (verifyResult.message && verifyResult.message.includes("sostanze non sono presenti nel database:")) {
                        const match = verifyResult.message.match(/sostanze non sono presenti nel database: (.+)$/);
                        if (match) {
                            const sostanzeMancanti = match[1].split(', ');
                            console.log("Sostanze estratte dal messaggio:", sostanzeMancanti);
                            showSostanzeMissingDialog(sostanzeMancanti);
                            showNotification('Salvataggio annullato: sostanze mancanti nel database', 'error');
                            return;
                        }
                    }
                    
                    // Fallback: mostra errore generico ma con possibilità di continuare
                    const confirmProceed = confirm(
                        `Errore nella verifica delle sostanze:\n\n${verifyResult.message || 'Errore sconosciuto'}\n\nVuoi procedere comunque con il salvataggio?`
                    );
                    
                    if (!confirmProceed) {
                        showNotification('Salvataggio annullato dall\'utente', 'warning');
                        return;
                    }
                }
            } else {
                console.log("✅ Verifica sostanze completata con successo");
            }
                
        } catch (verifyError) {
            console.log("❌ ERRORE in saveExcelToPython:", verifyError.message);
            
            // Prova a estrarre informazioni sulle sostanze mancanti dall'errore
            if (verifyError.message && verifyError.message.includes("sostanze non sono presenti nel database:")) {
                const match = verifyError.message.match(/sostanze non sono presenti nel database: (.+)$/);
                if (match) {
                    const sostanzeMancanti = match[1].split(', ');
                    console.log("Sostanze mancanti estratte dall'errore:", sostanzeMancanti);
                    
                    // Mostra direttamente il dialog con le sostanze mancanti
                    showSostanzeMissingDialog(sostanzeMancanti);
                    showNotification('Salvataggio annullato: sostanze mancanti nel database', 'error');
                    return;
                }
            }
            
            // Se non riusciamo a estrarre le sostanze, mostra errore dettagliato
            const messaggioErrore = `Si è verificato un errore durante la verifica delle sostanze nel database:\n\n${verifyError.message}\n\nVuoi procedere comunque con il salvataggio?`;
            const confirmProceed = confirm(messaggioErrore);
            
            if (!confirmProceed) {
                showNotification('Salvataggio annullato dall\'utente', 'warning');
                return;
            }
            
            console.log("Utente ha scelto di procedere nonostante l'errore di verifica");
        }
        
        // STEP 1: Salva i dati dei form
        console.log("=== STEP 1: Salvataggio form ===");
        const formSaved = await window.infoRaccoltaManager.saveFormData();
        
        if (!formSaved) {
            console.error("❌ Errore nel salvataggio dei form");
            showNotification('Errore nel salvataggio del form. Verificare che tutti i campi obbligatori siano compilati.', 'error');
            return;
        }
        
        console.log("✅ Form salvati con successo");

        // STEP 2: Ottieni i dati del form
        const formData = window.infoRaccoltaManager.getFormData();
        console.log("Dati form ottenuti:", formData);

        // STEP 3: Salva il progetto unificato
        console.log("=== STEP 3: Salvataggio progetto unificato ===");
        
        // Crea un identificativo unico per il progetto basato sui dati del form
        const committente = formData.committente?.replace(/\s+/g, '') || 'NoCommittente';
        const dataCampionamento = formData.dataCampionamento?.replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const identificativo = `${committente}_${dataCampionamento}`;
        
        console.log("Identificativo progetto:", identificativo);
        
        // Salva il progetto unificato utilizzando l'API
        const saveResult = await window.electronAPI.saveProgettoRaccolta({
            id: identificativo,
            timestamp: new Date().toISOString(),
            caratteristicheFisiche: formData.caratteristicheFisiche,
            infoCertificato: formData.infoCertificato,
            datiExcel: excelData,
            metalliCampione: {}, // Sarà popolato dopo l'elaborazione Python
            versione: 1
        });
        
        if (saveResult.success) {
            // Pulisci i dati temporanei
            sessionStorage.removeItem('raccoltaExcelData');
            sessionStorage.removeItem('raccoltaFormData');
            
            // Reset dell'interfaccia
            if (typeof resetRaccoltaInterface === 'function') {
                resetRaccoltaInterface();
            }
            
            // Notifica successo
            showNotification(`Progetto "${identificativo}" salvato con successo! Vai alla sezione Sali-Metalli per continuare.`, 'success');
            
            // Aggiungi attività
            if (typeof addActivity === 'function') {
                addActivity('Progetto salvato', `Progetto "${identificativo}" creato`, 'fas fa-save');
            }
            
            console.log("✅ Progetto unificato salvato con successo!");
        } else {
            throw new Error(saveResult.message || 'Errore nel salvataggio del progetto');
        }
        
    } catch (error) {
        console.log("❌ ERRORE GENERALE:", error.message);
        showNotification('Errore nel salvataggio: ' + error.message, 'error');
    }
    
    console.log("=== FINE saveAllData() ===");
}


// SOSTITUIRE la funzione showSostanzeMissingDialog esistente in dashboard.js con questa versione migliorata

function showSostanzeMissingDialog(sostanzeMancanti) {
    // Crea un messaggio dettagliato con tutte le sostanze mancanti
    let alertMessage = '';
    
    if (sostanzeMancanti.length === 1) {
        alertMessage = `ERRORE: Sostanza mancante nel database\n\n• ${sostanzeMancanti[0]}\n\nNon è possibile procedere con il salvataggio fino a quando questa sostanza non sarà aggiunta al database.`;
    } else {
        alertMessage = `ERRORE: ${sostanzeMancanti.length} sostanze mancanti nel database\n\n${sostanzeMancanti.map(s => `• ${s}`).join('\n')}\n\nNon è possibile procedere con il salvataggio fino a quando tutte queste sostanze non saranno aggiunte al database.`;
    }
    
    // Mostra l'alert con tutte le sostanze mancanti
    alert(alertMessage);
    
    // Mostra anche una notifica più breve per feedback visivo
    const shortMessage = sostanzeMancanti.length === 1 
        ? `Sostanza "${sostanzeMancanti[0]}" non trovata nel database`
        : `${sostanzeMancanti.length} sostanze non trovate nel database`;
    
    showNotification(shortMessage, 'error', 6000);
    
    // Riporta l'interfaccia allo stato iniziale
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.style.display = 'block';
    }
    
    // Nascondi la tabella Excel se visibile
    const excelTable = document.getElementById('excelDataTable');
    if (excelTable) {
        excelTable.style.display = 'none';
    }
    
    // Nascondi il pulsante "Salva Tutto"
    const saveBtn = document.getElementById('saveChangesBtn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
    
    // Rimuovi eventuali file-info precedenti
    const oldFileInfo = document.querySelector('.file-info');
    if (oldFileInfo) {
        oldFileInfo.remove();
    }
    
    // Pulisci i dati dalla sessionStorage
    sessionStorage.removeItem('raccoltaExcelData');
    
    console.log("Sostanze mancanti mostrate all'utente:", sostanzeMancanti);
}


// CSS per il dialog di sostanze mancanti
const sostanzeMissingDialogCSS = `
.alert-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.custom-alert {
    background-color: var(--bg-color);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    padding: 20px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

.sostanze-missing-dialog h3 {
    color: var(--warning-color);
    margin-top: 0;
    margin-bottom: 15px;
}

.sostanze-missing-list {
    max-height: 200px;
    overflow-y: auto;
    margin: 15px 0;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: rgba(var(--warning-rgb), 0.1);
}

.sostanze-missing-list ul {
    margin: 0;
    padding-left: 20px;
}

.sostanze-missing-list li {
    margin-bottom: 6px;
    color: var(--text-color);
}

.custom-alert-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.custom-alert-buttons .btn {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
}


.notification-warning {
    background-color: var(--warning-light);
    border-left: 4px solid var(--warning-color);
    color: var(--warning-dark);
}
`;

// Aggiungi il CSS al documento
function addSostanzeMissingDialogCSS() {
    const styleElement = document.createElement('style');
    styleElement.textContent = sostanzeMissingDialogCSS;
    document.head.appendChild(styleElement);
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
// MODIFICATO: deleteUploadedFile - Aggiornata per gestire la nuova logica dei pulsanti
function deleteUploadedFile() {
    try {
        // Rimuovi le informazioni del file
        sessionStorage.removeItem('uploadedFileName');
        sessionStorage.removeItem('uploadedFileDate');
        // Usa la chiave dedicata per la sezione Raccolta
        sessionStorage.removeItem('raccoltaExcelData');
        
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
        
        // MODIFICATO: Aggiorna la visibilità del pulsante
        updateSaveButtonVisibility();
        
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












// Funzione per estrarre codice EER dal nome file (per uso in dashboard.js)
function extractCodiceEERFromFileName(fileName) {
    // Prova formato nuovo: dati_campione_CODICE-EER_data_committente.json
    const newFormatMatch = fileName.match(/dati_campione_(.+?)_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}_(.+?)\.json/);
    if (newFormatMatch) {
        return newFormatMatch[1]; // Restituisce il codice EER
    }
    
    // Fallback formato vecchio con numero campionamento per compatibilità
    const oldNumeroCampionamentoMatch = fileName.match(/dati_campione_(.+?)_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}\.json/);
    if (oldNumeroCampionamentoMatch) {
        return `LEGACY_${oldNumeroCampionamentoMatch[1]}`;
    }
    
    // Fallback formato molto vecchio con timestamp
    const oldFormatMatch = fileName.match(/dati_campione_(\d{14})/);
    if (oldFormatMatch) {
        return `TIMESTAMP_${oldFormatMatch[1]}`;
    }
    
    return 'CODICE_EER_NON_TROVATO';
}

// Funzione per estrarre committente dal nome file
function extractCommittenteFromFileName(fileName) {
    // Formato: dati_campione_CODICE-EER_data_COMMITTENTE.json
    const match = fileName.match(/dati_campione_.+?_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}_(.+?)\.json/);
    if (match) {
        return match[1].replace(/_/g, ' '); // Riconverti underscore in spazi
    }
    
    return 'Committente_Sconosciuto';
}

// Funzione per estrarre data e ora dal nome file
function extractDataOraFromFileName(fileName) {
    // Estrai timestamp dal nome file
    const match = fileName.match(/(\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2})/);
    if (match) {
        return match[1].replace(/_/g, ' '); // Formato: 25-12-2024 14-30-25
    }
    
    return 'Data_Non_Disponibile';
}






// Sistema di aggiornamento - Autoupdater
function initUpdateSystem() {
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const updateStatus = document.getElementById('updateStatus');
  
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      checkUpdateBtn.disabled = true;
      checkUpdateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Controllo...';
      
      if (updateStatus) {
        updateStatus.textContent = 'Controllo aggiornamenti in corso...';
        updateStatus.className = 'update-status checking';
      }
      
      try {
        const result = await window.electronAPI.checkForUpdates();
        
        if (result.success) {
          if (updateStatus) {
            updateStatus.textContent = result.message || 'Controllo completato.';
            updateStatus.className = 'update-status available';
          }
        } else {
          if (updateStatus) {
            updateStatus.textContent = 'Errore nel controllo: ' + result.error;
            updateStatus.className = 'update-status error';
          }
        }
      } catch (error) {
        if (updateStatus) {
          updateStatus.textContent = 'Errore imprevisto: ' + error.message;
          updateStatus.className = 'update-status error';
        }
      }
      
      checkUpdateBtn.disabled = false;
      checkUpdateBtn.innerHTML = '<i class="fas fa-download"></i> Controlla Aggiornamenti';
    });
  }
  
  // FIX: Rimuovi i listener esistenti prima di aggiungere i nuovi
  if (window.electronAPI.removeAllUpdateListeners) {
    window.electronAPI.removeAllUpdateListeners();
  }
  
  // Listener per download in corso
  window.electronAPI.onUpdateDownloading(() => {
    console.log('Download iniziato - mostrando modal');
    showUpdateDownloadModal();
  });
  
  // FIX: Listener per progress del download
  window.electronAPI.onDownloadProgress((event, progress) => {
    console.log('Progress ricevuto:', progress);
    updateDownloadProgress(progress);
  });


  // FIX: Listener per errori di aggiornamento
window.electronAPI.onUpdateError((event, error) => {
  console.error('❌ Errore aggiornamento ricevuto:', error);
  showUpdateErrorModal(error);
});

}




// NUOVA funzione per mostrare errori
function showUpdateErrorModal(error) {
  const existingModal = document.getElementById('updateModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'update-modal-overlay';
  modal.id = 'updateModal';
  modal.innerHTML = `
    <div class="update-modal-content">
      <div class="update-modal-header">
        <div class="update-icon error">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Errore Aggiornamento</h3>
        <p>Si è verificato un problema durante l'aggiornamento</p>
      </div>
      
      <div class="update-error-section">
        <div class="update-error-message">
          ${error.message || 'Errore sconosciuto'}
        </div>
        ${error.details ? `<div class="update-error-details">${error.details}</div>` : ''}
      </div>
      
      <div class="update-modal-footer">
        <button class="btn btn-primary" onclick="this.closest('.update-modal-overlay').remove()">
          <i class="fas fa-check"></i> OK
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}




function showUpdateDownloadModal() {
  // Rimuovi modal esistente se presente
  const existingModal = document.getElementById('updateModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'update-modal-overlay';
  modal.id = 'updateModal';
  modal.innerHTML = `
    <div class="update-modal-content">
      <div class="update-modal-header">
        <div class="update-icon">
          <i class="fas fa-download"></i>
        </div>
        <h3>Download Aggiornamento</h3>
        <p>Scaricamento della nuova versione in corso...</p>
      </div>
      
      <div class="update-progress-section">
        <div class="update-progress-container">
          <div class="update-progress-bar">
            <div class="update-progress-fill" id="updateProgress"></div>
          </div>
          <div class="update-progress-text">
            <span id="progressText">0%</span>
            <span id="downloadSpeed"></span>
          </div>
        </div>
        <div id="downloadDetails" class="update-download-details"></div>
      </div>
      
      <div class="update-modal-footer">
        <div class="update-warning">
          <i class="fas fa-info-circle"></i>
          <span>Non chiudere l'applicazione durante il download</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Inizializza progress a 0%
  updateDownloadProgress({ percent: 0 });
}

function updateDownloadProgress(progress) {
  const progressFill = document.getElementById('updateProgress');
  const progressText = document.getElementById('progressText');
  const downloadSpeed = document.getElementById('downloadSpeed');
  const downloadDetails = document.getElementById('downloadDetails');
  
  if (progressFill && progressText) {
    const percent = Math.round(progress.percent || 0);
    progressFill.style.width = percent + '%';
    progressText.textContent = percent + '%';
    
    // Aggiorna informazioni dettagliate
    if (progress.bytesPerSecond && downloadSpeed) {
      const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(2);
      downloadSpeed.textContent = `${speed} MB/s`;
    }
    
    if (progress.transferred && progress.total && downloadDetails) {
      const transferred = (progress.transferred / 1024 / 1024).toFixed(2);
      const total = (progress.total / 1024 / 1024).toFixed(2);
      downloadDetails.textContent = `${transferred} MB / ${total} MB`;
    }
    
    // Chiudi modal quando completato
    if (percent >= 100) {
      setTimeout(() => {
        const modal = document.getElementById('updateModal');
        if (modal) {
          modal.remove();
        }
      }, 2000);
    }
  }
}