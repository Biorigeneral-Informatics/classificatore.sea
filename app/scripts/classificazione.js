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
function updateClassificationFileSelector(fileList) {
    const fileInfoElement = document.getElementById('classificationFileInfo');
    
    if (!fileInfoElement) return;
    
    // Crea il selettore di file
    let selectorHtml = `
        <div class="file-selector-container">
            <h3>Seleziona file da classificare:</h3>
            <div class="file-selector">
                <select id="campioneFileSelect" class="form-control">
                    <option value="">Seleziona un file...</option>
    `;
    
    // Aggiungi le opzioni per ogni file
    fileList.forEach(fileName => {
        // Estrai timestamp dal nome del file per mostrare data/ora
        const timestamp = fileName.match(/dati_campione_(\d{14})/);
        let displayName = fileName;
        if (timestamp) {
            const dateStr = timestamp[1];
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const hour = dateStr.substring(8, 10);
            const minute = dateStr.substring(10, 12);
            const second = dateStr.substring(12, 14);
            displayName = `${day}/${month}/${year} ${hour}:${minute}:${second}`;
        }
        
        selectorHtml += `<option value="${fileName}">${displayName}</option>`;
    });
    
    selectorHtml += `
                </select>
                <div class="file-selector-info">
                    <p><strong>File disponibili:</strong> ${fileList.length}/8</p>
                </div>
            </div>
        </div>
    `;
    
    // Se il limite è raggiunto, aggiungi la sezione per eliminare file
    if (fileList.length >= 8) {
        selectorHtml += `
            <div class="file-limit-warning">
                <div class="warning-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Limite massimo raggiunto (8/8 file)</span>
                </div>
                <p>Per aggiungere nuovi file, elimina alcuni di quelli esistenti:</p>
                <div class="file-delete-list">
        `;
        
        fileList.forEach(fileName => {
            const timestamp = fileName.match(/dati_campione_(\d{14})/);
            let displayName = fileName;
            if (timestamp) {
                const dateStr = timestamp[1];
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                const hour = dateStr.substring(8, 10);
                const minute = dateStr.substring(10, 12);
                const second = dateStr.substring(12, 14);
                displayName = `${day}/${month}/${year} ${hour}:${minute}:${second}`;
            }
            
            selectorHtml += `
                <div class="file-delete-item">
                    <span class="file-name">${displayName}</span>
                    <button class="btn btn-danger btn-sm" onclick="eliminaFileCampione('${fileName}')">
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
    
    // Aggiungi event listener al selettore
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
        
        // Disabilita inizialmente il pulsante se non c'è selezione
        const startBtn = document.getElementById('startClassificationBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.style.opacity = '0.6';
        }
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
        
        // Esegui lo script Python del classificatore con il file selezionato
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
        
        // Genera report usando la versione corretta dalla dashboard.js
        const reportName = await generateReportFromClassificationData(result.data);
        
        if (reportName) {
            // Aggiungi attività
            addActivity('Classificazione completata', `Report "${reportName}" generato dal file ${selectedFile}`, 'fas fa-check');
            
            // Mostra notifica di completamento
            showNotification('Classificazione completata con successo! Vai alla sezione Reports per visualizzare i risultati.');
        } else {
            throw new Error('Errore nella generazione del report');
        }
        
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
async function generateReportFromClassificationData(classificationData) {
    try {
        if (!classificationData) {
            throw new Error('Nessun dato di classificazione disponibile');
        }
        
        // Genera nome univoco per il report
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
        const reportName = `Classificazione_${timestamp}`;
        
        // Prepara i dati per il report
        const reportData = [];
        
        // Se i dati provengono dal classificatore, estraili correttamente
        if (classificationData.campione) {
            const campione = classificationData.campione;
            const hp = classificationData.caratteristiche_pericolo || [];
            
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
        
        // Usa l'API dedicata per salvare il report
        const saveResult = await window.electronAPI.saveReport(`${reportName}.json`, reportData);
        
        if (!saveResult) {
            throw new Error('Errore nel salvataggio del report');
        }
        
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