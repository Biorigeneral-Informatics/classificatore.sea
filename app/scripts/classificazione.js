// ==== Funzioni per la sezione Classificazione ====

// NOTA IMPORTANTE: queste funzioni sono definite globalmente usando l'oggetto window di electron
//                  in fondo al file avviene l'esportazione in tal senso. Questo va fatto in modo
//                  che le funzioni siano accessibili anche da altri file JS, come dashboard.js. 

// Inizializza sezione "Classificazione"
function initClassificazione() {
    // Aggiungi listener per il bottone "Avvia Classificazione"
    const startBtn = document.getElementById('startClassificationBtn');
    if (startBtn) {
        startBtn.addEventListener('click', avviaClassificazione);
    }

    // Aggiungi listener per il pulsante "Vai a reports"
    const goToReportsBtn = document.getElementById('goToReportsBtn');
    if (goToReportsBtn) {
        goToReportsBtn.addEventListener('click', openReportsFolder);
    }

    // Aggiorna l'interfaccia di classificazione all'inizializzazione
    updateClassificationUI();
}

// Verifica se ci sono dati campione disponibili e aggiorna l'interfaccia di conseguenza
async function updateClassificationUI() {
    try {
        // Carica la lista dei file campione disponibili
        const fileList = await window.electronAPI.getCampioneFiles();
        
        // Ottieni i container della sezione classificazione
        const sectionContainer = document.getElementById('classificazione');
        const fileInfo = document.getElementById('classificationFileInfo');
        const startBtn = document.getElementById('startClassificationBtn');
        const goToReportsBtn = document.getElementById('goToReportsBtn');
        const infoMessage = document.getElementById('classificationInfoMessage');
        
        if (fileList.length > 0) {
            // Se ci sono file, mostra il selettore e il pulsante di avvio
            if (fileInfo) fileInfo.style.display = 'block';
            if (startBtn) startBtn.style.display = 'inline-block';
            
            // Rimuovi il messaggio informativo se esiste
            if (infoMessage) {
                infoMessage.remove();
            }
            
            // Aggiorna le informazioni sui file disponibili
            updateClassificationFileSelector(fileList);
        } else {
            // Se non ci sono file, mostra un messaggio che invita l'utente a completare l'assegnazione
            if (fileInfo) fileInfo.style.display = 'none';
            if (startBtn) startBtn.style.display = 'none';
            if (goToReportsBtn) goToReportsBtn.style.display = 'none';
            
            // Aggiungi un messaggio informativo se non esiste già
            if (!infoMessage) {
                const messageDiv = document.createElement('div');
                messageDiv.id = 'classificationInfoMessage';
                messageDiv.className = 'no-data-message';
                messageDiv.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <p>Nessun file disponibile per la classificazione.</p>
                    <p>Completa prima l'assegnazione dei Sali-Metalli per generare un file di dati.</p>
                `;
                
                // Inserisci dopo l'elemento h2
                if (sectionContainer) {
                    const h2Element = sectionContainer.querySelector('h2');
                    if (h2Element && h2Element.nextSibling) {
                        sectionContainer.insertBefore(messageDiv, h2Element.nextSibling);
                    } else {
                        sectionContainer.appendChild(messageDiv);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento dell\'interfaccia di classificazione:', error);
        showNotification('Errore nell\'aggiornamento dell\'interfaccia', 'error');
    }
}


// Nuova funzione per creare il selettore di file e gestire il limite
// MODIFICATO: updateClassificationFileSelector con info committente
function updateClassificationFileSelector(fileList) {
    const fileInfoElement = document.getElementById('classificationFileInfo');
    
    if (!fileInfoElement) return;
    
    // NUOVO: Ottieni file con metadati
    window.electronAPI.getCampioneFilesWithMetadata()
        .then(filesWithMetadata => {
            // Crea il selettore di file
            let selectorHtml = `
                <div class="file-selector-container">
                    <h3>Seleziona file da classificare:</h3>
                    <div class="file-selector">
                        <select id="campioneFileSelect" class="form-control">
                            <option value="">Seleziona un file...</option>
            `;
            
            // Aggiungi le opzioni per ogni file CON INFO COMMITTENTE
            filesWithMetadata.forEach(fileInfo => {
                const displayName = `${fileInfo.committente} - ${fileInfo.dataCampionamento} (${fileInfo.fileName})`;
                selectorHtml += `<option value="${fileInfo.fileName}">${displayName}</option>`;
            });
            
            selectorHtml += `
                        </select>
                        <div class="file-selector-info">
                            <p><strong>File disponibili:</strong> ${filesWithMetadata.length}/8</p>
                        </div>
                    </div>
                </div>
            `;
            
            // MODIFICATO: Sezione eliminazione con info committente
            if (filesWithMetadata.length > 0) {
                const headerText = filesWithMetadata.length >= 8 
                    ? '<i class="fas fa-exclamation-triangle"></i><span>Limite massimo raggiunto (8/8 file)</span>' 
                    : '<i class="fas fa-folder-open"></i><span>Gestione file campione</span>';
                
                const descriptionText = filesWithMetadata.length >= 8
                    ? 'Per aggiungere nuovi file, elimina alcuni di quelli esistenti:'
                    : 'Puoi eliminare i file che non ti servono più:';
                
                selectorHtml += `
                    <div class="file-management-section">
                        <div class="section-header">
                            ${headerText}
                        </div>
                        <p>${descriptionText}</p>
                        <div class="file-delete-list">
                `;
                
                filesWithMetadata.forEach(fileInfo => {
                    const displayName = `${fileInfo.committente} - ${fileInfo.dataCampionamento}`;
                    
                    selectorHtml += `
                        <div class="file-delete-item">
                            <span class="file-name">${displayName}</span>
                            <button class="btn btn-danger btn-sm" onclick="eliminaFileCampioneConAvviso('${fileInfo.fileName}', '${fileInfo.committente}', '${fileInfo.dataCampionamento}')">
                                <i class="fas fa-trash"></i> Elimina
                            </button>
                        </div>
                    `;
                });
                
                selectorHtml += `
                        </div>
                    </div>
                `;
            }
            
            fileInfoElement.innerHTML = selectorHtml;
            
            // Aggiungi event listener al selettore (codice esistente)
            const select = document.getElementById('campioneFileSelect');
            if (select) {
                select.addEventListener('change', function() {
                    const selectedFile = this.value;
                    const startBtn = document.getElementById('startClassificationBtn');
                    
                    if (selectedFile && startBtn) {
                        startBtn.disabled = false;
                        startBtn.style.opacity = '1';
                    } else if (startBtn) {
                        startBtn.disabled = true;
                        startBtn.style.opacity = '0.6';
                    }
                });
                
                const startBtn = document.getElementById('startClassificationBtn');
                if (startBtn) {
                    startBtn.disabled = true;
                    startBtn.style.opacity = '0.6';
                }
            }
        })
        .catch(error => {
            console.error('Errore nel caricamento file con metadati:', error);
            // Fallback alla versione originale
            fileInfoElement.innerHTML = '<p>Errore nel caricamento dei file</p>';
        });
}

// NUOVO: Funzione per eliminazione con avviso committente
async function eliminaFileCampioneConAvviso(fileName, committente, dataCampionamento) {
    try {
        // Mostra conferma con info committente
        const conferma = confirm(
            `Sei sicuro di voler eliminare questa classificazione?\n\n` +
            `Committente: ${committente}\n` +
            `Data campionamento: ${dataCampionamento}\n` +
            `File: ${fileName}\n\n` +
            `⚠️ ATTENZIONE: Questa azione eliminerà definitivamente la classificazione!`
        );
        
        if (!conferma) return;
        
        // Elimina il file con il nuovo handler
        const result = await window.electronAPI.deleteCampioneFileWithWarning(fileName);
        
        if (result.success) {
            showNotification(
                `Classificazione eliminata: ${result.committente} (${result.dataCampionamento})`, 
                'success'
            );
            
            // Aggiorna l'interfaccia
            updateClassificationUI();
            
            // Aggiungi attività
            addActivity(
                'Classificazione eliminata', 
                `${result.committente} - ${result.dataCampionamento}`, 
                'fas fa-trash'
            );
        } else {
            throw new Error(result.message || 'Errore nell\'eliminazione del file');
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione del file:', error);
        showNotification('Errore nell\'eliminazione: ' + error.message, 'error');
    }
}



// Funzione per eliminare un file campione
async function eliminaFileCampione(fileName) {
    try {
        // Mostra conferma
        const conferma = confirm(`Sei sicuro di voler eliminare il file "${fileName}"?`);
        if (!conferma) return;
        
        // Elimina il file
        const result = await window.electronAPI.deleteCampioneFile(fileName);
        
        if (result.success) {
            showNotification(`File ${fileName} eliminato con successo`);
            
            // Aggiorna l'interfaccia
            updateClassificationUI();
            
            // Aggiungi attività
            addActivity('File eliminato', fileName, 'fas fa-trash');
        } else {
            throw new Error(result.message || 'Errore nell\'eliminazione del file');
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione del file:', error);
        showNotification('Errore nell\'eliminazione del file: ' + error.message, 'error');
    }
}




// Aggiorna le informazioni sul file nella sezione classificazione
function updateClassificationFileInfo() {
    const fileInfoElement = document.getElementById('classificationFileInfo');
    const fileNameElement = document.getElementById('classificationFileName');
    const fileDateElement = document.getElementById('classificationFileDate');
    
    if (fileInfoElement && fileNameElement && fileDateElement) {
        // Ottieni la data corrente formattata
        const now = new Date();
        const formattedDate = now.toLocaleString('it-IT');
        
        fileNameElement.textContent = `File: dati_campione.json`;
        fileDateElement.textContent = `Pronto per la classificazione (${formattedDate})`;
    }
}

// Funzione per avviare il processo di classificazione
async function avviaClassificazione() {
    try {
        // Ottieni il file selezionato
        const selectElement = document.getElementById('campioneFileSelect');
        if (!selectElement || !selectElement.value) {
            showNotification('Seleziona un file da classificare', 'warning');
            return false;
        }
        
        const selectedFile = selectElement.value;
        
        // Mostra un indicatore di caricamento
        showNotification('Avvio classificazione in corso...', 'info');
        
        // Disabilita il pulsante durante l'elaborazione
        const startBtn = document.getElementById('startClassificationBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Elaborazione...';
        }
        
        const result = await window.electronAPI.runPythonScript('classificatore.py', [selectedFile]);
        
        // Riattiva il pulsante
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Avvia Classificazione';
        }
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nell\'esecuzione del classificatore');
        }
        
        console.log('Risultato classificazione:', result);
        
        // NUOVO: Archivia automaticamente il risultato
        try {
            const archiveResult = await window.electronAPI.archiveClassificationResult(selectedFile, result);
            
            if (archiveResult.success) {
                console.log(`Risultato archiviato: ${archiveResult.archivedFile}`);
                showNotification(
                    `Classificazione completata e archiviata: ${archiveResult.archivedFile}`, 
                    'success'
                );
            } else {
                console.warn('Errore nell\'archiviazione:', archiveResult.message);
                // Non bloccare il flusso, continua comunque
            }
        } catch (archiveError) {
            console.warn('Errore nell\'archiviazione automatica:', archiveError);
            // Non bloccare il flusso
        }
        
        // Salva i dati in sessionStorage per uso futuro
        sessionStorage.setItem('classificationResults', JSON.stringify(result.data));
        
        // Nascondi il pulsante "Avvia Classificazione"
        if (startBtn) {
            startBtn.style.display = 'none';
        }
        
        // Mostra il pulsante "Vai a reports"
        const goToReportsBtn = document.getElementById('goToReportsBtn');
        if (goToReportsBtn) {
            goToReportsBtn.style.display = 'inline-block';
        }
        
        addActivity('Classificazione completata', `File archiviato: ${selectedFile}`, 'fas fa-check');
        
        return true;
    } catch (error) {
        console.error('Errore nell\'avvio della classificazione:', error);
        showNotification('Errore nella classificazione: ' + error.message, 'error');
        
        // Riattiva il pulsante in caso di errore
        const startBtn = document.getElementById('startClassificationBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Avvia Classificazione';
        }
        
        return false;
    }
}

// Versione corretta per generare report dal risultato della classificazione
// MODIFICATO: generateReportFromClassificationData per gestire metadati
async function generateReportFromClassificationData(classificationData) {
    try {
        if (!classificationData) {
            throw new Error('Nessun dato di classificazione disponibile');
        }
        
        // NUOVO: Estrai metadati se presenti
        const metadati = classificationData._metadata;
        let reportName;
        
        if (metadati && metadati.committente) {
            // Genera nome basato su committente e data
            const committente = metadati.committente.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
            reportName = `${committente}_${timestamp}`;
        } else {
            // Fallback al sistema precedente
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
            reportName = `Classificazione_${timestamp}`;
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
        if (classificationData.campione) {
            const campione = classificationData.campione;
            const hp = classificationData.caratteristiche_pericolo || [];
            
            // Crea un oggetto riassuntivo per ogni sostanza
            for (const [sostanza, info] of Object.entries(campione)) {
                reportData.risultati_classificazione.push({
                    'Sostanza': sostanza,
                    'Concentrazione (ppm)': info.concentrazione_ppm || 0,
                    'Concentrazione (%)': info.concentrazione_percentuale || 0,
                    'Frasi H': info.frasi_h ? info.frasi_h.join(', ') : 'N/A',
                    'Caratteristiche HP': info.caratteristiche_pericolo ? info.caratteristiche_pericolo.join(', ') : 'Nessuna',
                    'CAS': info.cas || 'N/A'
                });
            }
            
            // Aggiungi una riga con il risultato complessivo
            reportData.risultati_classificazione.push({
                'Sostanza': '** RISULTATO TOTALE **',
                'Concentrazione (ppm)': '',
                'Concentrazione (%)': '',
                'Frasi H': '',
                'Caratteristiche HP': hp.join(', ') || 'Nessuna caratteristica di pericolo',
                'CAS': ''
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

// Funzione per aprire la cartella dei report
async function openReportsFolder() {
    try {
        const reportsPath = await window.electronAPI.getReportsPath();
        
        // Verifica che la cartella esista
        const folderExists = await window.electronAPI.fileExists(reportsPath);
        
        if (!folderExists) {
            // Crea la cartella se non esiste
            await window.electronAPI.ensureDir(reportsPath);
        }
        
        // Apri la cartella
        await window.electronAPI.openFolder(reportsPath);
        
        // Vai alla sezione report
        showSection('report');
        
    } catch (error) {
        console.error('Errore nell\'apertura della cartella dei report:', error);
        showNotification('Errore nell\'apertura della cartella dei report', 'error');
    }
}

// Assicura che l'interfaccia sia aggiornata quando il documento viene caricato
document.addEventListener('DOMContentLoaded', function() {
    updateClassificationUI();
});

// Esporta le funzioni, rendendole globali
window.initClassificazione = initClassificazione;
window.updateClassificationUI = updateClassificationUI;
window.updateClassificationFileInfo = updateClassificationFileInfo;
window.avviaClassificazione = avviaClassificazione;
window.generateReportFromClassificationData = generateReportFromClassificationData;
window.openReportsFolder = openReportsFolder;
window.eliminaFileCampione = eliminaFileCampione;