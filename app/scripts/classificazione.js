// ==== Funzioni per la sezione Classificazione ====

// NOTA IMPORTANTE: queste funzioni sono definite globalmente usando l'oggetto window di electron
//                  in fondo al file avviene l'esportazione in tal senso. Questo va fatto in modo
//                  che le funzioni siano accessibili anche da altri file JS, come dashboard.js. 




// ==== Funzioni semplificate per la sezione Classificazione ====

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
            
            // Rimuovi il messaggio informativo se esiste
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

// Funzione per avviare il processo di classificazione
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
        
        // Genera automaticamente i report
        await generateClassificationReport(result.data);
        
        // Aggiungi attività
        addActivity('Classificazione completata', 'Report generato e pronto nella sezione Reports', 'fas fa-check');
        
        // Mostra notifica di completamento
        showNotification('Classificazione completata con successo! Vai alla sezione Reports per visualizzare i risultati.');
        
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

// Funzione per generare i report Excel e Word
async function generateClassificationReport(classificationData = null) {
    try {
        // Se non vengono forniti dati, usa quelli in sessione
        if (!classificationData) {
            const dataStr = sessionStorage.getItem('classificationResults');
            if (!dataStr) {
                console.warn('Nessun dato di classificazione disponibile');
                return null;
            }
            try {
                classificationData = JSON.parse(dataStr);
            } catch (e) {
                console.error('Errore nel parsing dei dati di classificazione:', e);
                return null;
            }
        }
        
        // Genera nome univoco per il report
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
        const reportName = `Classificazione_${timestamp}`;
        
        // Prepara i dati per il report
        const reportData = prepareReportData(classificationData);
        
        // Ottieni il percorso della cartella reports
        const reportsPath = await window.electronAPI.getReportsPath();
        
        // Genera il report Excel
        const excelFilePath = `${reportsPath}/${reportName}.xlsx`;
        await generateExcelReport(reportData, excelFilePath);
        
        // Genera il report Word (HTML)
        const wordFilePath = `${reportsPath}/${reportName}.html`;
        await generateWordReport(reportData, wordFilePath);
        
        // Salva il report JSON tramite l'API dedicata
        const saveResult = await window.electronAPI.saveReport(`${reportName}.json`, reportData);
        
        if (!saveResult) {
            console.warn('Errore nel salvataggio del report JSON');
        }
        
        console.log('Report generati:', reportName);
        return reportName;
    } catch (error) {
        console.error('Errore nella generazione dei report:', error);
        showNotification('Errore nella generazione dei report: ' + error.message, 'error');
        return null;
    }
}

// Funzione per preparare i dati del report in un formato adatto per Excel e Word
function prepareReportData(classificationData) {
    const reportData = [];
    
    try {
        // Ottieni le caratteristiche di pericolo
        const caratteristichePericolo = classificationData.caratteristiche_pericolo || [];
        
        // Ottieni le motivazioni per le HP
        const motivazioniHP = classificationData.motivazioni_hp || {};
        
        // Se i dati provengono dal classificatore, estraili correttamente
        if (classificationData.campione) {
            const campione = classificationData.campione;
            
            // Crea un oggetto riassuntivo per ogni sostanza
            for (const [sostanza, info] of Object.entries(campione)) {
                reportData.push({
                    'Sostanza': sostanza,
                    'Concentrazione (ppm)': info.concentrazione_ppm || 0,
                    'Concentrazione (%)': info.concentrazione_percentuale || 0,
                    'Frasi H': info.frasi_h ? info.frasi_h.join(', ') : 'N/A',
                    'Caratteristiche HP': info.caratteristiche_pericolo ? info.caratteristiche_pericolo.join(', ') : 'Nessuna',
                    'CAS': info.cas || 'N/A'
                });
            }
            
            // Aggiungi una riga con il risultato complessivo
            reportData.push({
                'Sostanza': '** RISULTATO TOTALE **',
                'Concentrazione (ppm)': '',
                'Concentrazione (%)': '',
                'Frasi H': '',
                'Caratteristiche HP': caratteristichePericolo.join(', ') || 'Nessuna caratteristica di pericolo',
                'CAS': '',
                'Note HP3': (caratteristichePericolo.includes('HP3') && motivazioniHP['HP3']) ? motivazioniHP['HP3'] : ''
            });
        } else if (Array.isArray(classificationData)) {
            // Se i dati sono già in formato tabellare, usali direttamente
            reportData.push(...classificationData);
        }
        
        // Aggiungi informazioni fisiche se disponibili
        if (classificationData.stato_fisico || classificationData.punto_infiammabilita) {
            reportData[reportData.length - 1]['Stato Fisico'] = classificationData.stato_fisico || 'N/A';
            reportData[reportData.length - 1]['Punto Infiammabilità'] = classificationData.punto_infiammabilita || 'N/A';
            reportData[reportData.length - 1]['Contiene Gasolio'] = classificationData.contiene_gasolio ? 'Sì' : 'No';
        }
        
    } catch (error) {
        console.error('Errore nella preparazione dei dati per il report:', error);
    }
    
    return reportData;
}

// Funzione per generare il report Excel
async function generateExcelReport(data, filePath) {
    try {
        // Usa l'API per esportare in Excel
        const result = await window.electronAPI.exportReportExcel(data, filePath);
        
        if (!result || !result.success) {
            throw new Error(result ? result.message : 'Errore nell\'esportazione Excel');
        }
        
        console.log('Report Excel generato:', filePath);
        
        // Aggiungi attività
        addActivity('Report Excel', 'Report Excel generato', 'fas fa-file-excel');
        
        return true;
    } catch (error) {
        console.error('Errore nella generazione del report Excel:', error);
        showNotification('Errore nella generazione del report Excel: ' + error.message, 'error');
        return false;
    }
}

// Funzione per generare il report Word
async function generateWordReport(data, filePath) {
    try {
        // Genera HTML strutturato per il report
        const now = new Date();
        const html = `
            <!DOCTYPE html>
            <html lang="it">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Report Classificazione Rifiuti</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1, h2, h3 { color: #2c3e50; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #4CAF50; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                    .footer { margin-top: 40px; text-align: center; font-style: italic; color: #7f8c8d; }
                    .result-row { font-weight: bold; background-color: #e8f5e9 !important; }
                    .note { color: #e74c3c; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Report di Classificazione Rifiuti</h1>
                <p><strong>Data:</strong> ${now.toLocaleString('it-IT')}</p>
                
                <h2>Caratteristiche Fisiche</h2>
                <table>
                    <tr>
                        <th>Stato Fisico</th>
                        <th>Punto di Infiammabilità</th>
                        <th>Contiene Gasolio/Carburanti/Oli</th>
                    </tr>
                    <tr>
                        <td>${data[data.length-1]['Stato Fisico'] || 'N/A'}</td>
                        <td>${data[data.length-1]['Punto Infiammabilità'] || 'N/A'} °C</td>
                        <td>${data[data.length-1]['Contiene Gasolio'] || 'No'}</td>
                    </tr>
                </table>
                
                <h2>Caratteristiche di Pericolo Assegnate</h2>
                <table>
                    <tr>
                        <th>Caratteristica</th>
                        <th>Descrizione</th>
                        <th>Note</th>
                    </tr>
                    ${data[data.length-1]['Caratteristiche HP'] ? 
                        data[data.length-1]['Caratteristiche HP'].split(', ').map(hp => `
                            <tr>
                                <td>${hp}</td>
                                <td>${getHPDescription(hp)}</td>
                                <td>${hp === 'HP3' && data[data.length-1]['Note HP3'] ? 
                                    `<span class="note">${data[data.length-1]['Note HP3']}</span>` : 
                                    ''}
                                </td>
                            </tr>
                        `).join('') :
                        '<tr><td colspan="3">Nessuna caratteristica di pericolo assegnata</td></tr>'
                    }
                </table>
                
                <h2>Dettaglio delle Sostanze</h2>
                <table>
                    <tr>
                        <th>Sostanza</th>
                        <th>CAS</th>
                        <th>Concentrazione (ppm)</th>
                        <th>Concentrazione (%)</th>
                        <th>Frasi H</th>
                        <th>Caratteristiche HP</th>
                    </tr>
                    ${data.map((row, index) => `
                        <tr class="${row['Sostanza'] === '** RISULTATO TOTALE **' ? 'result-row' : ''}">
                            <td>${row['Sostanza']}</td>
                            <td>${row['CAS'] || ''}</td>
                            <td>${row['Concentrazione (ppm)'] !== undefined ? row['Concentrazione (ppm)'] : ''}</td>
                            <td>${row['Concentrazione (%)'] !== undefined ? row['Concentrazione (%)'] : ''}</td>
                            <td>${row['Frasi H'] || ''}</td>
                            <td>${row['Caratteristiche HP'] || ''}</td>
                        </tr>
                    `).join('')}
                </table>
                
                <div class="footer">
                    <p>Report generato automaticamente da WasteGuard</p>
                </div>
            </body>
            </html>
        `;
        
        // Salva l'HTML come file
        await window.electronAPI.writeFile(filePath, html);
        
        console.log('Report HTML generato:', filePath);
        
        // Aggiungi attività
        addActivity('Report HTML', 'Report HTML generato', 'fas fa-file-alt');
        
        return true;
    } catch (error) {
        console.error('Errore nella generazione del report HTML:', error);
        showNotification('Errore nella generazione del report HTML: ' + error.message, 'error');
        return false;
    }
}

// Funzione helper per ottenere la descrizione delle caratteristiche di pericolo
function getHPDescription(hp) {
    const descriptions = {
        "HP1": "Esplosivo",
        "HP2": "Comburente",
        "HP3": "Infiammabile",
        "HP4": "Irritante - Irritazione cutanea e lesioni oculari",
        "HP5": "Tossicità specifica per organi bersaglio (STOT)/Tossicità in caso di aspirazione",
        "HP6": "Tossicità acuta",
        "HP7": "Cancerogeno",
        "HP8": "Corrosivo",
        "HP9": "Infettivo",
        "HP10": "Tossico per la riproduzione",
        "HP11": "Mutageno",
        "HP12": "Liberazione di gas a tossicità acuta",
        "HP13": "Sensibilizzante",
        "HP14": "Ecotossico",
        "HP15": "Rifiuto che non possiede direttamente una delle caratteristiche di pericolo summenzionate ma può manifestarla successivamente"
    };
    
    return descriptions[hp] || "Descrizione non disponibile";
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

// Assicura che l'interfaccia sia aggiornata quando il documento viene caricato
document.addEventListener('DOMContentLoaded', function() {
    updateClassificationUI();
});

// Esporta le funzioni, rendendole globali
window.initClassificazione = initClassificazione;
window.updateClassificationUI = updateClassificationUI;
window.updateClassificationFileInfo = updateClassificationFileInfo;
window.avviaClassificazione = avviaClassificazione;
window.generateClassificationReport = generateClassificationReport;
window.generateExcelReport = generateExcelReport;
window.generateWordReport = generateWordReport;
window.openReportsFolder = openReportsFolder;