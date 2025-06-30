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
            // Se ci sono file, mostra il selettore e ENTRAMBI i pulsanti
            if (fileInfo) fileInfo.style.display = 'block';
            if (startBtn) {
                startBtn.style.display = 'inline-block';
                startBtn.disabled = false; // Assicurati che sia abilitato
            }
            // ✅ NUOVO: Mostra sempre anche il pulsante "Vai a Reports"
            if (goToReportsBtn) {
                goToReportsBtn.style.display = 'inline-block';
            }
            
            // Rimuovi il messaggio informativo se esiste
            if (infoMessage) {
                infoMessage.remove();
            }
   
            // Aggiorna le informazioni sui file disponibili
            updateClassificationFileSelector(fileList);
        } else {
            // Se non ci sono file, nascondi tutto e mostra messaggio informativo
            if (fileInfo) fileInfo.style.display = 'none';
            if (startBtn) startBtn.style.display = 'none';
            // ✅ NUOVO: Mantieni visibile il pulsante "Vai a Reports" anche se non ci sono file
            if (goToReportsBtn) {
                goToReportsBtn.style.display = 'inline-block';
            }
            
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
// MODIFICATO: updateClassificationFileSelector con display codice EER - dataOra - committente
function updateClassificationFileSelector(fileList) {
    const fileInfoElement = document.getElementById('classificationFileInfo');
    
    if (!fileInfoElement) return;
    
    // NUOVO: Ottieni file con metadati basati su codice EER
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
            
            // MODIFICATO: Display con codice EER - dataOra - committente
            filesWithMetadata.forEach(fileInfo => {
                const displayName = `${fileInfo.codiceEER} - ${fileInfo.dataOra} - ${fileInfo.committente}`;
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
            
            // MODIFICATO: Sezione eliminazione con info codice EER
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
                    const displayName = `${fileInfo.codiceEER} - ${fileInfo.dataOra} - ${fileInfo.committente}`;
                    
                    selectorHtml += `
                        <div class="file-delete-item">
                            <span class="file-name">${displayName}</span>
                            <button class="btn btn-danger btn-sm" onclick="eliminaFileCampioneConAvviso('${fileInfo.fileName}', '${fileInfo.codiceEER}', '${fileInfo.dataOra}', '${fileInfo.committente}')">
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
            
            // Event listener esistente rimane invariato
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
            fileInfoElement.innerHTML = '<p>Errore nel caricamento dei file</p>';
        });
}

// NUOVO: Funzione per eliminazione con avviso committente
// MODIFICATO: Funzione per eliminazione con avviso usando codice EER
async function eliminaFileCampioneConAvviso(fileName, codiceEER, dataOra, committente) {
    try {
        // Mostra conferma con info codice EER
        const conferma = confirm(
            `Sei sicuro di voler eliminare questa classificazione?\n\n` +
            `Codice EER: ${codiceEER}\n` +
            `Data e ora: ${dataOra}\n` +
            `Committente: ${committente}\n` +
            `File: ${fileName}\n\n` +
            `⚠️ ATTENZIONE: Questa azione eliminerà definitivamente la classificazione!`
        );
        
        if (!conferma) return;
        
        // Elimina il file con il nuovo handler
        const result = await window.electronAPI.deleteCampioneFileWithWarning(fileName);
        
        if (result.success) {
            showNotification(
                `Classificazione eliminata: ${result.codiceEER} - ${result.committente}`, 
                'success'
            );
            
            // Aggiorna l'interfaccia
            updateClassificationUI();
            
            // Aggiungi attività
            addActivity(
                'Classificazione eliminata', 
                `${result.codiceEER} - ${result.committente}`, 
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
// Funzione per avviare il processo di classificazione - CORRETTA
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
        
        // CORREZIONE 1: Prima archivia il risultato (opzionale, per backup)
        try {
            const archiveResult = await window.electronAPI.archiveClassificationResult(selectedFile, result);
            
            if (archiveResult.success) {
                console.log(`Risultato archiviato: ${archiveResult.archivedFile}`);
            } else {
                console.warn('Errore nell\'archiviazione:', archiveResult.message);
                // Non bloccare il flusso, continua comunque
            }
        } catch (archiveError) {
            console.warn('Errore nell\'archiviazione automatica:', archiveError);
            // Non bloccare il flusso
        }
        
        // CORREZIONE 2: GENERA IL REPORT NELLA CARTELLA REPORTS
        // Questa è la parte che mancava!
        try {
            console.log('Generazione report nella cartella reports...');
            
            // Salva i dati in sessionStorage per generateClassificationReport
            sessionStorage.setItem('classificationResults', JSON.stringify(result));
            
            // Chiama la funzione per generare il report (definita in reports.js)
            const reportName = await generateClassificationReport(result);
            
            if (reportName) {
                console.log(`Report generato con successo: ${reportName}`);
                showNotification(`Classificazione completata! Report salvato: ${reportName}`, 'success');
                
                // Aggiorna la visualizzazione dei report se la funzione è disponibile
                if (typeof loadReports === 'function') {
                    setTimeout(() => {
                        loadReports();
                    }, 500);
                }
            } else {
                throw new Error('Errore nella generazione del report');
            }
        } catch (reportError) {
            console.error('Errore nella generazione del report:', reportError);
            // Non bloccare completamente, ma notifica l'errore
            showNotification('Classificazione completata ma errore nella generazione del report: ' + reportError.message, 'warning');
        }
        
        addActivity('Classificazione completata', `File elaborato: ${selectedFile}`, 'fas fa-check');
        
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
window.eliminaFileCampioneConAvviso = eliminaFileCampioneConAvviso;