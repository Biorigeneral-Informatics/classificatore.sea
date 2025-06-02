const { contextBridge, ipcRenderer } = require('electron');


// Aggiungi funzioni per controllare la finestra
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  restore: () => ipcRenderer.send('restore-window'),
  close: () => ipcRenderer.send('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized')
});



// Esposizione delle API sicure al contesto del renderer
contextBridge.exposeInMainWorld('electronAPI', {

  // Aggiungi queste API per interagire con SQLite
  querySQLite: (query, params, dbName) => ipcRenderer.invoke('query-sqlite', query, params, dbName),
  executeSQLite: (query, params, dbName) => ipcRenderer.invoke('execute-sqlite', query, params, dbName),

  // API di autenticazione
  login: (userData) => ipcRenderer.send('login-success', userData),
  logout: () => ipcRenderer.send('logout'),
  
  // API per ottenere il percorso userData
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // API per gestione file
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  /*writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data), TOLTO DA FEDE*/ 
  
  // API per reports
  saveReport: (reportName, data) => ipcRenderer.invoke('save-report', reportName, data),
  getReportsList: () => ipcRenderer.invoke('get-reports-list'),
  loadReport: (reportName) => ipcRenderer.invoke('load-report', reportName),
  deleteReport: (reportName) => ipcRenderer.invoke('delete-report', reportName),
  exportReportExcel: (reportData, filePath) => ipcRenderer.invoke('export-report-excel', reportData, filePath),
  exportReportPdf: (reportData, filePath) => ipcRenderer.invoke('export-report-pdf', reportData, filePath),
  

  // ALTRE API per gestione file e reports (AGGIUNTA ALE)
  getReportsPath: () => ipcRenderer.invoke('getReportsPath'),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  openFolder: (folderPath) => ipcRenderer.invoke('openFolder', folderPath),
  openExternal: (path) => ipcRenderer.invoke('open-external', path),
  
  // Listener per eventi dal main process
  onMenuNewProject: (callback) => {
    ipcRenderer.on('menu-new-project', callback);
    return () => ipcRenderer.removeListener('menu-new-project', callback);
  },
  onMenuImportEcha: (callback) => {
    ipcRenderer.on('menu-import-echa', callback);
    return () => ipcRenderer.removeListener('menu-import-echa', callback);
  },
  onShowAbout: (callback) => {
    ipcRenderer.on('show-about', callback);
    return () => ipcRenderer.removeListener('show-about', callback);
  },
  onShowSupport: (callback) => {
    ipcRenderer.on('show-support', callback);
    return () => ipcRenderer.removeListener('show-support', callback);
  },

  // API aggiornata per salvare i dati Excel in Python con tipo di dati
  saveExcelToPython: (data, dataType = 'raccolta') => {
    console.log(`Inviando dati di tipo: ${dataType} a main process`);
    return ipcRenderer.invoke('save-excel-to-python', data, dataType);
  },
  
  runPythonScript: (scriptName, args) => ipcRenderer.invoke('run-python-script', scriptName, args),

  // ✅ CORRETTO: Una sola definizione di saveCampioneData con parametro opzionale
  saveCampioneData: (data, fileName = null) => ipcRenderer.invoke('save-campione-data', data, fileName),
  
  // Ottiene la lista dei file campione salvati
  getCampioneFiles: () => ipcRenderer.invoke('get-campione-files'),
  
  // Elimina un file campione specifico
  deleteCampioneFile: (fileName) => ipcRenderer.invoke('delete-campione-file', fileName),

  // API per gestire i file ECHA
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  copyFile: (srcPath, destPath) => ipcRenderer.invoke('copy-file', srcPath, destPath),
  /*deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath), TOLTO DA FEDE*/
  ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', dirPath),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  openPage: (pagePath) => ipcRenderer.send('open-page', pagePath),

  // API per gestire i report e i percorsi
  getReportsPath: () => ipcRenderer.invoke('getReportsPath'),
  openFolder: (folderPath) => ipcRenderer.invoke('openFolder', folderPath),

  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // API per salvare i dati dei form di raccolta
  saveInfoRaccolta: (data) => ipcRenderer.invoke('save-info-raccolta', data),

  // API per caricare i dati dei form di raccolta
  loadInfoRaccolta: () => ipcRenderer.invoke('load-info-raccolta'),

  // API per ottenere i dati dei form per il report
  getInfoRaccolta: () => ipcRenderer.invoke('get-info-raccolta'),

  // API per verificare se esistono dati dei form salvati
  hasInfoRaccolta: () => ipcRenderer.invoke('has-info-raccolta'),

  // API per cancellare i dati dei form
  clearInfoRaccolta: () => ipcRenderer.invoke('clear-info-raccolta'),

  

});





// Esposizione di alcune variabili di Node per utilizzo nel renderer
contextBridge.exposeInMainWorld('appInfo', {
  appVersion: process.env.npm_package_version || '1.0.0',
  platform: process.platform
});