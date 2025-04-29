// ==== Funzioni per la sezione Classificazione ====

// NOTA IMPORTANTE: queste funzioni sono definite globalmente usando l'oggetto window di electron
//                  in fondo al file avviene l'esportazione in tal senso. Questo va fatto in modo
//                  che le funzioni siano accessibili anche da altri file JS, come dashboard.js. 




//===============  inizializza sezione "Classificazione" ================= //
function initClassificazione() {
    // Aggiungi listener per il bottone "Avvia Classificazione"
    const startBtn = document.getElementById('startClassificationBtn');
    if (startBtn) {
        startBtn.addEventListener('click', avviaClassificazione);
    }

    // Aggiungi listener per il bottone "Salva Classificazione"
    const saveClassificationBtn = document.getElementById('saveClassificationBtn');
    if (saveClassificationBtn) {
        saveClassificationBtn.addEventListener('click', saveClassification);
    }

    // Aggiungi listener per il pulsante "Vai a reports"
    const goToReportsBtn = document.getElementById('goToReportsBtn');
    if (goToReportsBtn) {
        goToReportsBtn.addEventListener('click', openReportsFolder);
    }

    // Aggiorna l'interfaccia di classificazione all'inizializzazione
    updateClassificationUI();
}
// ========================================================================= //










//----------------------------------//
//-------------FUNZIONI------------//
//----------------------------------//


function initClassificazione() {
    // Aggiungi listener per il bottone "Avvia Classificazione"
    const startBtn = document.getElementById('startClassificationBtn');
    if (startBtn) {
        startBtn.addEventListener('click', avviaClassificazione);
    }

    // Aggiungi listener per il bottone "Salva Classificazione"
    const saveClassificationBtn = document.getElementById('saveClassificationBtn');
    if (saveClassificationBtn) {
        saveClassificationBtn.addEventListener('click', saveClassification);
    }

    // Aggiungi listener per il pulsante "Vai a reports"
    const goToReportsBtn = document.getElementById('goToReportsBtn');
    if (goToReportsBtn) {
        goToReportsBtn.addEventListener('click', openReportsFolder);
    }

    // Aggiorna l'interfaccia di classificazione all'inizializzazione
    updateClassificationUI();
}

// Funzione per salvare la classificazione in formato Word ed Excel
async function saveClassification() {
    try {
        // Mostra un indicatore di caricamento
        showNotification('Generazione dei report in corso...', 'info');
        
        // Disabilita il pulsante durante l'elaborazione
        const saveBtn = document.getElementById('saveClassificationBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generazione report...';
        }
        
        // Recupera i dati di classificazione dalla sessione o dal DOM
        // Assumiamo che i dati siano stati salvati in sessionStorage
        const classificationDataStr = sessionStorage.getItem('classificationResults');
        if (!classificationDataStr) {
            throw new Error('Nessun dato di classificazione disponibile');
        }
        
        const classificationData = JSON.parse(classificationDataStr);
        
        // Genera un nome base per i file di report
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/T/, '_')
            .replace(/:/g, '-')
            .replace(/\..+/, '');
        const baseFileName = `Classificazione_${timestamp}`;
        
        // Ottieni il percorso della cartella reports
        const reportsPath = await window.electronAPI.getReportsPath();
        
        // Genera il report Excel
        const excelPath = `${reportsPath}/${baseFileName}.xlsx`;
        const excelResult = await generateExcelReport(classificationData, excelPath);
        
        // Genera il report Word
        const wordPath = `${reportsPath}/${baseFileName}.docx`;
        const wordResult = await generateWordReport(classificationData, wordPath);
        
        // Rimuovi il file JSON temporaneo se esiste
        try {
            // Assumiamo che il file JSON temporaneo si trovi in questa posizione
            const jsonPath = 'app/data/temp_classification_results.json';
            await window.electronAPI.deleteFile(jsonPath);
            console.log('File JSON temporaneo eliminato con successo');
        } catch (deleteError) {
            console.warn('Impossibile eliminare il file JSON temporaneo:', deleteError);
            // Non interrompiamo l'esecuzione se la cancellazione fallisce
        }
        
        // Riattiva il pulsante
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Classificazione';
            saveBtn.style.display = 'none'; // Nascondi il pulsante dopo il salvataggio
        }
        
        // Mostra il pulsante "Vai a Reports"
        const goToReportsBtn = document.getElementById('goToReportsBtn');
        if (goToReportsBtn) {
            goToReportsBtn.style.display = 'inline-block';
        }
        
        // Notifica all'utente
        showNotification(`Report salvati con successo nella cartella Reports`, 'success');
        
        // Aggiungi attività
        addActivity('Classificazione salvata', `Report generati: ${baseFileName}`, 'fas fa-save');
        
        return true;
    } catch (error) {
        console.error('Errore nel salvataggio della classificazione:', error);
        showNotification('Errore nel salvataggio: ' + error.message, 'error');
        
        // Riattiva il pulsante in caso di errore
        const saveBtn = document.getElementById('saveClassificationBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Classificazione';
        }
        
        return false;
    }
}

// Funzione per generare il report Excel
async function generateExcelReport(data, filePath) {
    try {
        // Prepara i dati per l'export in Excel
        const exportData = [];
        
        // Aggiungi le informazioni per ogni sostanza
        if (data.campione) {
            for (const [sostanza, info] of Object.entries(data.campione)) {
                const caratteristichePericolo = info.caratteristiche_pericolo 
                    ? info.caratteristiche_pericolo.join(', ') 
                    : 'Nessuna';
                
                const frasiH = info.frasi_h ? info.frasi_h.join(', ') : 'Nessuna';
                
                exportData.push({
                    Sostanza: sostanza,
                    'Concentrazione (ppm)': info.concentrazione_ppm,
                    'Concentrazione (%)': info.concentrazione_percentuale,
                    'Frasi H': frasiH,
                    'Caratteristiche di Pericolo': caratteristichePericolo
                });
            }
        }
        
        // Usa l'API per esportare in Excel
        const result = await window.electronAPI.exportReportExcel(exportData, filePath);
        return result;
    } catch (error) {
        console.error('Errore nella generazione del report Excel:', error);
        throw error;
    }
}

// Funzione per generare il report Word
async function generateWordReport(data, filePath) {
    try {
        // Crea un documento Word usando Office JS o una libreria come docx
        // Nota: Questa è una funzione stub che andrà implementata con la libreria corretta
        // Per ora creeremo un HTML che poi verrà convertito in Word dal backend
        
        // Costruisci un contenuto HTML strutturato
        let html = `
            <h1>Report di Classificazione Rifiuti</h1>
            <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
            
            <h2>Caratteristiche di Pericolo Assegnate</h2>
        `;
        
        // Aggiungi le caratteristiche di pericolo assegnate
        if (data.caratteristiche_pericolo && data.caratteristiche_pericolo.length > 0) {
            html += '<ul>';
            data.caratteristiche_pericolo.forEach(hp => {
                html += `<li>${hp}</li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Nessuna caratteristica di pericolo assegnata.</p>';
        }
        
        // Aggiungi tabella con i dettagli delle sostanze
        html += `
            <h2>Dettaglio delle Sostanze</h2>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <tr style="background-color: #4CAF50; color: white;">
                    <th>Sostanza</th>
                    <th>Concentrazione (ppm)</th>
                    <th>Concentrazione (%)</th>
                    <th>Frasi H</th>
                    <th>Caratteristiche di Pericolo</th>
                </tr>
        `;
        
        // Aggiungi le righe per ogni sostanza
        if (data.campione) {
            for (const [sostanza, info] of Object.entries(data.campione)) {
                const caratteristichePericolo = info.caratteristiche_pericolo 
                    ? info.caratteristiche_pericolo.join(', ') 
                    : '';
                
                const frasiH = info.frasi_h ? info.frasi_h.join(', ') : '';
                
                html += `
                    <tr>
                        <td>${sostanza}</td>
                        <td>${info.concentrazione_ppm.toFixed(2)}</td>
                        <td>${info.concentrazione_percentuale.toFixed(6)}</td>
                        <td>${frasiH}</td>
                        <td>${caratteristichePericolo}</td>
                    </tr>
                `;
            }
        }
        
        html += '</table>';
        
        // Aggiungi sezione per le sommatorie
        html += `
            <h2>Sommatoria delle Concentrazioni per Frase H</h2>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <tr style="background-color: #4CAF50; color: white;">
                    <th>Frase H</th>
                    <th>Concentrazione Totale (%)</th>
                    <th>Soglia (%)</th>
                    <th>Stato</th>
                </tr>
        `;
        
        // Filtra le frasi H con concentrazioni maggiori di zero
        const frasiRilevanti = {};
        for (const [frase, valore] of Object.entries(data.sommatoria || {})) {
            if (valore > 0) {
                frasiRilevanti[frase] = valore;
            }
        }
        
        // Aggiungi le righe per ogni frase H
        for (const [frase, valore] of Object.entries(frasiRilevanti)) {
            const soglia = data.soglie_sommatoria && data.soglie_sommatoria[frase] ? data.soglie_sommatoria[frase] : 'N/A';
            const superaSoglia = soglia !== 'N/A' && valore >= soglia;
            
            html += `
                <tr>
                    <td>${frase}</td>
                    <td>${valore.toFixed(6)}</td>
                    <td>${soglia}</td>
                    <td>${superaSoglia ? 'SUPERA LA SOGLIA' : ''}</td>
                </tr>
            `;
        }
        
        html += '</table>';
        
        // Firma e footer
        html += `
            <p style="margin-top: 50px; text-align: center; font-style: italic;">
                Documento generato automaticamente da WasteGuard
            </p>
        `;
        
        // Invia l'HTML al backend per convertirlo in Word
        // Questo è solo uno stub - si dovrà implementare la conversione HTML -> DOCX
        // Una soluzione potrebbe essere salvare l'HTML e poi usare una libreria server-side
        
        // Per il momento, salviamo un file HTML che poi può essere aperto con Word
        const htmlFilePath = filePath.replace('.docx', '.html');
        await window.electronAPI.writeFile(htmlFilePath, html);
        
        console.log('Report HTML generato. Conversione in DOCX da implementare.');
        return true;
    } catch (error) {
        console.error('Errore nella generazione del report Word:', error);
        throw error;
    }
}

// Verifica se ci sono dati campione disponibili e aggiorna l'interfaccia di conseguenza
async function updateClassificationUI() {
    try {
        // Controlla se esiste il file dati_campione.json
        const fileExists = await window.electronAPI.fileExists('app/data/dati_campione.json');
        
        // Ottieni il container della sezione classificazione
        const sectionContainer = document.getElementById('classificazione');
        const fileInfo = document.getElementById('classificationFileInfo');
        const startBtn = document.getElementById('startClassificationBtn');
        const infoMessage = document.getElementById('classificationInfoMessage');
        
        if (fileExists) {
            // Se esiste, mostra il pulsante "Avvia Classificazione" e le info sul file
            if (fileInfo) fileInfo.style.display = 'block';
            if (startBtn) startBtn.style.display = 'inline-block';
            
            // Aggiornamento: rimuovi il messaggio informativo se esiste
            if (infoMessage) {
                infoMessage.remove();
            }
            
            // Aggiorna le informazioni sul file
            updateClassificationFileInfo();
        } else {
            // Se non esiste, mostra un messaggio che invita l'utente a caricare un file
            if (fileInfo) fileInfo.style.display = 'none';
            if (startBtn) startBtn.style.display = 'none';
            
            // Aggiungi un messaggio informativo se non esiste già
            if (!infoMessage) {
                const messageDiv = document.createElement('div');
                messageDiv.id = 'classificationInfoMessage';
                messageDiv.className = 'no-data-message';
                messageDiv.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <p>Nessun dato disponibile per la classificazione.</p>
                    <p>Completa prima l'assegnazione dei Sali-Metalli.</p>
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

// Funzione per avviare il processo di classificazione con gestione JSON temporaneo
async function avviaClassificazione() {
    try {
        // Mostra un indicatore di caricamento
        showNotification('Avvio classificazione in corso...', 'info');
        
        // Disabilita il pulsante durante l'elaborazione
        const startBtn = document.getElementById('startClassificationBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Elaborazione...';
        }
        
        // Esegui lo script Python del classificatore
        const result = await window.electronAPI.runPythonScript('classificatore.py', []);
        
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
        // Questa è la parte principale che cambia: non salviamo più su disco ma in memoria
        sessionStorage.setItem('classificationResults', JSON.stringify(result.data));
        
        // Mostra i risultati nella UI
        renderClassificationResults(result.data);
        
        // Mostra il pulsante "Salva Classificazione"
        const saveClassificationBtn = document.getElementById('saveClassificationBtn');
        if (saveClassificationBtn) {
            saveClassificationBtn.style.display = 'inline-block';
        }
        
        // Aggiungi attività
        addActivity('Classificazione completata', 'Risultati pronti per il salvataggio', 'fas fa-check');
        
        // Mostra notifica di completamento
        showNotification('Classificazione completata con successo!');
        
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

// Funzione per renderizzare i risultati della classificazione
function renderClassificationResults(data) {
    // Ottieni i container dei risultati
    const resultsContainer = document.getElementById('classificationResultsContainer');
    const tableBody = document.querySelector('#classificationResultsTable tbody');
    
    if (!resultsContainer || !tableBody) {
        console.error('Container dei risultati non trovati');
        return;
    }
    
    // Mostra il container dei risultati
    resultsContainer.style.display = 'block';
    
    // Svuota la tabella
    tableBody.innerHTML = '';
    
    // Verifica la struttura dei dati ricevuti
    if (!data || !data.campione) {
        console.error('Struttura dati non valida per la visualizzazione');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table-message">
                    Dati non validi o non disponibili.
                </td>
            </tr>
        `;
        return;
    }
    
    // Popola la tabella con i risultati
    for (const [sostanza, info] of Object.entries(data.campione)) {
        const row = document.createElement('tr');
        
        const caratteristichePericolo = info.caratteristiche_pericolo 
            ? info.caratteristiche_pericolo.join(', ') 
            : 'Nessuna';
        
        // Assicurati che il valore numerico sia visualizzato correttamente
        const concentrazionePpm = typeof info.concentrazione_ppm === 'number' 
            ? info.concentrazione_ppm.toFixed(2) 
            : info.concentrazione_ppm;
        
        // Ottieni il fattore di conversione se disponibile (per i metalli)
        const fattoreConversione = info.fattore_conversione 
            ? info.fattore_conversione.toFixed(4) 
            : 'N/A';
        
        row.innerHTML = `
            <td>${info.cas || 'N/A'}</td>
            <td>-</td>
            <td>-</td>
            <td>${sostanza}</td>
            <td>${concentrazionePpm} ppm</td>
            <td>${fattoreConversione}</td>
            <td>${info.frasi_h ? info.frasi_h.join(', ') : 'N/A'}</td>
            <td>${caratteristichePericolo}</td>
        `;
        
        tableBody.appendChild(row);
    }
    
    // Mostra anche informazioni sulle caratteristiche di pericolo assegnate globalmente
    const hpContainer = document.createElement('div');
    hpContainer.className = 'mt-4';
    hpContainer.innerHTML = `
        <h3>Caratteristiche di Pericolo assegnate</h3>
        <p>${data.caratteristiche_pericolo.length > 0 
            ? data.caratteristiche_pericolo.join(', ') 
            : 'Nessuna caratteristica di pericolo assegnata'}</p>
    `;
    
    resultsContainer.appendChild(hpContainer);
    
    // Ottieni anche il pulsante per generare il report
    const saveBtn = document.getElementById('saveClassificationBtn');
    if (saveBtn) {
        saveBtn.style.display = 'inline-block';
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
        
    } catch (error) {
        console.error('Errore nell\'apertura della cartella dei report:', error);
        showNotification('Errore nell\'apertura della cartella dei report', 'error');
    }
}



document.addEventListener('DOMContentLoaded', function() {
    // Chiama direttamente la funzione di aggiornamento dell'interfaccia di classificazione
    updateClassificationUI();
});



/* 
 * NOTA: Tutte le funzioni sono rese disponibili globalmente tramite l'oggetto window.
 * Questo permette a queste funzioni di essere chiamate da qualsiasi altro file JavaScript,
 * incluso dashboard.js.
 */

// Esporta TUTTE le funzioni, rendendole globali
window.initClassificazione = initClassificazione;
window.saveClassification = saveClassification;
window.generateExcelReport = generateExcelReport;
window.generateWordReport = generateWordReport;
window.updateClassificationUI = updateClassificationUI;
window.updateClassificationFileInfo = updateClassificationFileInfo;
window.avviaClassificazione = avviaClassificazione;
window.renderClassificationResults = renderClassificationResults;
window.openReportsFolder = openReportsFolder;