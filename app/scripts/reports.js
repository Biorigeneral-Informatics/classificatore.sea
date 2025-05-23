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
        });
    }
    
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', function() {
            document.getElementById('reportPreviewDialog').style.display = 'none';
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
async function createDemoReport() {
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

// Carica e visualizza i report disponibili
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
                const date = new Date().toLocaleString('it-IT');
                
            html += `
                <div class="report-card" data-type="json" data-name="${reportName.toLowerCase()}">
                    <div class="report-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="report-info">
                        <h4>${reportName}</h4>
                        <p>Generato il: ${date}</p>
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

// Aggiungi all'evento di caricamento dei report
function initNotesSystem() {
    // Listener per il bottone salva note
    document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);
    
    // Listener per chiudere il dialog delle note
    document.getElementById('closeNotesBtn').addEventListener('click', function() {
        document.getElementById('notesDialog').style.display = 'none';
    });
    
    document.getElementById('closeNotesDialog').addEventListener('click', function() {
        document.getElementById('notesDialog').style.display = 'none';
    });
    
    // Chiudi il dialog quando si clicca al di fuori
    document.getElementById('notesDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Salva con Ctrl+Enter nel textarea
    document.getElementById('reportNotes').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            saveNotes();
        }
    });
}



// Funzioni per gestire le note preimpostate
let presetNotes = []; // Array per memorizzare le note preimpostate

// Carica le note preimpostate dal localStorage
function loadPresetNotes() {
    try {
        const savedPresets = localStorage.getItem('presetNotes');
        if (savedPresets) {
            presetNotes = JSON.parse(savedPresets);
        } else {
            presetNotes = [];
        }
        
        updatePresetNotesUI();
    } catch (error) {
        console.error('Errore nel caricamento delle note preimpostate:', error);
        presetNotes = [];
    }
}

// Aggiorna l'interfaccia utente con le note preimpostate
function updatePresetNotesUI() {
    const container = document.getElementById('presetNotesContainer');
    
    if (!container) return;
    
    if (presetNotes.length === 0) {
        container.innerHTML = `
            <div class="no-presets-message">
                <i class="fas fa-info-circle"></i>
                <p>Nessuna nota preimpostata disponibile</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    presetNotes.forEach(preset => {
        html += `
            <div class="preset-note-card" data-id="${preset.id}" onclick="usePresetNote(${preset.id})">
                <div class="preset-note-title">${preset.title}</div>
                <div class="preset-note-preview">${preset.content}</div>
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
        } else {
            // Nuova nota preimpostata
            document.getElementById('currentPresetId').value = '';
            document.getElementById('presetTitle').value = '';
            document.getElementById('presetContent').value = '';
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
        
        if (!title) {
            throw new Error('Il titolo è obbligatorio');
        }
        
        if (!content) {
            throw new Error('Il contenuto è obbligatorio');
        }
        
        if (presetId) {
            // Aggiorna una nota esistente
            const index = presetNotes.findIndex(p => p.id === parseInt(presetId));
            
            if (index !== -1) {
                presetNotes[index].title = title;
                presetNotes[index].content = content;
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

// Estendi la funzione initNotesSystem esistente
function initNotesSystem() {
    // Listener già esistenti
    document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);
    
    document.getElementById('closeNotesBtn').addEventListener('click', function() {
        document.getElementById('notesDialog').style.display = 'none';
    });
    
    document.getElementById('closeNotesDialog').addEventListener('click', function() {
        document.getElementById('notesDialog').style.display = 'none';
    });
    
    document.getElementById('notesDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    document.getElementById('reportNotes').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            saveNotes();
        }
    });
    
    // Nuovi listener per le note preimpostate
    document.getElementById('addNewPresetBtn').addEventListener('click', function() {
        openPresetDialog();
    });
    
    document.getElementById('savePresetBtn').addEventListener('click', savePresetNote);
    
    document.getElementById('cancelPresetBtn').addEventListener('click', function() {
        document.getElementById('presetDialog').style.display = 'none';
    });
    
    document.getElementById('closePresetDialog').addEventListener('click', function() {
        document.getElementById('presetDialog').style.display = 'none';
    });
    
    document.getElementById('presetDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Carica le note preimpostate all'inizializzazione
    loadPresetNotes();
}

// Modifica la funzione openNotes esistente per caricare anche le note preimpostate
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