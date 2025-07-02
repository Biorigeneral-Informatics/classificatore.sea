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
  // API per interagire con SQLite
  querySQLite: (query, params, dbName) => ipcRenderer.invoke('query-sqlite', query, params, dbName),
  executeSQLite: (query, params, dbName) => ipcRenderer.invoke('execute-sqlite', query, params, dbName),

  // API per progetto raccolta unificato
  saveProgettoRaccolta: (data) => ipcRenderer.invoke('save-progetto-raccolta', data),
  loadProgettoRaccolta: () => ipcRenderer.invoke('load-progetto-raccolta'),
  hasProgettoRaccolta: () => ipcRenderer.invoke('has-progetto-raccolta'),
  deleteProgettoRaccolta: () => ipcRenderer.invoke('delete-progetto-raccolta'),

  // Aggiungi alle API esistenti nel preload.js
  getCampioneFilesWithMetadata: () => ipcRenderer.invoke('get-campione-files-with-metadata'),
  archiveClassificationResult: (fileName, result) => ipcRenderer.invoke('archive-classification-result', fileName, result),
  getArchivedResults: () => ipcRenderer.invoke('get-archived-results'),
  deleteCampioneFileWithWarning: (fileName) => ipcRenderer.invoke('delete-campione-file-with-warning', fileName),

  // API di autenticazione
  login: (userData) => ipcRenderer.send('login-success', userData),
  logout: () => ipcRenderer.send('logout'),
  
  // API per ottenere il percorso userData
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // API per gestione file
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  
  // API per reports
  saveReport: (reportName, data) => ipcRenderer.invoke('save-report', reportName, data),
  getReportsList: () => ipcRenderer.invoke('get-reports-list'),
  loadReport: (reportName) => ipcRenderer.invoke('load-report', reportName),
  deleteReport: (reportName) => ipcRenderer.invoke('delete-report', reportName),
  exportReportExcel: (reportData, filePath) => ipcRenderer.invoke('export-report-excel', reportData, filePath),
  exportReportPdf: (reportData, filePath) => ipcRenderer.invoke('export-report-pdf', reportData, filePath),
  exportReportWord: (reportData, filePath) => ipcRenderer.invoke('export-report-word', reportData, filePath),

  
  // API per gestione file e reports
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

  // API per Python e classificazione
  saveExcelToPython: (data, dataType = 'raccolta') => {
    console.log(`Inviando dati di tipo: ${dataType} a main process`);
    return ipcRenderer.invoke('save-excel-to-python', data, dataType);
  },
  runPythonScript: (scriptName, args) => ipcRenderer.invoke('run-python-script', scriptName, args),

  // API per gestione file campione
  saveCampioneData: (data, fileName = null) => ipcRenderer.invoke('save-campione-data', data, fileName),
  getCampioneFiles: () => ipcRenderer.invoke('get-campione-files'),
  deleteCampioneFile: (fileName) => ipcRenderer.invoke('delete-campione-file', fileName),

  // API per gestire i file ECHA
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  copyFile: (srcPath, destPath) => ipcRenderer.invoke('copy-file', srcPath, destPath),
  ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', dirPath),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  openPage: (pagePath) => ipcRenderer.send('open-page', pagePath),

  // API per salvare i dati dei form di raccolta (mantenute per retrocompatibilità)
  saveInfoRaccolta: (data) => ipcRenderer.invoke('save-info-raccolta', data),
  loadInfoRaccolta: () => ipcRenderer.invoke('load-info-raccolta'),
  getInfoRaccolta: () => ipcRenderer.invoke('get-info-raccolta'),
  hasInfoRaccolta: () => ipcRenderer.invoke('has-info-raccolta'),
  clearInfoRaccolta: () => ipcRenderer.invoke('clear-info-raccolta'),



  // ===================================================================
  // SEZIONE AGGIORNAMENTI - MIGLIORATA CON FIX PER PROGRESS TRACKING
  // ===================================================================
  
  // API per aggiornamenti
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkGitHubVersion: () => ipcRenderer.invoke('check-github-version'),

  // FIX: Listeners migliorati per eventi di aggiornamento con logging
  onUpdateDownloading: (callback) => {
    const wrappedCallback = (...args) => {
      console.log('🚀 Evento update-downloading ricevuto nel preload:', args);
      callback(...args);
    };
    ipcRenderer.on('update-downloading', wrappedCallback);
    return () => ipcRenderer.removeListener('update-downloading', wrappedCallback);
  },
  
  onDownloadProgress: (callback) => {
    const wrappedCallback = (...args) => {
      console.log('📥 Evento download-progress ricevuto nel preload:', args);
      // args[0] è l'event, args[1] è il progress object
      callback(...args);
    };
    ipcRenderer.on('download-progress', wrappedCallback);
    return () => ipcRenderer.removeListener('download-progress', wrappedCallback);
  },
  
  // NUOVO: Listener per errori di aggiornamento
  onUpdateError: (callback) => {
    const wrappedCallback = (...args) => {
      console.error('❌ Evento update-error ricevuto nel preload:', args);
      callback(...args);
    };
    ipcRenderer.on('update-error', wrappedCallback);
    return () => ipcRenderer.removeListener('update-error', wrappedCallback);
  },
  
  // MIGLIORATO: Rimozione listener con gestione di tutti gli eventi
  removeAllUpdateListeners: () => {
    console.log('🧹 Rimuovendo tutti i listener di aggiornamento...');
    ipcRenderer.removeAllListeners('update-downloading');
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('update-error');
  }
});

// Esposizione di alcune variabili di Node per utilizzo nel renderer
contextBridge.exposeInMainWorld('appInfo', {
  // Non usare più process.env che non funziona nel build
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform
});