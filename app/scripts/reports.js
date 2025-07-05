// Aggiungere dopo i commenti iniziali, prima di initReports()
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

// Funzione per estrarre numero campionamento dal nome del report
function extractCodiceEERFromReportName(reportName) {
    // Prova formato nuovo: risultato_classificazione_CODICE-EER_data.json
    const newFormatMatch = reportName.match(/risultato_classificazione_(.+?)_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}\.json/);
    if (newFormatMatch) {
        return newFormatMatch[1];
    }
    
    // Fallback formato vecchio timestamp
    const oldFormatMatch = reportName.match(/risultato_classificazione_(\d{14})/);
    if (oldFormatMatch) {
        return `LEGACY_${oldFormatMatch[1]}`;
    }
    
    // Altri formati (Demo, ecc.)
    if (reportName.startsWith('Demo_')) {
        return 'DEMO';
    }
    
    return 'CODICE_EER_NON_TROVATO';
}

























/**
 * Inizializza completamente la sezione Reports
 */
function initReports() {
    console.log("Inizializzazione sezione Reports...");
    
    // Inizializza gli event listeners
    initEventListenersReports();
    
    // Carica le note preimpostate
    loadPresetNotes();
    
    // Se siamo già nella sezione report al caricamento, carica i dati
    if (window.location.hash === '#report') {
        setTimeout(() => {
            loadReports();
            setupReportFilters();
        }, 100);
    }
    
    console.log("Sezione Reports inizializzata con successo");
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////* FUNZIONI EVENT LISTENERS *//////////////////////////////////////////77
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////


/**
 * Inizializza tutti gli event listeners per la sezione Reports
 */
function initEventListenersReports() {
    // Event listener per il cambio di sezione verso Reports
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('data-section') === 'report') {
                setTimeout(() => {
                    loadReports();
                    setupReportFilters();
                }, 100);
            }
        });
    });
    
    // Event listeners per i bottoni della sezione report
    const openReportsFolderBtn = document.getElementById('openReportsFolderBtn');
    if (openReportsFolderBtn) {
        openReportsFolderBtn.addEventListener('click', async function() {
            try {
                const reportsPath = await window.electronAPI.getReportsPath();
                await window.electronAPI.openFolder(reportsPath);
            } catch (error) {
                console.error('Errore nell\'apertura della cartella reports:', error);
                if (typeof showNotification === 'function') {
                    showNotification('Errore nell\'apertura della cartella reports', 'error');
                }
            }
        });
    }
    
    // Bottone per creare report demo
    const createDemoReportBtn = document.getElementById('createDemoReportBtn');
    if (createDemoReportBtn) {
        createDemoReportBtn.addEventListener('click', async function() {
            try {
                await createDemoReport();
            } catch (error) {
                console.error('Errore nella creazione del report demo:', error);
                if (typeof showNotification === 'function') {
                    showNotification('Errore nella creazione del report demo', 'error');
                }
            }
        });
    }
    
    // Event listeners per i filtri di ricerca
    const reportSearchInput = document.getElementById('reportSearchInput');
    if (reportSearchInput) {
        reportSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const formatValue = document.getElementById('reportFormatFilter')?.value || 'all';
            filterReports(searchTerm, formatValue);
        });
    }
    
    const reportFormatFilter = document.getElementById('reportFormatFilter');
    if (reportFormatFilter) {
        reportFormatFilter.addEventListener('change', function() {
            const formatValue = this.value;
            const searchTerm = document.getElementById('reportSearchInput')?.value.toLowerCase() || '';
            filterReports(searchTerm, formatValue);
        });
    }
    
    // Event listeners per i dialoghi di anteprima
    const closeReportPreviewDialog = document.getElementById('closeReportPreviewDialog');
    if (closeReportPreviewDialog) {
        closeReportPreviewDialog.addEventListener('click', function() {
            document.getElementById('reportPreviewDialog').style.display = 'none';
            currentPreviewReport = null; // Pulisce la variabile
        });
    }

    // Event listener per il bottone Esporta Word nell'anteprima
    const exportPreviewWordBtn = document.getElementById('exportPreviewWordBtn');
    if (exportPreviewWordBtn) {
        exportPreviewWordBtn.addEventListener('click', function() {
            if (currentPreviewReport) {
                exportReport(currentPreviewReport, 'word');
            } else {
                showNotification('Errore: nessun report selezionato', 'error');
            }
        });
    }
    
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', function() {
            document.getElementById('reportPreviewDialog').style.display = 'none';
            currentPreviewReport = null; // Pulisce la variabile
        });
    }
    
    // Chiudere l'anteprima quando si clicca fuori da essa
    const reportPreviewDialog = document.getElementById('reportPreviewDialog');
    if (reportPreviewDialog) {
        reportPreviewDialog.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    // Inizializza il sistema di note
    initNotesSystemEventListeners();
    
    console.log("Event listeners Reports inizializzati");
}


/**
 * Inizializza gli event listeners per il sistema di note
 */
function initNotesSystemEventListeners() {
    // Listener per il bottone salva note
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', saveNotes);
    }
    
    // Listener per chiudere il dialog delle note
    const closeNotesBtn = document.getElementById('closeNotesBtn');
    if (closeNotesBtn) {
        closeNotesBtn.addEventListener('click', function() {
            document.getElementById('notesDialog').style.display = 'none';
        });
    }
    
    const closeNotesDialog = document.getElementById('closeNotesDialog');
    if (closeNotesDialog) {
        closeNotesDialog.addEventListener('click', function() {
            document.getElementById('notesDialog').style.display = 'none';
        });
    }
    
    // Chiudi il dialog quando si clicca al di fuori
    const notesDialog = document.getElementById('notesDialog');
    if (notesDialog) {
        notesDialog.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    // Salva con Ctrl+Enter nel textarea
    const reportNotesTextarea = document.getElementById('reportNotes');
    if (reportNotesTextarea) {
        reportNotesTextarea.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                saveNotes();
            }
        });
    }
    
    // Event listeners per le note preimpostate
    const addNewPresetBtn = document.getElementById('addNewPresetBtn');
    if (addNewPresetBtn) {
        addNewPresetBtn.addEventListener('click', function() {
            openPresetDialog();
        });
    }
    
    const savePresetBtn = document.getElementById('savePresetBtn');
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', savePresetNote);
    }
    
    const cancelPresetBtn = document.getElementById('cancelPresetBtn');
    if (cancelPresetBtn) {
        cancelPresetBtn.addEventListener('click', function() {
            document.getElementById('presetDialog').style.display = 'none';
        });
    }
    
    const closePresetDialog = document.getElementById('closePresetDialog');
    if (closePresetDialog) {
        closePresetDialog.addEventListener('click', function() {
            document.getElementById('presetDialog').style.display = 'none';
        });
    }
    
    const presetDialog = document.getElementById('presetDialog');
    if (presetDialog) {
        presetDialog.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
}


/**
 * Crea un report demo per testare il sistema
 */
// MODIFICATO: createDemoReport con nome basato su codice EER
async function createDemoReport() {
    try {
        // Crea dati demo
        const demoData = [
            {
                "Sostanza": "Rame",
                "Conc. (ppm)": 250,
                "Frasi H": "H400, H410",
                "Caratteristiche HP": "HP14",
                "CAS": "7440-50-8"
            },
            {
                "Sostanza": "Piombo",
                "Conc. (ppm)": 150,
                "Frasi H": "H360, H373",
                "Caratteristiche HP": "HP10, HP5",
                "CAS": "7439-92-1"
            },
            {
                "Sostanza": "Zinco",
                "Conc. (ppm)": 350,
                "Frasi H": "H400, H410",
                "Caratteristiche HP": "HP14",
                "CAS": "7440-66-6"
            },
            {
                "Sostanza": "** RISULTATO TOTALE **",
                "Conc. (ppm)": "",
                "Frasi H": "",
                "Caratteristiche HP": "HP5, HP10, HP14",
                "CAS": ""
            }
        ];
        
        // MODIFICATO: Generazione nome demo con codice EER
        const dataOraItaliana = generateItalianDateTime();
        const reportName = `Demo_EER-DEMO_${dataOraItaliana}`;
        
        // Salva il report demo
        await window.electronAPI.saveReport(`${reportName}.json`, demoData);
        
        // Aggiorna la visualizzazione dei report
        await loadReports();
        
        // Notifica all'utente
        if (typeof showNotification === 'function') {
            showNotification('Report demo creato con successo');
        }
        
        // Aggiungi attività
        if (typeof addActivity === 'function') {
            addActivity('Report demo', 'Creato report di esempio', 'fas fa-file-alt');
        }
        
        return true;
    } catch (error) {
        console.error('Errore nella creazione del report demo:', error);
        if (typeof showNotification === 'function') {
            showNotification('Errore nella creazione del report demo', 'error');
        }
        return false;
    }
}





/////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
///////////////////////SEZIONE REPORTS//////////////////////////////////////
////////////////////////////////////////////////////////////////////////////



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




// Funzioni per la sezione Reports

const reportDisplayTimes = {};

// Carica e visualizza i report disponibili
// MODIFICATO: loadReports con display codice EER
function loadReports() {
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
        reportsContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i><p>Caricamento in corso...</p></div>';
        
        // Carica la lista dei report
        window.electronAPI.getReportsList().then(reportsList => {
            console.log("Report ricevuti:", reportsList);
            
            // Aggiorna conteggio
            if (document.getElementById('reportsCount')) {
                document.getElementById('reportsCount').textContent = reportsList.length || 0;
            }
            
            // Verifica se ci sono report
            if (!reportsList || reportsList.length === 0) {
                console.log("Nessun report trovato");
                if (noReportsMessage) {
                    noReportsMessage.style.display = 'flex';
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
            
            // Ordina dal più recente
            reportsList.sort().reverse().forEach(report => {
                const reportName = report.replace('.json', '');
                
                // MODIFICATO: Estrazione codice EER e metadati
                let codiceEER = extractCodiceEERFromReportName(report);
                let committente = 'Committente Sconosciuto';
                let date;
                if (reportDisplayTimes[report]) {
                    date = reportDisplayTimes[report];
                } else {
                    date = new Date().toLocaleString('it-IT');
                    reportDisplayTimes[report] = date;
                }
                
                // Determina il titolo da mostrare
                let displayTitle;
                if (codiceEER !== 'CODICE_EER_NON_TROVATO' && codiceEER !== 'DEMO') {
                    displayTitle = `${codiceEER} - ${reportName}`;
                } else if (codiceEER === 'DEMO') {
                    displayTitle = `DEMO - ${reportName}`;
                } else {
                    displayTitle = reportName;
                }
                
                html += `
                    <div class="report-card" data-type="json" data-name="${reportName.toLowerCase()}" data-codice-eer="${codiceEER.toLowerCase()}">
                        <div class="report-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <div class="report-info">
                            <h4>${displayTitle}</h4>
                            <p>Generato il: ${date}</p>
                            <p>Tipo: JSON</p>
                            <div class="report-actions">
                                <button class="action-btn" onclick="previewReport('${report}')" title="Anteprima">
                                    <i class="fas fa-eye"></i>
                                    <span>Anteprima</span>
                                </button>
                               <button class="action-btn" onclick="exportReport('${report}', 'word')" title="Esporta Word">
                                    <i class="fas fa-file-word"></i>
                                    <span>Word</span>
                                </button>
                                <button class="action-btn" onclick="openNotes('${report}')" title="Note">
                                    <i class="fas fa-sticky-note"></i>
                                    <span>Note</span>
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
            
            // Aggiorna gli indicatori delle note dopo aver caricato i report
            updateNotesIndicators();

            // Inizializza i filtri
            setupReportFilters();
            
            // Log di completamento
            console.log("Reports caricati:", reportsList.length);
            showNotification(`Caricati ${reportsList.length} report`);
            
        }).catch(error => {
            console.error('Errore nel caricamento dei report:', error);
            reportsContainer.innerHTML = `
                <div style="text-align:center;padding:2rem;color:red;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:1rem;"></i>
                    <p>Errore nel caricamento dei report: ${error.message}</p>
                    <p>Controlla la console per maggiori dettagli.</p>
                </div>
            `;
            showNotification('Errore nel caricamento dei report: ' + error.message, 'error');
        });
        
    } catch (error) {
        console.error('Errore dettagliato nel caricamento dei report:', error);
        showNotification('Errore nel caricamento dei report: ' + error.message, 'error');
    }
}

// Funzione per inizializzare i filtri e la ricerca dei report
// MODIFICATO: setupReportFilters con supporto ricerca codice EER
function setupReportFilters() {
    const searchInput = document.getElementById('reportSearchInput');
    const formatFilter = document.getElementById('reportFormatFilter');
    
    if (!searchInput || !formatFilter) {
        console.error("Elementi per il filtro dei report non trovati");
        return;
    }
    
    // Funzione per applicare i filtri
    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const formatValue = formatFilter.value;
        
        let visibleCount = 0;
        
        // MODIFICATO: Filtro per ricerca che include codice EER
        document.querySelectorAll('.report-card').forEach(card => {
            const reportName = card.getAttribute('data-name') || card.querySelector('h4')?.textContent.toLowerCase() || '';
            const codiceEER = card.getAttribute('data-codice-eer') || ''; // NUOVO
            const reportType = card.getAttribute('data-type') || '';
            
            // NUOVO: Ricerca sia nel nome che nel codice EER
            const matchesSearch = searchTerm === '' || 
                                 reportName.includes(searchTerm) || 
                                 codiceEER.includes(searchTerm);
            const matchesFormat = formatValue === 'all' || reportType === formatValue;
            
            if (matchesSearch && matchesFormat) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Mostra messaggio se non ci sono risultati
        const noResultsMessage = document.querySelector('.no-reports-message');
        
        if (noResultsMessage) {
            if (visibleCount === 0) {
                if (document.querySelectorAll('.report-card').length > 0) {
                    // Ci sono report ma nessuno corrisponde ai filtri
                    noResultsMessage.style.display = 'flex';
                    noResultsMessage.innerHTML = `
                        <i class="fas fa-search"></i>
                        <p>Nessun report corrisponde ai criteri di ricerca</p>
                        <button class="btn btn-primary" onclick="resetReportFilters()">
                            Azzera filtri
                        </button>
                    `;
                } else {
                    // Non ci sono proprio report
                    noResultsMessage.style.display = 'flex';
                    noResultsMessage.innerHTML = `
                        <i class="fas fa-folder-open"></i>
                        <p>Nessun Report Disponibile</p>
                        <p>I report generati appariranno qui.</p>
                    `;
                }
            } else {
                noResultsMessage.style.display = 'none';
            }
        }
    };
    
    // Aggiungi event listeners
    searchInput.addEventListener('input', applyFilters);
    formatFilter.addEventListener('change', applyFilters);
    
    // Funzione per resettare i filtri
    window.resetReportFilters = function() {
        if (searchInput) searchInput.value = '';
        if (formatFilter) formatFilter.value = 'all';
        applyFilters();
    };
    
    // Applica i filtri all'inizio per gestire l'URL con parametri
    applyFilters();
}

window.resetReportFilters = function() {
    if (document.getElementById('reportSearchInput')) {
        document.getElementById('reportSearchInput').value = '';
    }
    if (document.getElementById('reportFormatFilter')) {
        document.getElementById('reportFormatFilter').value = 'all';
    }
    filterReports('', 'all');
};

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

// Funzione per recuperare il codice CAS dal database
async function getCASFromDatabase(nomeSostanza) {
    try {
        // Prima cerca nelle sostanze
        const resultSostanze = await window.electronAPI.querySQLite(
            'SELECT CAS FROM sostanze WHERE Nome = ?',
            [nomeSostanza]
        );
        
        if (resultSostanze.success && resultSostanze.data && resultSostanze.data.length > 0) {
            return resultSostanze.data[0].CAS;
        }
        
        // Se non trovato nelle sostanze, cerca nei sali
        const resultSali = await window.electronAPI.querySQLite(
            'SELECT CAS FROM sali WHERE Sali = ?',
            [nomeSostanza]
        );
        
        if (resultSali.success && resultSali.data && resultSali.data.length > 0) {
            return resultSali.data[0].CAS;
        }
        
        // Se non trovato in nessuna tabella, prova con una ricerca più flessibile
        const resultFlexSostanze = await window.electronAPI.querySQLite(
            'SELECT CAS FROM sostanze WHERE Nome LIKE ?',
            [`%${nomeSostanza}%`]
        );
        
        if (resultFlexSostanze.success && resultFlexSostanze.data && resultFlexSostanze.data.length > 0) {
            return resultFlexSostanze.data[0].CAS;
        }
        
        const resultFlexSali = await window.electronAPI.querySQLite(
            'SELECT CAS FROM sali WHERE Sali LIKE ?',
            [`%${nomeSostanza}%`]
        );
        
        if (resultFlexSali.success && resultFlexSali.data && resultFlexSali.data.length > 0) {
            return resultFlexSali.data[0].CAS;
        }
        
        return 'N/A'; // Se non trovato in nessuna tabella
        
    } catch (error) {
        console.error('Errore nel recupero CAS dal database:', error);
        return 'N/A';
    }
}

// Funzione per recuperare le Hazard Class dal database
async function getHazardClassFromDatabase(cas, nomeSostanza) {
    try {
        let hazardData = [];
        
        // Prima cerca per CAS nella tabella "frasi H"
        if (cas && cas !== 'N/A') {
            const resultByCAS = await window.electronAPI.querySQLite(
                'SELECT Hazard_Statement, Hazard_Class_and_Category FROM "frasi H" WHERE CAS = ?',
                [cas]
            );
            
            if (resultByCAS.success && resultByCAS.data && resultByCAS.data.length > 0) {
                hazardData = resultByCAS.data;
            }
        }
        
        // Se non trovato per CAS, cerca per nome sostanza
        if (hazardData.length === 0 && nomeSostanza) {
            const resultByName = await window.electronAPI.querySQLite(
                'SELECT Hazard_Statement, Hazard_Class_and_Category FROM "frasi H" WHERE Nome_sostanza = ?',
                [nomeSostanza]
            );
            
            if (resultByName.success && resultByName.data && resultByName.data.length > 0) {
                hazardData = resultByName.data;
            }
        }
        
        // Se ancora non trovato, cerca per nome sostanza con ricerca flessibile
        if (hazardData.length === 0 && nomeSostanza) {
            const resultFlexName = await window.electronAPI.querySQLite(
                'SELECT Hazard_Statement, Hazard_Class_and_Category FROM "frasi H" WHERE Nome_sostanza LIKE ?',
                [`%${nomeSostanza}%`]
            );
            
            if (resultFlexName.success && resultFlexName.data && resultFlexName.data.length > 0) {
                hazardData = resultFlexName.data;
            }
        }
        
        // Organizza i dati in un formato utilizzabile
        const hazardMap = {};
        hazardData.forEach(item => {
            const hazardStatement = item.Hazard_Statement;
            const hazardClass = item.Hazard_Class_and_Category || 'N/A';
            
            if (hazardStatement) {
                hazardMap[hazardStatement] = hazardClass;
            }
        });
        
        return hazardMap;
        
    } catch (error) {
        console.error('Errore nel recupero Hazard Class dal database:', error);
        return {};
    }
}

// Funzione per formattare le frasi H con le hazard class
function formatHazardWithClass(frasiHString, hazardMap) {
    if (!frasiHString || frasiHString === 'N/A') {
        return 'N/A';
    }
    
    // Separa le frasi H
    const frasi = frasiHString.split(',').map(f => f.trim()).filter(f => f);
    
    // Formatta ogni frase con la sua hazard class
    const formattedFrasi = frasi.map(frase => {
        const hazardClass = hazardMap[frase] || 'N/A';
        return `${hazardClass} - ${frase}`;
    });
    
    // Unisce con virgola e a capo
    return formattedFrasi.join(',<br>');
}

// Funzione previewReport modificata per includere le Hazard Class
async function previewReport(reportName) {
    try {
        // Carica i dati del report
        const reportData = await window.electronAPI.loadReport(reportName);
        if (!reportData) {
            showNotification('Errore nel caricamento del report', 'error');
            return;
        }
        
        console.log('Dati report caricati:', reportData);
        
        // Ottieni il container di anteprima
        const previewDialog = document.getElementById('reportPreviewDialog');
        const previewContent = document.getElementById('reportPreviewContent');
        
        if (!previewDialog || !previewContent) {
            showNotification('Componenti di anteprima non trovati', 'error');
            return;
        }
        
        // Estrai correttamente i dati dalla struttura del report
        let dataToDisplay = [];
        let metadata = null;
        
        if (reportData.risultati_classificazione && Array.isArray(reportData.risultati_classificazione)) {
            dataToDisplay = reportData.risultati_classificazione;
            metadata = reportData._metadata || null;
        } else if (Array.isArray(reportData)) {
            dataToDisplay = reportData;
        } else {
            console.warn('Struttura dati report non riconosciuta:', reportData);
        }
        
        // NUOVO: Recupera i CAS dal database e le Hazard Class
        for (let i = 0; i < dataToDisplay.length; i++) {
            const record = dataToDisplay[i];
            const nomeSostanza = record.Sostanza;
            let cas = record.CAS;
            
            // Recupera CAS se mancante
            if (cas === 'N/A' || !cas) {
                if (nomeSostanza) {
                    const casFromDB = await getCASFromDatabase(nomeSostanza);
                    if (casFromDB !== 'N/A') {
                        cas = casFromDB;
                        dataToDisplay[i].CAS = casFromDB;
                        console.log(`CAS recuperato per ${nomeSostanza}: ${casFromDB}`);
                    }
                }
            }
            
            // Recupera Hazard Class SOLO per le frasi H effettivamente rilevate
            const frasiHOriginali = record['Frasi H'];
            const caratteristicheHP = record['Caratteristiche HP'];
            
            // Processa solo se ci sono frasi H rilevate E caratteristiche HP assegnate
            if (frasiHOriginali && frasiHOriginali !== 'N/A' && 
                caratteristicheHP && caratteristicheHP !== 'N/A' && 
                !caratteristicheHP.toLowerCase().includes('nessuna')) {
                
                const hazardMap = await getHazardClassFromDatabase(cas, nomeSostanza);
                const frasiHFormatted = formatHazardWithClass(frasiHOriginali, hazardMap);
                dataToDisplay[i]['Codici e Categoria Pericolo'] = frasiHFormatted;
                // Rimuovi la vecchia colonna
                delete dataToDisplay[i]['Frasi H'];
            } else {
                // Se non ci sono frasi H rilevate o nessuna caratteristica HP, mostra N/A
                dataToDisplay[i]['Codici e Categoria Pericolo'] = 'N/A';
                delete dataToDisplay[i]['Frasi H'];
            }
        }
        
        // Informazioni base del report
        const reportInfo = {
            name: reportName.replace('.json', ''),
            date: new Date().toLocaleString('it-IT'),
            recordCount: dataToDisplay.length,
            committente: metadata?.committente || 'Non specificato',
            codiceEER: metadata?.infoCertificato?.codiceEER || metadata?.codiceEER || 'N/A',
            numeroCampionamento: metadata?.infoCertificato?.numeroCampionamento || metadata?.numeroCampionamento || 'N/A'
        };
        
        // Genera HTML per l'anteprima ottimizzata (struttura originale)
        let contentHtml = `
            <div class="optimized-preview-header">
                <div class="preview-metadata-section">
                    <div class="preview-meta-info">
                        <span class="preview-date">
                            <i class="fas fa-calendar-alt"></i>
                            ${reportInfo.date}
                        </span>
                        <span class="preview-records">
                            <i class="fas fa-database"></i>
                            ${reportInfo.recordCount} record
                        </span>
                    </div>
                </div>
                <div class="preview-info-cards">
                    <div class="info-card">
                        <div class="info-label">Committente</div>
                        <div class="info-value">${reportInfo.committente}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Codice EER</div>
                        <div class="info-value">${reportInfo.codiceEER}</div>
                    </div>
                    ${reportInfo.numeroCampionamento !== 'N/A' ? `
                    <div class="info-card">
                        <div class="info-label">N° Campionamento</div>
                        <div class="info-value">${reportInfo.numeroCampionamento}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="optimized-preview-content">
        `;
        
        // Genera la tabella se ci sono dati (logica originale mantenuta)
        if (dataToDisplay.length > 0) {
            const headers = Object.keys(dataToDisplay[0]);
            
            contentHtml += `
                <div class="optimized-table-wrapper">
                    <table class="optimized-preview-table">
                        <thead>
                            <tr>
            `;
            
            // Aggiungi intestazioni con icone (logica originale)
            headers.forEach(header => {
                let icon = 'fas fa-tag';
                if (header.toLowerCase().includes('concentrazione')) icon = 'fas fa-flask';
                if (header.toLowerCase().includes('sostanza')) icon = 'fas fa-atom';
                if (header.toLowerCase().includes('frasi') || header.toLowerCase().includes('codici')) icon = 'fas fa-exclamation-triangle';
                if (header.toLowerCase().includes('caratteristiche')) icon = 'fas fa-shield-alt';
                if (header.toLowerCase().includes('hp')) icon = 'fas fa-shield-alt';
                if (header.toLowerCase().includes('ppm')) icon = 'fas fa-tint';
                if (header.toLowerCase().includes('%')) icon = 'fas fa-percentage';
                if (header.toLowerCase().includes('cas')) icon = 'fas fa-barcode';
                if (header.toLowerCase().includes('categoria')) icon = 'fas fa-tags';
                
                contentHtml += `
                    <th>
                        <i class="${icon}"></i>
                        <span>${header}</span>
                    </th>
                `;
            });
            
            contentHtml += `
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Aggiungi righe con formattazione speciale
            dataToDisplay.forEach((row, index) => {
                contentHtml += '<tr>';
                headers.forEach(header => {
                    let cellValue = row[header] !== undefined ? String(row[header]) : '';
                    let displayValue = cellValue;
                    
                    // Formattazione speciale per concentrazioni
                    if (header.toLowerCase().includes('concentrazione') && !isNaN(cellValue)) {
                        displayValue = parseFloat(cellValue).toFixed(3);
                    }
                    
                    contentHtml += `
                        <td class="data-cell" data-full-text="${cellValue}">
                            ${displayValue}
                        </td>
                    `;
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
                <div class="no-data-preview">
                    <i class="fas fa-inbox"></i>
                    <h4>Nessun dato disponibile</h4>
                    <p>Il report non contiene dati di classificazione.</p>
                </div>
            `;
        }
        
        contentHtml += `</div>`;
        
        // Aggiorna il contenuto e mostra il dialog
        previewContent.innerHTML = contentHtml;
        previewDialog.style.display = 'flex';

        // Aggiungi il comportamento al bottone Export Word
        document.getElementById('exportPreviewWordBtn').onclick = function() {
            exportReport(reportName, 'word');
        };
        
        // Aggiungi event listener per il tooltip al volo
        const dataCells = previewContent.querySelectorAll('.data-cell');
        dataCells.forEach(cell => {
            const fullText = cell.getAttribute('data-full-text');
            if (fullText && fullText.length > 35) {
                cell.title = fullText;
                cell.style.cursor = 'help';
            }
        });
        
    } catch (error) {
        console.error('Errore nella visualizzazione dell\'anteprima:', error);
        showNotification('Errore nella visualizzazione dell\'anteprima del report', 'error');
    }
}

// Variabile per tenere traccia del report corrente nell'anteprima
let currentPreviewReport = null;



// Funzione migliorata per esportare report
// Sostituisci la funzione exportReport esistente con questa versione corretta:

async function exportReport(reportName, format) {
    try {
        // Notifica inizio esportazione
        showNotification(`Esportazione in ${format.toUpperCase()} in corso...`, 'info');
        
        // Carica dati report
        const reportData = await window.electronAPI.loadReport(reportName);
        if (!reportData) {
            throw new Error('Errore nel caricamento del report');
        }
        
        // CORREZIONE: Elabora i dati per l'esportazione Word come nell'anteprima
        let processedReportData = reportData;
        
        if (format === 'word') {
            processedReportData = await processReportDataForExport(reportData);
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
                        
                        const shouldOpen = confirm("Esportazione completata. Vuoi aprire il file?");
                        if (shouldOpen) {
                            await window.electronAPI.openExternal(pdfPath);
                        }
                    } else {
                        throw new Error('Errore nell\'esportazione PDF');
                    }
                }
                break;

            case 'word':
                const wordPath = await window.electronAPI.saveFile({
                    title: 'Salva report Word',
                    defaultPath: `${outputName}.docx`,
                    filters: [
                        { name: 'Word Files', extensions: ['docx'] }
                    ]
                });
                
                if (wordPath) {
                    try {
                        console.log('Inizio esportazione Word:', wordPath);
                        // USA I DATI ELABORATI invece di quelli originali
                        const result = await window.electronAPI.exportReportWord(processedReportData, wordPath);
                        
                        console.log('Risultato esportazione:', result);
                        
                        if (result.success) {
                            showNotification('Report esportato in formato Word');
                            addActivity('Report esportato', `${outputName}.docx`, 'fas fa-file-word');

                            const shouldOpen = confirm("Esportazione completata. Vuoi aprire il file?");
                            if (shouldOpen) {
                                await window.electronAPI.openExternal(wordPath);
                            }
                        } else {
                            let errorMsg = result.error || 'Errore sconosciuto';
                            
                            if (result.stderr) {
                                errorMsg += `\nDettagli Python: ${result.stderr}`;
                            }
                            
                            if (result.details) {
                                errorMsg += `\nDettagli: ${result.details}`;
                            }
                            
                            console.error('Errore dettagliato esportazione Word:', {
                                error: result.error,
                                details: result.details,
                                output: result.output,
                                stderr: result.stderr
                            });
                            
                            if (errorMsg.includes('python-docx')) {
                                errorMsg += '\n\nSoluzione: Installa python-docx con: pip install python-docx';
                            } else if (errorMsg.includes('No such file')) {
                                errorMsg += '\n\nVerifica che lo script export_word.py sia presente nella cartella app/';
                            } else if (errorMsg.includes('Permission denied')) {
                                errorMsg += '\n\nVerifica i permessi di scrittura nella cartella di destinazione';
                            }
                            
                            throw new Error(errorMsg);
                        }
                    } catch (error) {
                        console.error('Errore catch esportazione Word:', error);
                        
                        const errorDialog = document.createElement('div');
                        errorDialog.innerHTML = `
                            <div style="
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: rgba(0,0,0,0.5);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                z-index: 10000;
                            ">
                                <div style="
                                    background: white;
                                    padding: 2rem;
                                    border-radius: 8px;
                                    max-width: 600px;
                                    max-height: 400px;
                                    overflow-y: auto;
                                ">
                                    <h3 style="color: #e74c3c; margin-bottom: 1rem;">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        Errore Esportazione Word
                                    </h3>
                                    <pre style="
                                        background: #f8f9fa;
                                        padding: 1rem;
                                        border-radius: 4px;
                                        font-size: 0.9rem;
                                        white-space: pre-wrap;
                                        word-wrap: break-word;
                                    ">${error.message}</pre>
                                    <div style="text-align: right; margin-top: 1rem;">
                                        <button onclick="this.closest('div').parentElement.remove()" 
                                                style="
                                                    background: #3498db;
                                                    color: white;
                                                    border: none;
                                                    padding: 0.5rem 1rem;
                                                    border-radius: 4px;
                                                    cursor: pointer;
                                                ">
                                            Chiudi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(errorDialog);
                        
                        showNotification(`Errore nell'esportazione Word`, 'error');
                    }
                }
                break;
        }
    } catch (error) {
        console.error(`Errore nell'esportazione del report in formato ${format}:`, error);
        showNotification(`Errore nell'esportazione: ${error.message}`, 'error');
    }
}

// NUOVA FUNZIONE: Elabora i dati del report per l'esportazione (stessa logica dell'anteprima)
async function processReportDataForExport(reportData) {
    try {
        console.log('Elaborazione dati per esportazione Word...');
        
        // Estrai correttamente i dati dalla struttura del report
        let dataToDisplay = [];
        let metadata = null;
        
        if (reportData.risultati_classificazione && Array.isArray(reportData.risultati_classificazione)) {
            dataToDisplay = reportData.risultati_classificazione;
            metadata = reportData._metadata || null;
        } else if (Array.isArray(reportData)) {
            dataToDisplay = reportData;
        } else {
            console.warn('Struttura dati report non riconosciuta:', reportData);
            return reportData; // Ritorna i dati originali se non riconosciuti
        }
        
        // Elabora ogni record aggiungendo le Hazard Class come nell'anteprima
        for (let i = 0; i < dataToDisplay.length; i++) {
            const record = dataToDisplay[i];
            const nomeSostanza = record.Sostanza;
            let cas = record.CAS;
            
            // Recupera CAS se mancante
            if ((cas === 'N/A' || !cas) && nomeSostanza) {
                const casFromDB = await getCASFromDatabase(nomeSostanza);
                if (casFromDB !== 'N/A') {
                    cas = casFromDB;
                    dataToDisplay[i].CAS = casFromDB;
                    console.log(`CAS recuperato per ${nomeSostanza}: ${casFromDB}`);
                }
            }
            
            // Recupera Hazard Class per le frasi H
            if (nomeSostanza) {
                const hazardMap = await getHazardClassFromDatabase(cas, nomeSostanza);
                
                // Modifica il campo delle frasi H per includere hazard class
                const frasiHOriginali = record['Frasi H'];
                if (frasiHOriginali && frasiHOriginali !== 'N/A') {
                    const frasiHFormatted = formatHazardWithClass(frasiHOriginali, hazardMap);
                    dataToDisplay[i]['Codici e Categoria Pericolo'] = frasiHFormatted;
                    // Rimuovi la vecchia colonna Frasi H
                    delete dataToDisplay[i]['Frasi H'];
                }
                
                // Rinomina le colonne per corrispondere all'anteprima
                if (record['Concentrazione (ppm)'] !== undefined) {
                    dataToDisplay[i]['Conc. (ppm)'] = record['Concentrazione (ppm)'];
                    delete dataToDisplay[i]['Concentrazione (ppm)'];
                }
                
                if (record['Concentrazione (%)'] !== undefined) {
                    dataToDisplay[i]['Conc. (%)'] = record['Concentrazione (%)'];
                    delete dataToDisplay[i]['Concentrazione (%)'];
                }
            }
        }
        
        // Ricostruisci la struttura del report con i dati elaborati
        const processedData = {
            risultati_classificazione: dataToDisplay,
            _metadata: metadata,
            timestamp_elaborazione: new Date().toISOString()
        };
        
        console.log('Dati elaborati per esportazione:', processedData);
        return processedData;
        
    } catch (error) {
        console.error('Errore nell\'elaborazione dei dati per esportazione:', error);
        return reportData; // Ritorna i dati originali in caso di errore
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

// Estendi la funzione initEventListenersReports per includere i nuovi listeners
function initEventListenersReports() {
    // Event listener per il cambio di sezione
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            // Controlla se si sta navigando alla sezione report
            if (this.getAttribute('data-section') === 'report') {
                // Carica i report quando si naviga alla sezione
                setTimeout(() => {
                    loadReports();
                    setupReportFilters();
                }, 100);
            }
        });
    });
    
    // Per il caricamento dei report all'avvio della pagina se siamo già nella sezione reports
    if (window.location.hash === '#report') {
        setTimeout(() => {
            loadReports();
            setupReportFilters();
        }, 100);
    }
    
    // Aggiungi gli event listeners specifici per la ricerca e il filtro
    if (document.getElementById('reportSearchInput')) {
        document.getElementById('reportSearchInput').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterReports(searchTerm, document.getElementById('reportFormatFilter').value);
        });
    }
    
    if (document.getElementById('reportFormatFilter')) {
        document.getElementById('reportFormatFilter').addEventListener('change', function() {
            const formatValue = this.value;
            filterReports(document.getElementById('reportSearchInput').value.toLowerCase(), formatValue);
        });
    }

    // Inizializza il sistema di note
    initNotesSystem();
}

// Funzione per filtrare i report
function filterReports(searchTerm, formatValue) {
    let visibleCount = 0;
    
    document.querySelectorAll('.report-card').forEach(card => {
        const reportName = card.getAttribute('data-name') || card.querySelector('h4')?.textContent.toLowerCase() || '';
        const reportType = card.getAttribute('data-type') || '';
        
        const matchesSearch = searchTerm === '' || reportName.includes(searchTerm);
        const matchesFormat = formatValue === 'all' || reportType === formatValue;
        
        if (matchesSearch && matchesFormat) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Mostra messaggio se non ci sono risultati
    const noReportsMessage = document.querySelector('.no-reports-message');
    
    if (noReportsMessage) {
        if (visibleCount === 0) {
            noReportsMessage.style.display = 'flex';
            noReportsMessage.innerHTML = `
                <i class="fas fa-search"></i>
                <p>Nessun report corrisponde ai criteri di ricerca</p>
                <button class="btn btn-primary" onclick="resetReportFilters()">
                    Azzera filtri
                </button>
            `;
        } else {
            noReportsMessage.style.display = 'none';
        }
    }
}


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
       
       // MODIFICATO: Generazione nome report con codice EER
       let reportName;
       const metadati = classificationData.metadati || classificationData.data?._metadata;
       
       if (metadati && metadati.infoCertificato?.codiceEER) {
           // NUOVO: Genera nome basato su codice EER
           const codiceEER = metadati.infoCertificato.codiceEER;
           const dataOraItaliana = generateItalianDateTime();
           reportName = `risultato_classificazione_${codiceEER}_${dataOraItaliana}`;
       } else if (metadati && metadati.infoCertificato?.numeroCampionamento) {
           // Fallback: usa numero campionamento se codice EER mancante
           const numeroCampionamento = metadati.infoCertificato.numeroCampionamento;
           const dataOraItaliana = generateItalianDateTime();
           reportName = `risultato_classificazione_${numeroCampionamento}_${dataOraItaliana}`;
       } else if (metadati && metadati.committente) {
           // Fallback: usa committente se entrambi mancanti
           const committente = metadati.committente.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
           const dataOraItaliana = generateItalianDateTime();
           reportName = `risultato_classificazione_${committente}_${dataOraItaliana}`;
       } else {
           // Fallback finale
           const dataOraItaliana = generateItalianDateTime();
           reportName = `risultato_classificazione_GENERICO_${dataOraItaliana}`;
       }
       
       // Prepara i dati per il report INCLUDENDO i metadati
       const reportData = {
           // NUOVO: Metadati per aggregazione futura
           _metadata: metadati || {
               committente: 'Committente Sconosciuto',
               dataCampionamento: new Date().toISOString().split('T')[0],
               timestampClassificazione: new Date().toISOString()
           },
           
           // Dati di classificazione esistenti
           risultati_classificazione: [],
           caratteristiche_pericolo: classificationData.caratteristiche_pericolo || [],
           timestamp_elaborazione: new Date().toISOString()
       };
       
       // Se i dati provengono dal classificatore, estraili correttamente
        if (classificationData.data && classificationData.data.campione) {
            const campione = classificationData.data.campione;
            const hp = classificationData.data.caratteristiche_pericolo || [];
            
            // Crea un oggetto riassuntivo per ogni sostanza
            for (const [sostanza, info] of Object.entries(campione)) {
                reportData.risultati_classificazione.push({
                    'Sostanza': sostanza,
                    'Conc. (ppm)': info.concentrazione_ppm || 0,
                    'Conc. (%)': info.concentrazione_percentuale || 0,
                    'Frasi H': info.frasi_h ? info.frasi_h.join(', ') : 'N/A',
                    'Caratteristiche HP': generateHPWithReasons(info, hp, classificationData.data.motivazioni_hp || {}),
                    'CAS': info.cas || 'N/A',
                    'Motivo HP': info.motivi_hp ? info.motivi_hp.join('; ') : ''
                });
            }
           
           // Aggiungi una riga con il risultato complessivo
           reportData.risultati_classificazione.push({
                'Sostanza': '** RISULTATO TOTALE **',
                'Conc. (ppm)': '',
                'Conc. (%)': '',
                'Frasi H': '',
                'Caratteristiche HP': hp.join(', ') || 'Nessuna caratteristica di pericolo',
                'CAS': '',
                'Motivo HP': ''
         });

       } else if (Array.isArray(classificationData)) {
           // Se i dati sono già in formato tabellare, usali direttamente
           reportData.risultati_classificazione.push(...classificationData);
       }
       
       // Usa l'API dedicata per salvare il report
       const saveResult = await window.electronAPI.saveReport(`${reportName}.json`, reportData);
       
       if (!saveResult) {
           throw new Error('Errore nel salvataggio del report');
       }
       
       console.log(`Report "${reportName}" salvato con metadati:`, metadati);
       showNotification(`Report "${reportName}" generato con successo!`);
       
       // Aggiorna la visualizzazione dei report
       if (typeof loadReports === 'function') {
           setTimeout(() => {
               loadReports();
           }, 500);
       }
       
       return reportName;
   } catch (error) {
       console.error('Errore nella generazione del report:', error);
       showNotification('Errore nella generazione del report: ' + error.message, 'error');
       return null;
   }
}

    
    // Crea un report demo per testare
    document.getElementById('createDemoReportBtn').addEventListener('click', async function() {
        try {
            // Crea dati demo
            const demoData = [
                {
                    "Sostanza": "Rame",
                    "Conc. (ppm)": 250,
                    "Frasi H": "H400, H410",
                    "Caratteristiche HP": "HP14",
                    "CAS": "7440-50-8"
                },
                {
                    "Sostanza": "Piombo",
                    "Conc. (ppm)": 150,
                    "Frasi H": "H360, H373",
                    "Caratteristiche HP": "HP10, HP5",
                    "CAS": "7439-92-1"
                },
                {
                    "Sostanza": "Zinco",
                    "Conc. (ppm)": 350,
                    "Frasi H": "H400, H410",
                    "Caratteristiche HP": "HP14",
                    "CAS": "7440-66-6"
                },
                {
                    "Sostanza": "** RISULTATO TOTALE **",
                    "Conc. (ppm)": "",
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


// Funzioni per gestire le note dei report
function openNotes(reportName) {
    try {
        // Imposta il nome del report corrente
        document.getElementById('currentReportName').value = reportName;
        
        // Recupera le note salvate per questo report
        const reportNotes = localStorage.getItem(`notes_${reportName}`) || '';
        
        // Imposta il valore del textarea
        document.getElementById('reportNotes').value = reportNotes;
        
        // Mostra il dialog
        document.getElementById('notesDialog').style.display = 'flex';
        
        // Focus sul textarea
        setTimeout(() => {
            document.getElementById('reportNotes').focus();
        }, 300);
    } catch (error) {
        console.error('Errore nell\'apertura delle note:', error);
        showNotification('Errore nell\'apertura delle note: ' + error.message, 'error');
    }
}

function saveNotes() {
    try {
        // Ottieni il nome del report e il testo delle note
        const reportName = document.getElementById('currentReportName').value;
        const notes = document.getElementById('reportNotes').value;
        
        if (!reportName) {
            throw new Error('Nome report non valido');
        }
        
        // Salva le note nel localStorage
        localStorage.setItem(`notes_${reportName}`, notes);
        
        // Aggiorna l'UI per mostrare quali report hanno note
        updateNotesIndicators();
        
        // Chiudi il dialog
        document.getElementById('notesDialog').style.display = 'none';
        
        // Notifica all'utente
        showNotification('Note salvate con successo', 'success');
    } catch (error) {
        console.error('Errore nel salvataggio delle note:', error);
        showNotification('Errore nel salvataggio delle note: ' + error.message, 'error');
    }
}

function updateNotesIndicators() {
    // Aggiorna gli indicatori visivi per i report con note
    document.querySelectorAll('.report-card').forEach(card => {
        const reportName = card.getAttribute('data-name') + '.json';
        const hasNotes = localStorage.getItem(`notes_${reportName}`) && 
                         localStorage.getItem(`notes_${reportName}`).trim() !== '';
        
        if (hasNotes) {
            card.classList.add('has-notes');
        } else {
            card.classList.remove('has-notes');
        }
    });
}


// Funzioni per gestire le note preimpostate
// Funzioni per gestire le note preimpostate
let presetNotes = []; // Array per memorizzare le note preimpostate

// Note preimpostate di default con i contenuti dall'allegato
const DEFAULT_PRESET_NOTES = [
    // === TIPO: GENERICA ===
    {
        id: 1,
        title: "NOTA ACCREDIA RIFIUTI – CAMPIONAMENTO SEA",
        type: "GENERICA",
        content: `TIPO NOTA: GENERICA
NOTA ACCREDIA RIFIUTI – CAMPIONAMENTO SEA
Il rifiuto, il cui campione è oggetto di analisi, è stato classificato dal Produttore/Detentore, in base all'origine/provenienza con il CODICE EER in testa al certificato, ai sensi del D.Lgs. n. 152/06 (All. D parte IV)
Per le informazioni fornite dal cliente (descrizione campione, data, ora e luogo di campionamento, scopo delle analisi e codice EER) il Laboratorio declina ogni responsabilità. 
Il prelievo, eseguito a cura del personale dipendente SEA soprariportato, è escluso dall'accreditamento. I metodi di campionamento non sono accreditati ACCREDIA.
Nel caso di determinazioni di residui/tracce, qualora la procedura analitica preveda concentrazione e/o purificazione degli analiti, ove non espressamente indicato, il recupero è da intendersi compreso all' interno dei limiti di accettabilità del Laboratorio, che rientra nell'intervallo 70-130% o secondo quanto indicato dallo specifico metodo di prova o dalla normativa vigente. Se non espressamente indicato il recupero non è stato utilizzato nei calcoli.
LEGENDA: Mod. Campionam. = modalità di campionamento, Verb. Campionam.= verbale di campionamento
Allegati presenti: Caratterizzazione del rifiuto - Allegato al Rapporto di prova N°
REGOLA DECISIONALE:
Il laboratorio SEA SRLS in accordo con il cliente decide di non considerare il contributo dell'incertezza per il confronto del risultato sperimentale con il valore limite di riferimento. Questo approccio implica che, nel caso di un risultato di una prova corrispondente al valore limite di specifica, il livello di probabilità che la decisione sia corretta o errata è lo stesso, e corrisponde al 50% (a meno che il valore limite non includa già una tolleranza corrispondente all'incertezza).`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 2,
        title: "NOTA ACCREDIA RIFIUTI – CAMPIONAMENTO COMMITTENTE",
        type: "GENERICA",
        content: `NOTA ACCREDIA RIFIUTI – CAMPIONAMENTO COMMITTENTE

Il rifiuto, il cui campione è oggetto di analisi, è stato classificato dal Produttore/Detentore, in base all'origine/provenienza con il CODICE EER in testa al certificato, ai sensi del D.Lgs. n. 152/06 (All. D parte IV)
Per le informazioni fornite dal cliente (descrizione campione, data, ora e luogo di campionamento, scopo delle analisi e codice EER) il Laboratorio declina ogni responsabilità. 
Il Laboratorio SEA SRLS non è responsabile del campionamento: i risultati si riferiscono al campione così come ricevuto.
Nel caso di determinazioni di residui/tracce, qualora la procedura analitica preveda concentrazione e/o purificazione degli analiti, ove non espressamente indicato, il recupero è da intendersi compreso all' interno dei limiti di accettabilità del Laboratorio, che rientra nell'intervallo 70-130% o secondo quanto indicato dallo specifico metodo di prova o dalla normativa vigente. Se non espressamente indicato il recupero non è stato utilizzato nei calcoli.
LEGENDA: Mod. Campionam. = modalità di campionamento, Verb. Campionam.= verbale di campionamento
Allegati presenti: Caratterizzazione del rifiuto - Allegato al Rapporto di prova N°
REGOLA DECISIONALE:
Il laboratorio SEA SRLS in accordo con il cliente decide di non considerare il contributo dell'incertezza per il confronto del risultato sperimentale con il valore limite di riferimento. Questo approccio implica che, nel caso di un risultato di una prova corrispondente al valore limite di specifica, il livello di probabilità che la decisione sia corretta o errata è lo stesso, e corrisponde al 50% (a meno che il valore limite non includa già una tolleranza corrispondente all'incertezza).`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 3,
        title: "MOLP-DC AMIANTO",
        type: "GENERICA",
        content: `MOLP-DC AMIANTO
Per le informazioni fornite dal cliente (descrizione campione, data, luogo di campionamento e codice EER) il Laboratorio declina ogni responsabilità. 
Il Laboratorio SEA SRLS non è responsabile del campionamento: i risultati si riferiscono al campione così come ricevuto. 
Il rifiuto, il cui campione è oggetto di analisi, è stato classificato dal Produttore/Detentore, in base all'origine/provenienza con il CODICE EER in testa al certificato, ai sensi del D.Lgs. n. 152/06 (All. D parte IV)
Limite di rilevabilità LOD = 1%`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 4,
        title: "AMIANTO C.T.R. PERICOLOSO",
        type: "GENERICA",
        content: `AMIANTO C.T.R. PERICOLOSO
Il rifiuto, il cui campione è oggetto di analisi, è stato classificato dal Produttore/Detentore, in base all'origine/provenienza con il CODICE EER in testa al certificato, ai sensi del D.Lgs. n. 152/06 (All. D parte IV)
Per le informazioni fornite dal cliente (descrizione campione, data, ora, luogo di campionamento e codice EER) il Laboratorio declina ogni responsabilità.
Il prelievo, eseguito a cura del personale dipendente SEA sopraindicato, è escluso dall'accreditamento. I metodi di campionamento non sono accreditati ACCREDIA.
Il Laboratorio SEA SRLS non è responsabile del campionamento: i risultati si riferiscono al campione così come ricevuto.
Note:
L'analisi dell'amianto è stata eseguita presso un laboratorio esterno
Concentrazione totale delle fibre di amianto rilevate in DRX: 10,5 %
L'analisi rileva la presenza di amianto di tipo crisotilo`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 5,
        title: "AMIANTO C.T.R. NON PERICOLOSO",
        type: "GENERICA",
        content: `AMIANTO C.T.R. NON PERICOLOSO
Il rifiuto, il cui campione è oggetto di analisi, è stato classificato dal Produttore/Detentore, in base all'origine/provenienza con il CODICE EER in testa al certificato, ai sensi del D.Lgs. n. 152/06 (All. D parte IV)
Per le informazioni fornite dal cliente (descrizione campione, data, ora, luogo di campionamento e codice EER) il Laboratorio declina ogni responsabilità.
Il prelievo, eseguito a cura del personale dipendente SEA sopraindicato, è escluso dall'accreditamento. I metodi di campionamento non sono accreditati ACCREDIA.
Il Laboratorio SEA SRLS non è responsabile del campionamento: i risultati si riferiscono al campione così come ricevuto.
L'analisi dell'amianto è stata eseguita in SEM presso un laboratorio esterno accreditato ACCREDIA N. 0840 L`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    
    // === TIPO: CARATTERIZZAZIONE ===
    {
        id: 6,
        title: "ANALISI CARATTERIZZAZIONE",
        type: "CARATTERIZZAZIONE",
        content: `TIPO NOTA: CARATTERIZZAZIONE
ANALISI CARATTERIZZAZIONE
Il profilo analitico, determinante per la caratterizzazione è stato scelto con il Produttore, sulla base delle informazioni fornite dallo stesso, inerenti al processo chimico e produttivo generatore del rifiuto, ed eventuali schede di sicurezza dei prodotti da cui deriva. 
La presente valutazione si riferisce esclusivamente al campione analizzato, ai test eseguiti e ai parametri analizzati.
Per le informazioni (se disponibili) richieste ai punti 1-2-3-4-9-10 nel Riquadro 2.2 delle Linee Guida SNPA approvate con Decreto Direttoriale 47/2021, si rimanda al Rapporto di Prova di cui la presente valutazione è un allegato.
La classificazione delle sostanze pericolose prese in esame, ove non espressamente dichiarato, è quella riportata nell'elenco armonizzato del CLP.`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 7,
        title: "ANALISI DI RISCHIO",
        type: "CARATTERIZZAZIONE",
        content: `ANALISI DI RISCHIO
Al fine di verificare ogni possibile fonte di rischi relativamente alla composizione del rifiuto è stata eseguita una verifica all' interno dell'Impianto, in particolare nelle aree di stoccaggio rifiuti a seguito delle operazioni che lo hanno generato.
Il rifiuto oggetto della presente caratterizzazione è costituito dal seguente materiale:
Tanto i reperti quanto i cicli di lavoro presentano delle complessità in materia di Rischio Chimico in generale, normalmente gestite secondo i processi interni di prevenzione e protezione che, tuttavia, nel caso specifico non influiscono sulla contaminazione del rifiuto in esame.
Il profilo analitico - merceologico utilizzabile, e le valutazioni per la caratterizzazione sono state scelte con il Produttore, sulla base delle informazioni fornite dallo stesso, inerenti al processo produttivo generatore del rifiuto.
La presente valutazione si riferisce esclusivamente al campione in esame.
Per le informazioni (se disponibili) richieste ai punti 1-2-3-4-9-10 nel Riquadro 2.2 delle Linee Guida SNPA approvate con Decreto Direttoriale 47/2021, si rimanda al Rapporto di Prova di cui la presente valutazione è un allegato.`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    
    // === TIPO: CONCLUSIONI ===
    {
        id: 8,
        title: "NON PERICOLOSO",
        type: "CONCLUSIONI",
        content: `TIPO NOTA: CONCLUSIONI
NON PERICOLOSO
CONCLUSIONI
In considerazione della provenienza, tipologia e ciclo produttivo che lo ha generato, essendo la concentrazione degli eventuali contaminanti inferiore alle concentrazioni limite, ai sensi del Regolamento UE N.1357/2014 del 18/12/2014, della Decisione 2014/955/UE, del Regolamento (CE) n. 1272/2008 come modificato dal Regolamento UE 2016/1179 del 19 luglio 2016 e Sulla base del Regolamento (UE) 2017/997 del 8 giugno 2017, che modifica l'allegato III della direttiva 2008/98/CE del Parlamento europeo e del Consiglio, il rifiuto in esame è classificato come 'NON PERICOLOSO'`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 9,
        title: "PERICOLOSO CAUTELATIVO",
        type: "CONCLUSIONI",
        content: `PERICOLOSO CAUTELATIVO
CONCLUSIONI
In considerazione della provenienza, tipologia e ciclo produttivo che lo ha generato, dalle informazioni e schede di sicurezza fornite dal cliente, ai sensi del Regolamento UE N.1357/2014 del 18/12/2014, della Decisione 2014/955/UE,  del Regolamento (CE) n. 1272/2008 come modificato dal Regolamento UE 2016/1179 del 19 luglio 2016  e Sulla base del Regolamento (UE) 2017/997 del 8 giugno 2017, che modifica l'allegato III della direttiva 2008/98/CE del Parlamento europeo e del Consiglio, il rifiuto in esame è classificato  in via cautelativa come 'PERICOLOSO' in base alle seguenti Caratteristiche di pericolo:`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 10,
        title: "PERICOLOSO",
        type: "CONCLUSIONI",
        content: `PERICOLOSO
CONCLUSIONI
In considerazione della provenienza, tipologia e ciclo produttivo che lo ha generato, essendo la concentrazione degli eventuali contaminanti superiore alle concentrazioni limite, ai sensi del Regolamento UE N.1357/2014 del 18/12/2014, della Decisione 2014/955/UE, del Regolamento (CE) n. 1272/2008 come modificato dal Regolamento UE 2016/1179 del 19 luglio 2016  e Sulla base del Regolamento (UE) 2017/997 del 8 giugno 2017, che modifica l'allegato III della direttiva 2008/98/CE del Parlamento europeo e del Consiglio, il rifiuto in esame è classificato come 'PERICOLOSO' in base alle seguenti Caratteristiche di pericolo:`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 11,
        title: "NON PERICOLOSO ANALISI RISCHIO",
        type: "CONCLUSIONI",
        content: `NON PERICOLOSO ANALISI RISCHIO
CONCLUSIONI
In considerazione della provenienza, tipologia e ciclo produttivo che lo ha generato, dalle informazioni e schede di sicurezza fornite dal cliente, ai sensi del Regolamento UE N.1357/2014 del 18/12/2014, della Decisione 2014/955/UE, del Regolamento (CE) n. 1272/2008 come modificato dal Regolamento UE 2016/1179 del 19 luglio 2016 e Sulla base del Regolamento (UE) 2017/997 del 8 giugno 2017, che modifica l'allegato III della direttiva 2008/98/CE del Parlamento europeo e del Consiglio, il rifiuto in esame è classificato come ' NON PERICOLOSO'`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 12,
        title: "PERICOLOSO FAV",
        type: "CONCLUSIONI",
        content: `PERICOLOSO FAV
CONCLUSIONI
In considerazione della provenienza, tipologia e ciclo produttivo che lo ha generato, essendo la concentrazione degli eventuali contaminanti superiore alle concentrazioni limite, ai sensi del Regolamento UE N.1357/2014 del 18/12/2014, della Decisione 2014/955/UE, del Regolamento (CE) n. 1272/2008 come modificato dal Regolamento UE 2016/1179 del 19 luglio 2016 e Sulla base del Regolamento (UE) 2017/997 del 8 giugno 2017, che modifica l'allegato III della direttiva 2008/98/CE del Parlamento europeo e del Consiglio, e sulla base del Regolamento (CE) n. 1272/2008 come modificato dal regolamento UE 2016/1179 del 19 luglio 2016 secondo i criteri CLP (Classificazione ed etichettatura armonizzata delle FAV) e ai sensi del Regolamento n. 761/2009/CE Met. A.22 + D.M 06/09/94 All. 1 Met. B (G.U. n. 288 10/12/94), considerando i risultati analitici al Rapporto di Prova n. ……., il rifiuto in esame è classificato come 'PERICOLOSO' in base alle seguenti Caratteristiche di pericolo:`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 13,
        title: "PERICOLOSO CAUTELATIVO AGGIUNTIVO",
        type: "CONCLUSIONI",
        content: `PERICOLOSO CAUTELATIVO AGGIUNTIVO
Inoltre, in considerazione della provenienza, tipologia e ciclo produttivo che lo ha generato, dalle informazioni e schede di sicurezza fornite dal cliente, il rifiuto in esame è classificato in via cautelativa come "PERICOLOSO" in base alle seguenti Caratteristiche di pericolo:`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 14,
        title: "IDROCARBURI NO HP7",
        type: "CONCLUSIONI",
        content: `IDROCARBURI NO HP7
Pur avendo una concentrazione di Idrocarburi totali superiore a 1000 mg/kg SS, dati l'articolo 6-quarter Legge 26 Febbraio 2009, n°13, la tabella 2 All. A Decreto del Ministero dell'ambiente e della tutela del territorio e del mare 7 Novembre 2008 e All. 1 Direttiva 67/548/CEE aggiornato al 29° ATP recepito con DM 28/02/2006, il campione in esame risulta non essere classificato come cancerogeno per la Caratteristica di pericolo HP7`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 15,
        title: "POPs",
        type: "CONCLUSIONI",
        content: `POPs
Inoltre sulla base del Regolamento (UE) 2019/1021 del Parlamento Europeo e del Consiglio del 20 giugno 2019 relativo agli inquinanti organici persistenti (GU L 169/45 del 25.06.2019) e ss.mm.ii. Così come analizzati nel rapporto di prova ………….. il rifiuto in esame NON è classificato come 'POP WASTE'`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 16,
        title: "PH ESTREMI ALCALINI",
        type: "CONCLUSIONI",
        content: `PH ESTREMI ALCALINI
Trattandosi di un rifiuto con pH > 11,5 (estremo), le caratteristiche di pericolosità HP8(corrosivo) e HP4 (irritante) sono state valutate ai sensi del Parere ISS N. 2423 AMPP/IA.12 del 16/05/2008, determinando la riserva alcalina e applicando la classificazione di Young: a) pH =.......... b) riserva alcalina = ........... ( in g NaOH/100 g di rifiuto - metodo per titolazione con acido cloridrico 0,1 N) c) Test di Young (corrosivo se pH + 1/12 riserva alcalina >= 14,5 o se pH - 1/12 riserva acida <= -0,5) = .......... d) Test di Young (irritante se pH+1/6 riserva alcalina >= 13 o se pH-1/6 riserva acida <= 1)= ......... considerate le risultanze di cui sopra, visto il parere dell' ISS, e tenuto conto che il rifiuto non è / è costituito da una miscela di basi/ acidi forti: - al rifiuto è/ non è attribuibile la caratteristica di pericolo H8 (corrosivo) - al rifiuto è/ non è attribuibile la caratteristica di pericolo H4 (irritante)`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 17,
        title: "NO LIMITE DOC ANALISI IRDP",
        type: "CONCLUSIONI",
        content: `NO LIMITE DOC ANALISI IRDP
Il limite di concentrazione per il parametro DOC non si applica alla presente tipologia di rifiuto alle condizioni indicate nella nota G della tab. 5 All. 4 D.lgs 13 gennaio 2003 n. 36 e ss.mm. e ii. e il valore dell'Indice di Respirazione Dinamico non supera il valore limite, come da RDP n…………`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 18,
        title: "NO LIMITE DOC",
        type: "CONCLUSIONI",
        content: `NO LIMITE DOC
Il limite di concentrazione per il parametro DOC non si applica alla presente tipologia di rifiuto alle condizioni indicate nella nota G della tab. 5 All. 4 D.lgs 13 gennaio 2003 n. 36 e ss.mm. e ii.`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 19,
        title: "CONFORMITÀ DM 186",
        type: "CONCLUSIONI",
        content: `CONFORMITÀ DM 186
In base ai risultati analitici e sulla base dell'origine e provenienza, il materiale in esame risulta conforme ai limiti definiti nell'allegato 3 del DM 05/02/98, così come modificato dal DM Ambiente 05/04/06 n. 186.`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 20,
        title: "CONFERIMENTO AMIANTO",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO AMIANTO
CONFERIMENTO: Vista la composizione, l'origine del rifiuto, ai sensi dell'art. 7-quinquies, comma 7, del Decreto legislativo 13 gennaio 2003 n. 36 e ss.mm.ii., si può considerare che lo smaltimento debba avvenire in impianti di DISCARICA PER RIFIUTI NON PERICOLOSI`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 21,
        title: "CONFERIMENTO SOLIDI",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO SOLIDI
CONFERIMENTO: Viste le informazioni circa natura, origine, provenienza e le caratteristiche del campione esaminato, si può affermare che il rifiuto corrispondente possa essere conferito in idoneo impianto autorizzato`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 22,
        title: "CONFERIMENTO LIQUIDI",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO LIQUIDI
CONFERIMENTO: Vista la composizione e l'origine del rifiuto, si può considerare che lo smaltimento debba avvenire in impianti di trattamento autorizzati`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 23,
        title: "CONFERIMENTO DM186",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO DM186
CONFERIMENTO: In base ai risultati analitici, limitatamente ai parametri presi in esame, e sulla base dell'origine del rifiuto, risultando individuato nell'elenco dei rifiuti non pericolosi, ( All.1 Suball.1, punto_ ) del DM 05/02/98, così come modificato dal DM Ambiente 05/04/06 n. 186, si può affermare che il rifiuto possa essere avviato ad attività di recupero`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 24,
        title: "CONFERIMENTO RECUPERO DM 161",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO RECUPERO DM 161
CONFERIMENTO: Si può affermare che lo smaltimento debba avvenire in impianti di recupero autorizzati ai sensi del DM 12/06/2002 n. 161 All.1 Sub. All. 1, Punto 6.3`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 25,
        title: "CONFERIMENTO DISCARICA NP TAB 5",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO DISCARICA NP TAB 5
CONFERIMENTO: Vista la composizione, l'origine del rifiuto e le prove di lisciviazione effettuate, considerando che la concentrazione delle sostanze nell'allegato non superano le concentrazioni limite indicate nella tab. 5 All. 4 D.lgs 13 gennaio 2003 n. 36 e ss.mm. e ii. ai sensi dall'art. 7-quinquies, comma 4 del medesimo Decreto, si può considerare che il conferimento del rifiuto può avvenire in impianti di Discarica per rifiuti non pericolosi o presso idonei impianti di trattamento autorizzati.`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 26,
        title: "CONFERIMENTO DISCARICA NP TAB 5 a",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO DISCARICA NP TAB 5 a
CONFERIMENTO: Vista la composizione, l'origine del rifiuto e le prove di lisciviazione effettuate, considerando che la concentrazione delle sostanze nell'allegato non superano le concentrazioni limite indicate nella tab. 5a All. 4 D.lgs 13 gennaio 2003 n. 36 e ss.mm. e ii. ai sensi dall'art. 7-quinquies, comma 4 del medesimo Decreto, si può considerare che il conferimento del rifiuto può avvenire in impianti di Discarica per rifiuti non pericolosi o presso idonei impianti di trattamento autorizzati.`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 27,
        title: "CONFERIMENTO DISCARICA NP TAB 5 a DEROGHE",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO DISCARICA NP TAB 5 a DEROGHE
CONFERIMENTO: Vista la composizione, l'origine del rifiuto e le prove di lisciviazione effettuate, considerando che la concentrazione delle sostanze nell'allegato non superano le concentrazioni limite indicate nella tab. 5a All. 4 D.lgs 13 gennaio 2003 n. 36 e ss.mm. e ii. ai sensi dall'art. 7-quinquies, comma 4 del medesimo Decreto, si può considerare che lo smaltimento debba avvenire in impianti di DISCARICA PER RIFIUTI NON PERICOLOSI aventi deroghe superiori ai valori sperimentali per i seguenti parametri:`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    },
    {
        id: 28,
        title: "CONFERIMENTO DISCARICA NP TAB 5 DEROGHE",
        type: "CONCLUSIONI",
        content: `CONFERIMENTO DISCARICA NP TAB 5 DEROGHE
CONFERIMENTO: Vista la composizione, l'origine del rifiuto e le prove di lisciviazione effettuate, considerando che la concentrazione delle sostanze nell'allegato non superano le concentrazioni limite indicate nella tab. 5 All. 4 D.lgs 13 gennaio 2003 n. 36 e ss.mm. e ii. ai sensi dall'art. 7-quinquies, comma 4 del medesimo Decreto, si può considerare che lo smaltimento debba avvenire in impianti di DISCARICA PER RIFIUTI NON PERICOLOSI aventi deroghe superiori ai valori sperimentali per i seguenti parametri:`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    }
];

// Funzione per inizializzare le note preimpostate di default
function initializeDefaultPresetNotes() {
    try {
        const existingPresets = localStorage.getItem('presetNotes');
        
        if (!existingPresets) {
            // Se non ci sono note preimpostate, carica quelle di default
            localStorage.setItem('presetNotes', JSON.stringify(DEFAULT_PRESET_NOTES));
            presetNotes = [...DEFAULT_PRESET_NOTES];
        } else {
            // Carica quelle esistenti
            presetNotes = JSON.parse(existingPresets);
        }
    } catch (error) {
        console.error('Errore nell\'inizializzazione delle note preimpostate:', error);
        // In caso di errore, usa le note di default
        presetNotes = [...DEFAULT_PRESET_NOTES];
        localStorage.setItem('presetNotes', JSON.stringify(presetNotes));
    }
}

// Funzione per filtrare le note per tipo
function getFilteredPresetNotes() {
    const selectedType = document.getElementById('noteTypeFilter')?.value || '';
    
    if (!selectedType) {
        return presetNotes;
    }
    
    return presetNotes.filter(note => note.type === selectedType);
}

// Carica le note preimpostate dal localStorage
function loadPresetNotes() {
    try {
        // Prima inizializza le note di default se necessario
        initializeDefaultPresetNotes();
        
        updatePresetNotesUI();
    } catch (error) {
        console.error('Errore nel caricamento delle note preimpostate:', error);
        presetNotes = [...DEFAULT_PRESET_NOTES];
        localStorage.setItem('presetNotes', JSON.stringify(presetNotes));
    }
}

// Aggiorna l'interfaccia utente con le note preimpostate
function updatePresetNotesUI() {
    const container = document.getElementById('presetNotesContainer');
    
    if (!container) return;
    
    const filteredNotes = getFilteredPresetNotes();
    
    if (filteredNotes.length === 0) {
        const selectedType = document.getElementById('noteTypeFilter')?.value || '';
        const message = selectedType 
            ? `Nessuna nota preimpostata disponibile per il tipo "${selectedType}"`
            : 'Nessuna nota preimpostata disponibile';
            
        container.innerHTML = `
            <div class="no-presets-message">
                <i class="fas fa-info-circle"></i>
                <p>${message}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    filteredNotes.forEach(preset => {
        // Aggiungi un badge per il tipo di nota
        const typeBadge = `<span class="note-type-badge note-type-${preset.type.toLowerCase()}">${preset.type}</span>`;
        
        html += `
            <div class="preset-note-card" data-id="${preset.id}" onclick="usePresetNote(${preset.id})">
                <div class="preset-note-header">
                    <div class="preset-note-title">${preset.title}</div>
                    ${typeBadge}
                </div>
                <div class="preset-note-preview">${preset.content.substring(0, 150)}...</div>
                <div class="preset-actions">
                    <button class="preset-btn" onclick="editPresetNote(${preset.id}, event)" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="preset-btn delete-btn" onclick="deletePresetNote(${preset.id}, event)" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Usa una nota preimpostata nel textarea
function usePresetNote(presetId) {
    try {
        const preset = presetNotes.find(p => p.id === presetId);
        
        if (!preset) {
            throw new Error('Nota preimpostata non trovata');
        }
        
        const textarea = document.getElementById('reportNotes');
        const currentText = textarea.value.trim();
        
        // Aggiungi la nota preimpostata al testo esistente
        if (currentText) {
            textarea.value = currentText + '\n\n' + preset.content;
        } else {
            textarea.value = preset.content;
        }
        
        // Focus sul textarea
        textarea.focus();
        
        // Scorri il textarea alla fine
        textarea.scrollTop = textarea.scrollHeight;
        
        showNotification('Nota preimpostata inserita', 'success');
    } catch (error) {
        console.error('Errore nell\'uso della nota preimpostata:', error);
        showNotification('Errore nell\'uso della nota preimpostata', 'error');
    }
}

// Apri il dialog per aggiungere una nuova nota preimpostata
function openPresetDialog(presetId = null) {
    try {
        // Se presetId è fornito, stiamo modificando una nota esistente
        if (presetId !== null) {
            const preset = presetNotes.find(p => p.id === presetId);
            
            if (!preset) {
                throw new Error('Nota preimpostata non trovata');
            }
            
            document.getElementById('currentPresetId').value = preset.id;
            document.getElementById('presetTitle').value = preset.title;
            document.getElementById('presetContent').value = preset.content;
            document.getElementById('presetType').value = preset.type || 'GENERICA';
        } else {
            // Nuova nota preimpostata
            document.getElementById('currentPresetId').value = '';
            document.getElementById('presetTitle').value = '';
            document.getElementById('presetContent').value = '';
            document.getElementById('presetType').value = 'GENERICA';
        }
        
        // Mostra il dialog
        document.getElementById('presetDialog').style.display = 'flex';
        
        // Focus sul titolo
        setTimeout(() => {
            document.getElementById('presetTitle').focus();
        }, 300);
    } catch (error) {
        console.error('Errore nell\'apertura del dialog per la nota preimpostata:', error);
        showNotification('Errore nell\'apertura del dialog', 'error');
    }
}

// Modifica una nota preimpostata esistente
function editPresetNote(presetId, event) {
    // Ferma la propagazione dell'evento click per evitare di attivare usePresetNote
    if (event) {
        event.stopPropagation();
    }
    
    openPresetDialog(presetId);
}

// Salva una nota preimpostata
function savePresetNote() {
    try {
        const presetId = document.getElementById('currentPresetId').value;
        const title = document.getElementById('presetTitle').value.trim();
        const content = document.getElementById('presetContent').value.trim();
        const type = document.getElementById('presetType').value;
        
        if (!title) {
            throw new Error('Il titolo è obbligatorio');
        }
        
        if (!content) {
            throw new Error('Il contenuto è obbligatorio');
        }
        
        if (!type) {
            throw new Error('Il tipo di nota è obbligatorio');
        }
        
        if (presetId) {
            // Aggiorna una nota esistente
            const index = presetNotes.findIndex(p => p.id === parseInt(presetId));
            
            if (index !== -1) {
                presetNotes[index].title = title;
                presetNotes[index].content = content;
                presetNotes[index].type = type;
                presetNotes[index].updated = new Date().toISOString();
            }
        } else {
            // Crea una nuova nota
            const newId = presetNotes.length > 0 
                ? Math.max(...presetNotes.map(p => p.id)) + 1 
                : 1;
                
            presetNotes.push({
                id: newId,
                title: title,
                content: content,
                type: type,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            });
        }
        
        // Salva in localStorage
        localStorage.setItem('presetNotes', JSON.stringify(presetNotes));
        
        // Aggiorna l'UI
        updatePresetNotesUI();
        
        // Chiudi il dialog
        document.getElementById('presetDialog').style.display = 'none';
        
        showNotification('Nota preimpostata salvata con successo', 'success');
    } catch (error) {
        console.error('Errore nel salvataggio della nota preimpostata:', error);
        showNotification('Errore: ' + error.message, 'error');
    }
}

// Elimina una nota preimpostata
function deletePresetNote(presetId, event) {
    // Ferma la propagazione dell'evento click
    if (event) {
        event.stopPropagation();
    }
    
    try {
        // Conferma prima di eliminare
        if (!confirm('Sei sicuro di voler eliminare questa nota preimpostata?')) {
            return;
        }
        
        // Rimuovi la nota dall'array
        presetNotes = presetNotes.filter(p => p.id !== presetId);
        
        // Salva in localStorage
        localStorage.setItem('presetNotes', JSON.stringify(presetNotes));
        
        // Aggiorna l'UI
        updatePresetNotesUI();
        
        showNotification('Nota preimpostata eliminata', 'success');
    } catch (error) {
        console.error('Errore nell\'eliminazione della nota preimpostata:', error);
        showNotification('Errore nell\'eliminazione della nota preimpostata', 'error');
    }
}

// Funzione per gestire il cambio di filtro tipo nota
function handleNoteTypeFilterChange() {
    updatePresetNotesUI();
}


// Estendi la funzione initNotesSystem esistente
function initNotesSystem() {
    // Event listeners per le note del report
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', saveNotes);
    }
    
    const closeNotesBtn = document.getElementById('closeNotesBtn');
    if (closeNotesBtn) {
        closeNotesBtn.addEventListener('click', function() {
            document.getElementById('notesDialog').style.display = 'none';
        });
    }
    
    const closeNotesDialog = document.getElementById('closeNotesDialog');
    if (closeNotesDialog) {
        closeNotesDialog.addEventListener('click', function() {
            document.getElementById('notesDialog').style.display = 'none';
        });
    }
    
    // Chiudi il dialog quando si clicca al di fuori
    const notesDialog = document.getElementById('notesDialog');
    if (notesDialog) {
        notesDialog.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    // Salva con Ctrl+Enter nel textarea
    const reportNotesTextarea = document.getElementById('reportNotes');
    if (reportNotesTextarea) {
        reportNotesTextarea.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                saveNotes();
            }
        });
    }
    
    // Event listeners per le note preimpostate
    const addNewPresetBtn = document.getElementById('addNewPresetBtn');
    if (addNewPresetBtn) {
        addNewPresetBtn.addEventListener('click', function() {
            openPresetDialog();
        });
    }
    
    const savePresetBtn = document.getElementById('savePresetBtn');
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', savePresetNote);
    }
    
    const cancelPresetBtn = document.getElementById('cancelPresetBtn');
    if (cancelPresetBtn) {
        cancelPresetBtn.addEventListener('click', function() {
            document.getElementById('presetDialog').style.display = 'none';
        });
    }
    
    const closePresetDialog = document.getElementById('closePresetDialog');
    if (closePresetDialog) {
        closePresetDialog.addEventListener('click', function() {
            document.getElementById('presetDialog').style.display = 'none';
        });
    }
    
    const presetDialog = document.getElementById('presetDialog');
    if (presetDialog) {
        presetDialog.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    // Event listener per il filtro tipo nota
    const noteTypeFilter = document.getElementById('noteTypeFilter');
    if (noteTypeFilter) {
        noteTypeFilter.addEventListener('change', handleNoteTypeFilterChange);
    }
    
    // Carica le note preimpostate all'inizializzazione
    loadPresetNotes();
}

// Modifica della funzione openNotes esistente per caricare anche le note preimpostate
function openNotes(reportName) {
    try {
        // Imposta il nome del report corrente
        document.getElementById('currentReportName').value = reportName;
        
        // Recupera le note salvate per questo report
        const reportNotes = localStorage.getItem(`notes_${reportName}`) || '';
        
        // Imposta il valore del textarea
        document.getElementById('reportNotes').value = reportNotes;
        
        // Mostra il dialog
        document.getElementById('notesDialog').style.display = 'flex';
        
        // Carica le note preimpostate
        loadPresetNotes();
        
        // Focus sul textarea
        setTimeout(() => {
            document.getElementById('reportNotes').focus();
        }, 300);
    } catch (error) {
        console.error('Errore nell\'apertura delle note:', error);
        showNotification('Errore nell\'apertura delle note: ' + error.message, 'error');
    }
}

// AGGIUNGI QUESTA FUNZIONE PRIMA DI generateClassificationReport:
function generateHPWithReasons(sostanzaInfo, globalHP, motivazioni_hp) {
    const hpIndividuali = sostanzaInfo.caratteristiche_pericolo || [];
    const motiviIndividuali = sostanzaInfo.motivi_hp || [];
    
    // Crea un Set di tutte le HP che riguardano questa sostanza
    const tutteHP = new Set([...hpIndividuali]);
    
    // Aggiungi HP globali se la sostanza contribuisce a esse
    globalHP.forEach(hp => {
        // Se la sostanza ha motivi che menzionano questa HP, includila
        if (motiviIndividuali.some(motivo => motivo.includes(hp))) {
            tutteHP.add(hp);
        }
    });

    // Aggiungi HP globali per cui la sostanza contribuisce ma non ha motivi espliciti
    globalHP.forEach(hp => {
        if (!tutteHP.has(hp)) {
            // Verifica se la sostanza ha frasi H/EUH rilevanti per questa HP
            const frasiRelevanti = sostanzaInfo.frasi_h || [];
            const frasiEuhRelevanti = sostanzaInfo.frasi_euh || [];
            
            // Mappa delle frasi per ogni HP (semplificata)
            const frasiPerHP = {
                'HP1': ['H200', 'H201', 'H202', 'H203', 'H204', 'H240', 'H241'],
                'HP2': ['H270', 'H271', 'H272'],
                'HP3': ['H224', 'H225', 'H226', 'H228', 'H242', 'H250', 'H251', 'H252', 'H260', 'H261'],
                'HP4': ['H314', 'H315', 'H318', 'H319'],
                'HP5': ['H370', 'H371', 'H335', 'H372', 'H373', 'H304'],
                'HP6': ['H300', 'H301', 'H302', 'H310', 'H311', 'H312', 'H330', 'H331', 'H332'],
                'HP8': ['H314'],
                'HP12': ['EUH029', 'EUH031', 'EUH032'],
                'HP14': ['H400', 'H410', 'H411', 'H412', 'H413', 'H420']
            };
            
            const frasiHP = frasiPerHP[hp] || [];
            const haFrasiRelevanti = frasiRelevanti.some(frase => frasiHP.includes(frase)) ||
                                    frasiEuhRelevanti.some(frase => frasiHP.includes(frase));
            
            if (haFrasiRelevanti) {
                tutteHP.add(hp);
            }
        }
    });
    
    // Ordina HP per priorità/importanza (più pericolose prima)
    const prioritaHP = {
        'HP1': 1,  // Esplosivo - massima priorità
        'HP2': 2,  // Comburente
        'HP6': 3,  // Tossicità acuta
        'HP7': 4,  // Cancerogeno
        'HP8': 5,  // Corrosivo
        'HP10': 6, // Tossico per riproduzione
        'HP11': 7, // Mutageno
        'HP5': 8,  // STOT
        'HP12': 9, // Gas tossici
        'HP13': 10, // Sensibilizzante
        'HP14': 11, // Ecotossico
        'HP3': 12,  // Infiammabile
        'HP4': 13,  // Irritante
        'HP15': 14  // Sviluppo caratteristiche
    };

    const hpFinali = Array.from(tutteHP).sort((a, b) => {
        const prioritaA = prioritaHP[a] || 99;
        const prioritaB = prioritaHP[b] || 99;
        return prioritaA - prioritaB;
    });
    
    // Se non ci sono HP, ritorna "Nessuna"
    if (hpFinali.length === 0) {
        return 'Nessuna';
    }
    
    // Crea la stringa con HP e motivi abbreviati
    const hpConMotivi = hpFinali.map(hp => {
        // Cerca motivi individuali specifici per questa HP
        const motivoIndividuale = motiviIndividuali.find(motivo => 
            motivo.startsWith(hp + ':') && !motivo.includes('sommatoria') && !motivo.includes('criterio')
        );
        
        // Cerca motivi da sommatoria per questa HP
        const motivoSommatoria = motiviIndividuali.find(motivo => 
            motivo.startsWith(hp + ':') && motivo.includes('sommatoria')
        );
        
        // Cerca motivi da infiammabilità per HP3
        const motivoInfiammabilita = motiviIndividuali.find(motivo => 
            motivo.startsWith(hp + ':') && motivo.includes('criterio infiammabilità')
        );
        
        // Cerca motivi da presenza per HP15
        const motivoPresenza = motiviIndividuali.find(motivo => 
            motivo.startsWith(hp + ':') && motivo.includes('presenza')
        );
        
        // Priorità: Individuale > Infiammabilità > Presenza > Sommatoria
        let motivoFinale = '';
        
        if (motivoIndividuale) {
            const dettaglio = motivoIndividuale.split(':')[1]?.trim();
            if (dettaglio && dettaglio.includes('≥0%')) {
                motivoFinale = '[IND] qualsiasi conc.'; // Individuale senza soglia
            } else if (dettaglio) {
                motivoFinale = '[IND] ' + dettaglio; // Individuale con soglia specifica
            }
        } else if (motivoInfiammabilita) {
            motivoFinale = '[FIS] infiamm.fisica'; // Criterio fisico
        } else if (motivoPresenza) {
            const frase = motivoPresenza.split('presenza ')[1]?.trim();
            motivoFinale = frase ? `[PRES] presenza ${frase}` : '[PRES] presenza'; // Solo presenza
        } else if (motivoSommatoria) {
            motivoFinale = '[SOM] sommat.'; // Da sommatoria
        }
        
        // Restituisci HP con o senza motivo
        return motivoFinale ? `${hp} (${motivoFinale})` : hp;
    });
    
    // Migliora la spaziatura per leggibilità
    let risultato = hpConMotivi.join(' • '); // Usa bullet point invece di virgole

    // Se ci sono molte HP, usa il formato a righe
    if (hpConMotivi.length > 4) {
        risultato = hpConMotivi.join('\n• '); // Metti ogni HP su una riga
        risultato = '• ' + risultato; // Aggiungi bullet all'inizio
    }

    return risultato;
}