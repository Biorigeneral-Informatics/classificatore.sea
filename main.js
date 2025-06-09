const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { spawn } = require('child_process');
const os = require('os');
const Database = require('better-sqlite3');


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

// Funzione helper per estrarre numero campionamento dal nome file
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


// NUOVA: Funzione per estrarre committente dal nome file
function extractCommittenteFromFileName(fileName) {
    // Formato: dati_campione_CODICE-EER_data_COMMITTENTE.json
    const match = fileName.match(/dati_campione_.+?_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}_(.+?)\.json/);
    if (match) {
        return match[1].replace(/_/g, ' '); // Riconverti underscore in spazi
    }
    
    return 'Committente_Sconosciuto';
}

// NUOVA: Funzione per estrarre data e ora dal nome file
// CORRETTO: Funzione per estrarre data e ora dal nome file o metadati
function extractDataOraFromFileName(fileName, metadata = null) {
    // Prima prova a estrarre dal nome file (formato attuale)
    const match = fileName.match(/(\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2})/);
    if (match) {
        return match[1].replace(/_/g, ' '); // Formato: 25-12-2024 14-30-25
    }
    
    // Se non trovato nel nome file, prova a costruire dai metadati
    if (metadata && metadata.dataCampionamento) {
        const dataCampionamento = new Date(metadata.dataCampionamento);
        const dataFormattata = dataCampionamento.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        });
        
        // Se abbiamo anche timestamp del progetto, estrapolane l'orario
        if (metadata.timestampProgetto) {
            const timestampProgetto = new Date(metadata.timestampProgetto);
            const orarioFormattato = timestampProgetto.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).replace(/:/g, '-');
            
            return `${dataFormattata} ${orarioFormattato}`;
        }
        
        // Altrimenti usa solo la data
        return `${dataFormattata} Ora-Non-Disponibile`;
    }
    
    return 'Data_Non_Disponibile';
}






// Funzione semplificata per inizializzare il database in userData
function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const userDbPath = path.join(userDataPath, 'database_app.db');
  
  // Se il database non esiste in userData, lo copiamo dal bundle
  if (!fs.existsSync(userDbPath)) {
    let sourceDbPath;
    
    if (app.isPackaged) {
      // In produzione: prendi dal bundle
      sourceDbPath = path.join(process.resourcesPath, 'app', 'DB', 'database_app.db');
    } else {
      // In sviluppo: prendi dalla directory del progetto
      sourceDbPath = path.join(__dirname, 'app', 'DB', 'database_app.db');
    }
    
    console.log(`Copio database da: ${sourceDbPath}`);
    console.log(`Destinazione: ${userDbPath}`);
    
    try {
      // Verifica che il database sorgente esista
      if (!fs.existsSync(sourceDbPath)) {
        throw new Error(`Database non trovato: ${sourceDbPath}`);
      }
      
      // Crea la directory userData se non esiste
      const userDbDir = path.dirname(userDbPath);
      if (!fs.existsSync(userDbDir)) {
        fs.mkdirSync(userDbDir, { recursive: true });
      }
      
      // Copia il database
      fs.copyFileSync(sourceDbPath, userDbPath);
      console.log('Database copiato con successo in userData');
      
    } catch (error) {
      console.error('Errore nella copia del database:', error);
      throw error;
    }
  } else {
    console.log('Database già presente in userData');
  }
  
  return userDbPath;
}

// Inizializza il database e imposta il percorso
const DB_PATH = initializeDatabase();


// Inizializzazione dello store per i dati persistenti
const store = new Store();

let mainWindow;
let loginWindow;

// Funzione helper per eseguire comandi Python (USA SEMPRE .venv)
// Funzione helper per eseguire comandi Python (USA SEMPRE .venv)
function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const isDev = !app.isPackaged;
    
    console.log('===========================================');
    console.log('PYTHON SCRIPT EXECUTION');
    console.log(`Script: ${scriptName}`);
    console.log(`Packaged: ${app.isPackaged}`);
    console.log(`Platform: ${process.platform}`);
    console.log('===========================================');
    
    // Determina i percorsi base
    let pythonCmd;
    let venvPath;
    let scriptPath;
    
    if (isDev) {
      // === MODALITÀ SVILUPPO ===
      console.log('Running in DEVELOPMENT mode');
      
      // Python path in sviluppo
      venvPath = path.join(__dirname, '.venv');
      pythonCmd = isWin ? 
        path.join(venvPath, 'Scripts', 'python.exe') : 
        path.join(venvPath, 'bin', 'python');
      
      // Script path in sviluppo
      scriptPath = path.join(__dirname, 'app', scriptName);
      
      console.log(`Dev venv path: ${venvPath}`);
      console.log(`Dev python cmd: ${pythonCmd}`);
      console.log(`Dev script path: ${scriptPath}`);
      
    } else {
      // === MODALITÀ PRODUZIONE ===
      console.log('Running in PRODUCTION mode');
      console.log(`App path: ${app.getAppPath()}`);
      console.log(`Resources path: ${process.resourcesPath}`);
      
      // In produzione, i file in extraResources vanno in process.resourcesPath
      venvPath = path.join(process.resourcesPath, '.venv');
      pythonCmd = isWin ? 
        path.join(venvPath, 'Scripts', 'python.exe') : 
        path.join(venvPath, 'bin', 'python');
      
      // Gli script Python vanno anche loro in extraResources
      scriptPath = path.join(process.resourcesPath, 'app', scriptName);
      
      console.log(`Prod venv path: ${venvPath}`);
      console.log(`Prod python cmd: ${pythonCmd}`);
      console.log(`Prod script path: ${scriptPath}`);
    }
    
    // Verifica esistenza Python
    console.log('\nChecking Python executable...');
    if (!fs.existsSync(pythonCmd)) {
      const errorMsg = `Python NOT FOUND at: ${pythonCmd}`;
      console.error(errorMsg);
      
      // Log aggiuntivi per debug
      console.log('\nDirectory listing for parent folder:');
      const parentDir = path.dirname(pythonCmd);
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        files.forEach(file => console.log(`  - ${file}`));
      } else {
        console.log(`  Parent directory does not exist: ${parentDir}`);
      }
      
      // Controlla se esiste il venv
      if (!fs.existsSync(venvPath)) {
        console.error(`Virtual environment NOT FOUND at: ${venvPath}`);
        
        // Lista contenuto della directory resources in produzione
        if (!isDev && fs.existsSync(process.resourcesPath)) {
          console.log('\nResources directory content:');
          const resourceFiles = fs.readdirSync(process.resourcesPath);
          resourceFiles.forEach(file => console.log(`  - ${file}`));
        }
      }
      
      resolve({
        success: false,
        message: `Python non trovato. Percorso cercato: ${pythonCmd}`
      });
      return;
    }
    console.log('Python executable found!');
    
    // Verifica esistenza script
    console.log('\nChecking Python script...');
    if (!fs.existsSync(scriptPath)) {
      const errorMsg = `Script NOT FOUND at: ${scriptPath}`;
      console.error(errorMsg);
      
      // Log directory dello script per debug
      const scriptDir = path.dirname(scriptPath);
      if (fs.existsSync(scriptDir)) {
        console.log(`\nScript directory content (${scriptDir}):`);
        const files = fs.readdirSync(scriptDir);
        files.forEach(file => console.log(`  - ${file}`));
      } else {
        console.log(`  Script directory does not exist: ${scriptDir}`);
      }
      
      resolve({
        success: false,
        message: `Script Python non trovato. Percorso cercato: ${scriptPath}`
      });
      return;
    }
    console.log('Python script found!');
    
    // Prepara gli argomenti
    console.log('\nStarting Python process...');
    console.log(`Arguments: ${args.length > 0 ? args.join(' ') : 'none'}`);
    
    // Crea processo Python
    const python = spawn(pythonCmd, [scriptPath, ...args], {
      env: { ...process.env },
      windowsHide: true // Nasconde la finestra della console su Windows
    });
    
    let dataString = '';
    let errorString = '';
    let outputStarted = false;

    // Raccoglie dati dall'output standard
    python.stdout.on('data', (data) => {
      const output = data.toString();
      if (!outputStarted) {
        console.log('\nPython output started...');
        outputStarted = true;
      }
      dataString += output;
      
      // Log solo le prime righe per debug
      const lines = output.split('\n');
      const preview = lines[0].substring(0, 100);
      if (preview.trim()) {
        console.log(`Output: ${preview}${lines[0].length > 100 ? '...' : ''}`);
      }
    });

    // Raccoglie eventuali errori
    python.stderr.on('data', (data) => {
      const error = data.toString();
      errorString += error;
      
      // Log errori Python (potrebbero essere anche solo warning)
      const lines = error.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(`Python stderr: ${line.trim()}`);
        }
      });
    });

    // Gestisce eventuali errori di spawn
    python.on('error', (error) => {
      console.error('\nFailed to start Python process:', error);
      resolve({
        success: false,
        message: `Impossibile avviare Python: ${error.message}`
      });
    });

    // Gestisce la chiusura del processo
    python.on('close', (code) => {
      console.log(`\nPython process exited with code: ${code}`);
      
      if (code !== 0) {
        console.error('Python process failed');
        if (errorString) {
          console.error('Error details:', errorString);
        }
        
        resolve({
          success: false,
          message: `Errore nell'esecuzione dello script Python (exit code: ${code}). ${errorString || 'Nessun dettaglio errore disponibile.'}`
        });
        return;
      }
      
      // Processo completato con successo
      console.log('Python process completed successfully');
      
      try {
        // Cerca l'inizio del JSON nell'output
        const jsonStartIndex = dataString.indexOf('{');
        const jsonEndIndex = dataString.lastIndexOf('}');
        
        if (jsonStartIndex === -1 || jsonEndIndex === -1) {
          throw new Error('Nessun JSON valido trovato nell\'output');
        }
        
        // Estrai il JSON
        const jsonString = dataString.substring(jsonStartIndex, jsonEndIndex + 1);
        console.log(`Parsing JSON (${jsonString.length} characters)...`);
        
        const jsonData = JSON.parse(jsonString);
        console.log('JSON parsed successfully');
        console.log('===========================================\n');
        
        resolve(jsonData);
        
      } catch (e) {
        console.error('Error parsing Python output as JSON:', e.message);
        console.error('Raw output preview:', dataString.substring(0, 200) + '...');
        console.log('===========================================\n');
        
        // Se non è JSON, restituisci comunque l'output raw
        resolve({
          success: false,
          message: `Errore nel parsing JSON: ${e.message}`,
          rawOutput: dataString,
          errorOutput: errorString
        });
      }
    });
  });
}


// Crea la directory dei database se non esiste
function ensureDirectoriesExist() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'db');
  const reportsPath = path.join(userDataPath, 'reports');
  
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  
  if (!fs.existsSync(reportsPath)) {
    fs.mkdirSync(reportsPath, { recursive: true });
  }
  
  return { dbPath, reportsPath };
}

// Creazione finestra di login
function createLoginWindow() {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  
  loginWindow = new BrowserWindow({
    width: width,          // Imposta larghezza al 100% dello schermo
    height: height,        // Imposta altezza al 100% dello schermo
    frame: true,
    transparent: false,
    maximized: true,  
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Per avviare direttamente in modalità fullscreen
  // loginWindow.setFullScreen(true);

  loginWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
  
  // Uncomment per debug
  // loginWindow.webContents.openDevTools();
  
  loginWindow.on('closed', () => {
    loginWindow = null;
    if (!mainWindow) {
      app.quit();
    }
  });
}

// Creazione finestra principale
function createMainWindow() {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: width,          // Imposta larghezza al 100% dello schermo
    height: height,        // Imposta altezza al 100% dello schermo
    minWidth: 800,
    minHeight: 600,
    frame: true, 
    maximized: true,       
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Per avviare direttamente in modalità fullscreen
  // mainWindow.setFullScreen(true);

  mainWindow.loadFile(path.join(__dirname, 'app', 'dashboard.html'));
  
  // Uncomment per debug
  // mainWindow.webContents.openDevTools();
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (loginWindow) {
      loginWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
  
  // Crea il menu dell'applicazione
  createApplicationMenu();
}

// Creazione del menu applicativo
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuovo progetto',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-project');
            }
          }
        },
        {
          label: 'Importa dati ECHA',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-import-echa');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Apri cartella reports',
          click: async () => {
            const { reportsPath } = ensureDirectoriesExist();
            shell.openPath(reportsPath);
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Voce',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    {
      label: 'Visualizza',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Aiuto',
      submenu: [
        {
          label: 'Guida rapida',
          click: async () => {
            await shell.openExternal('https://biorigeneral.it/guida-waste-guard');
          }
        },
        {
          label: 'Informazioni',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-about');
            }
          }
        },
        {
          label: 'Richiedi assistenza',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-support');
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Funzione per controllare le dipendenze Python
// Funzione per controllare le dipendenze Python (CORRETTA)
// Funzione per controllare le dipendenze Python (USA SEMPRE .venv)
function checkPythonDependencies() {
  return new Promise((resolve, reject) => {
    // Usa il percorso specifico all'ambiente virtuale Python - sempre .venv
    let pythonCmd;
    
    if (app.isPackaged) {
      // App impacchettata: .venv è in process.resourcesPath
      pythonCmd = process.platform === 'win32' 
        ? path.join(process.resourcesPath, '.venv', 'Scripts', 'python.exe')
        : path.join(process.resourcesPath, '.venv', 'bin', 'python');
    } else {
      // Sviluppo: .venv è nella directory del progetto
      pythonCmd = process.platform === 'win32' 
        ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
        : path.join(__dirname, '.venv', 'bin', 'python');
    }
    
    console.log(`🔍 Controllo dipendenze Python con: ${pythonCmd}`);
    
    // Verifica che Python esista
    if (!fs.existsSync(pythonCmd)) {
      console.error(`❌ Python non trovato in: ${pythonCmd}`);
      resolve(); // Non bloccare l'avvio
      return;
    }
    
    const checkScript = `
import importlib.util
import sys

required_packages = ['pandas', 'numpy', 'openpyxl', 'xlrd']
missing_packages = []

for package in required_packages:
    try:
        __import__(package)
        print(f"Package {package} is installed")
    except ImportError:
        missing_packages.append(package)

if missing_packages:
    print(f"Missing packages: {', '.join(missing_packages)}")
    sys.exit(1)
else:
    print("All dependencies are installed")
    sys.exit(0)
`;

    // Salva lo script in un file temporaneo
    const tempFile = path.join(os.tmpdir(), 'check_deps.py');
    fs.writeFileSync(tempFile, checkScript);
    
    const python = spawn(pythonCmd, [tempFile]);
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString());
    });
    
    python.stderr.on('data', (data) => {
      output += data.toString();
      console.error(data.toString());
    });
    
    python.on('close', (code) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.warn('Non è stato possibile eliminare il file temporaneo');
      }
      
      if (code !== 0) {
        console.error(`❌ Missing Python dependencies: ${output}`);
        resolve(); // Non bloccare l'avvio
      } else {
        console.log('✅ All Python dependencies are installed');
        resolve();
      }
    });
    
    python.on('error', (error) => {
      console.error(`❌ Errore nell'avvio di Python: ${error.message}`);
      resolve(); // Non bloccare l'avvio
    });
  });
}







//****************************************************************************** */
//****************************************************************************** */
//****************************************************************************** */
//****************************************************************************** */
//****************************************************************************** */
//****************************************************************************** */
//****************************************************************************** */
//****************************************************************************** */






// =======  HANDLE ============ //
// qui si egstiscono le API chiamate in preload

app.whenReady().then(async () => {
  try {
    // Controlla le dipendenze Python all'avvio
    await checkPythonDependencies();
    
    ensureDirectoriesExist();
    createLoginWindow();

    //------- inizio ipcMain.On -----------//

    ipcMain.on('minimize-window', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.minimize();
    });
    
    ipcMain.on('maximize-window', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        if (win.isMaximized()) {
          win.restore();
        } else {
          win.maximize();
        }
      }
    });
    
    ipcMain.on('restore-window', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win && win.isMaximized()) win.restore();
    });
    
    ipcMain.on('close-window', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.close();
    });
    
    ipcMain.handle('is-maximized', () => {
      const win = BrowserWindow.getFocusedWindow();
      return win ? win.isMaximized() : false;
    });

    // Gestione evento login
    ipcMain.on('login-success', (event, userData) => {
      store.set('isLoggedIn', true);
      store.set('userData', userData);
      createMainWindow();
    });
    
    // Gestione evento logout
    ipcMain.on('logout', () => {
      store.set('isLoggedIn', false);
      store.delete('userData');
      if (mainWindow) {
        mainWindow.close();
        mainWindow = null;
      }
      createLoginWindow();
    });

     //Gestione evento raggiungimento sezione ECHA database
     ipcMain.on('open-page', (event, pagePath) => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
          const fullPath = path.join(__dirname, 'app', pagePath);
          win.loadFile(fullPath);
        }
      } catch (error) {
        console.error('Errore nel caricamento della pagina:', error);
      }
    });


    //--------- fine ipcMain.on-----------//

    //--------- inizio ipcMain.Handle----------//
    

    // Handler per ottenere il percorso userData
    ipcMain.handle('get-user-data-path', async () => {
        return app.getPath('userData');
    });


    // Gestione selezione file
    ipcMain.handle('select-file', async (event, options) => {
      const { canceled, filePaths } = await dialog.showOpenDialog(options);
      if (canceled) {
        return null;
      } else {
        return filePaths[0];
      }
    });
    
    // Gestione salvataggio file
    ipcMain.handle('save-file', async (event, options) => {
      const { canceled, filePath } = await dialog.showSaveDialog(options);
      if (canceled) {
        return null;
      } else {
        return filePath;
      }
    });

    // NUOVO: Handler per salvare progetto unificato
    ipcMain.handle('save-progetto-raccolta', async (event, progettoData) => {
        try {
            const userDataPath = app.getPath('userData');
            const progettoPath = path.join(userDataPath, 'progetto_completo.json');
            
            console.log(`Salvando progetto unificato in: ${progettoPath}`);
            
            // Gestione versione incrementale se file esiste già
            let finalData = progettoData;
            if (fs.existsSync(progettoPath)) {
                try {
                    const existingData = JSON.parse(fs.readFileSync(progettoPath, 'utf8'));
                    if (existingData.id === progettoData.id) {
                        // Stesso committente+data, incrementa versione
                        finalData.versione = (existingData.versione || 1) + 1;
                        finalData.id = `${progettoData.id}_v${finalData.versione}`;
                        console.log(`Progetto esistente trovato, creata versione incrementale: ${finalData.id}`);
                    }
                } catch (e) {
                    console.warn('Errore nel leggere progetto esistente, sovrascrivo:', e.message);
                }
            }
            
            // Salva il file JSON
            fs.writeFileSync(progettoPath, JSON.stringify(finalData, null, 2));
            
            console.log(`Progetto unificato salvato con successo: ${finalData.id}`);
            
            return {
                success: true,
                message: 'Progetto unificato salvato con successo',
                id: finalData.id,
                path: progettoPath
            };
        } catch (error) {
            console.error('Errore nel salvataggio del progetto unificato:', error);
            return {
                success: false,
                message: `Errore nel salvataggio: ${error.message}`
            };
        }
    });

    // NUOVO: Handler per caricare progetto unificato
    ipcMain.handle('load-progetto-raccolta', async () => {
        try {
            const userDataPath = app.getPath('userData');
            const progettoPath = path.join(userDataPath, 'progetto_completo.json');
            
            if (fs.existsSync(progettoPath)) {
                const data = fs.readFileSync(progettoPath, 'utf8');
                const progetto = JSON.parse(data);
                
                console.log(`Progetto caricato: ${progetto.id}`);
                return {
                    success: true,
                    data: progetto
                };
            } else {
                return {
                    success: false,
                    message: 'Nessun progetto trovato'
                };
            }
        } catch (error) {
            console.error('Errore nel caricamento del progetto:', error);
            return {
                success: false,
                message: `Errore nel caricamento: ${error.message}`
            };
        }
    });

    // NUOVO: Handler per verificare esistenza progetto
    ipcMain.handle('has-progetto-raccolta', async () => {
        try {
            const userDataPath = app.getPath('userData');
            const progettoPath = path.join(userDataPath, 'progetto_completo.json');
            return fs.existsSync(progettoPath);
        } catch (error) {
            console.error('Errore nel controllo esistenza progetto:', error);
            return false;
        }
    });

    // NUOVO: Handler per eliminare progetto (sarà usato in Step 2)
    ipcMain.handle('delete-progetto-raccolta', async () => {
        try {
            const userDataPath = app.getPath('userData');
            const progettoPath = path.join(userDataPath, 'progetto_completo.json');
            
            if (fs.existsSync(progettoPath)) {
                fs.unlinkSync(progettoPath);
                console.log('Progetto temporaneo eliminato con successo');
                return {
                    success: true,
                    message: 'Progetto eliminato con successo'
                };
            } else {
                return {
                    success: false,
                    message: 'Nessun progetto da eliminare'
                };
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione del progetto:', error);
            return {
                success: false,
                message: `Errore nell'eliminazione: ${error.message}`
            };
        }
    });
    
    // MODIFICATO: Handler per ottenere i file campione con info sui committenti usando codice EER
  // CORRETTO: Handler per ottenere i file campione con metadati completi
  ipcMain.handle('get-campione-files-with-metadata', async () => {
      try {
          const campioneDir = path.join(app.getPath('userData'), 'campione_data');
          
          // Crea la directory se non esiste
          if (!fs.existsSync(campioneDir)) {
              fs.mkdirSync(campioneDir, { recursive: true });
              return [];
          }
          
          // Leggi tutti i file .json nella directory
          const files = fs.readdirSync(campioneDir)
              .filter(file => file.endsWith('.json'))
              .map(fileName => {
                  try {
                      // Leggi il contenuto del file per estrarre i metadati
                      const filePath = path.join(campioneDir, fileName);
                      const fileContent = fs.readFileSync(filePath, 'utf8');
                      const data = JSON.parse(fileContent);
                      
                      // Estrai metadati se presenti
                      const metadata = data._metadata || {};
                      
                      // CORRETTO: Estrai info usando codice EER e passa metadati per data/ora
                      const codiceEER = metadata.infoCertificato?.codiceEER || extractCodiceEERFromFileName(fileName);
                      const committente = metadata.committente || extractCommittenteFromFileName(fileName);
                      const dataOra = extractDataOraFromFileName(fileName, metadata); // Passa i metadati
                      
                      return {
                          fileName,
                          codiceEER: codiceEER,
                          committente: committente,
                          dataCampionamento: metadata.dataCampionamento || 'Data non disponibile',
                          dataOra: dataOra,
                          idProgetto: metadata.idProgetto || 'ID non disponibile'
                      };
                  } catch (e) {
                      console.warn(`Errore nel leggere metadati da ${fileName}:`, e.message);
                      return {
                          fileName,
                          codiceEER: extractCodiceEERFromFileName(fileName),
                          committente: extractCommittenteFromFileName(fileName),
                          dataCampionamento: 'Data non disponibile',
                          dataOra: extractDataOraFromFileName(fileName),
                          idProgetto: 'ID non disponibile'
                      };
                  }
              })
              .sort((a, b) => {
                  // Ordina per timestamp (più recente per primo)
                  const timestampA = a.fileName.match(/(\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2})/)?.[1] || '0';
                  const timestampB = b.fileName.match(/(\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2})/)?.[1] || '0';
                  return timestampB.localeCompare(timestampA);
              });
          
          console.log(`Trovati ${files.length} file campione con metadati completi`);
          return files;
      } catch (error) {
          console.error('Errore nel recupero dei file campione con metadati:', error);
          return [];
      }
  });

    // MODIFICATO: Handler per archiviare risultato classificazione con codice EER
    ipcMain.handle('archive-classification-result', async (event, fileName, classificationResult) => {
        try {
            const userDataPath = app.getPath('userData');
            const campioneDir = path.join(userDataPath, 'campione_data');
            const archiveDir = path.join(userDataPath, 'campione_data', 'archiviati');
            
            // Crea directory archiviati se non esiste
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir, { recursive: true });
                console.log(`Creata directory archiviati: ${archiveDir}`);
            }
            
            // Percorso file originale
            const originalPath = path.join(campioneDir, fileName);
            
            // MODIFICATO: Genera nome per il risultato archiviato usando codice EER
            let codiceEER = 'EER_MANCANTE';

            // Prova a estrarre codice EER dal nome del file (nuovo formato)
            const codiceEERMatch = fileName.match(/dati_campione_(.+?)_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}_(.+?)\.json/);
            if (codiceEERMatch) {
                codiceEER = codiceEERMatch[1];
            } else {
                // Prova a estrarre dai metadati del risultato di classificazione
                const metadata = classificationResult.data?._metadata;
                if (metadata?.infoCertificato?.codiceEER) {
                    codiceEER = metadata.infoCertificato.codiceEER;
                } else if (metadata?.infoCertificato?.numeroCampionamento) {
                    // Fallback a numero campionamento per compatibilità
                    codiceEER = `LEGACY_${metadata.infoCertificato.numeroCampionamento}`;
                } else {
                    // Fallback formato molto vecchio con timestamp
                    const oldFormatMatch = fileName.match(/dati_campione_(\d{14})/);
                    if (oldFormatMatch) {
                        codiceEER = `TIMESTAMP_${oldFormatMatch[1]}`;
                    }
                }
            }

            const dataOraItaliana = generateItalianDateTime();
            const resultFileName = `risultato_classificazione_${codiceEER}_${dataOraItaliana}.json`;
            const resultPath = path.join(archiveDir, resultFileName);
                            
            // Salva il risultato della classificazione in archiviati
            fs.writeFileSync(resultPath, JSON.stringify(classificationResult, null, 2));
            console.log(`Risultato classificazione salvato in: ${resultPath}`);
            
            // Rimuovi il file originale da campione_data (non da archiviati)
            if (fs.existsSync(originalPath)) {
                fs.unlinkSync(originalPath);
                console.log(`File originale rimosso: ${originalPath}`);
            }
            
            return {
                success: true,
                message: 'Classificazione archiviata con successo',
                archivedFile: resultFileName
            };
        } catch (error) {
            console.error('Errore nell\'archiviazione della classificazione:', error);
            return {
                success: false,
                message: `Errore nell'archiviazione: ${error.message}`
            };
        }
    });

    // NUOVO: Handler per ottenere risultati archiviati
    ipcMain.handle('get-archived-results', async () => {
        try {
            const archiveDir = path.join(app.getPath('userData'), 'campione_data', 'archiviati');
            
            if (!fs.existsSync(archiveDir)) {
                return [];
            }
            
            const files = fs.readdirSync(archiveDir)
                .filter(file => file.endsWith('.json'))
                .map(fileName => {
                    try {
                        const filePath = path.join(archiveDir, fileName);
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        const data = JSON.parse(fileContent);
                        
                        // Estrai metadati dal risultato
                        const metadata = data.data?._metadata || {};
                        
                        return {
                            fileName,
                            committente: metadata.committente || 'Committente Sconosciuto',
                            dataCampionamento: metadata.dataCampionamento || 'Data non disponibile',
                            caratteristichePericolo: data.data?.caratteristiche_pericolo || [],
                            timestampClassificazione: data.data?.timestamp_classificazione || metadata.timestampProgetto,
                            filePath
                        };
                    } catch (e) {
                        console.warn(`Errore nel leggere risultato archiviato ${fileName}:`, e.message);
                        return null;
                    }
                })
                .filter(result => result !== null)
                .sort((a, b) => {
                    // Ordina per timestamp di classificazione (più recente per primo)
                    return new Date(b.timestampClassificazione || 0) - new Date(a.timestampClassificazione || 0);
                });
            
            console.log(`Trovati ${files.length} risultati archiviati`);
            return files;
        } catch (error) {
            console.error('Errore nel recupero dei risultati archiviati:', error);
            return [];
        }
    });




    
    // Gestione lettura file
    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        return fs.readFileSync(filePath);
      } catch (error) {
        console.error('Errore nella lettura del file:', error);
        throw error;
      }
    });
    
    /* Gestione scrittura file OLD
    ipcMain.handle('write-file', async (event, filePath, data) => {
      try {
        fs.writeFileSync(filePath, data);
        return true;
      } catch (error) {
        console.error('Errore nella scrittura del file:', error);
        throw error;
      }
    });*/



    // Ottieni informazioni su un file
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
      const stats = fs.statSync(filePath);
      return {
          size: stats.size,
          ctime: stats.ctime,
          mtime: stats.mtime,
          atime: stats.atime
      };
  } catch (error) {
      console.error('Errore nel recupero delle informazioni sul file:', error);
      throw error;
  }
});

// Apri file con applicazione predefinita
ipcMain.handle('open-external', async (event, path) => {
  try {
      await shell.openPath(path);
      return true;
  } catch (error) {
      console.error('Errore nell\'apertura del file:', error);
      throw error;
  }
});



  // Gestione scrittura file
  ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
      // Se il percorso è relativo, lo convertiamo in assoluto basandoci sul percorso dell'app
      let absolutePath = filePath;
      if (!path.isAbsolute(filePath)) {
        absolutePath = path.join(__dirname, 'app', filePath);
      }
      
      // Crea la directory se non esiste
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Scrivi il file
      fs.writeFileSync(absolutePath, data);
      return {
        success: true,
        message: "File scritto con successo",
        path: absolutePath
      };
    } catch (error) {
      console.error('Errore nella scrittura del file:', error);
      return {
        success: false,
        message: `Errore nella scrittura del file: ${error.message}`
      };
    }
});
    
    
    // Gestione salvataggio report
    ipcMain.handle('save-report', async (event, reportName, data) => {
      try {
        const { reportsPath } = ensureDirectoriesExist();
        const reportPath = path.join(reportsPath, `${reportName}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Errore nel salvataggio del report:', error);
        throw error;
      }
    });
    
    // Gestione lista reports
    ipcMain.handle('get-reports-list', async () => {
      try {
        const { reportsPath } = ensureDirectoriesExist();
        const files = fs.readdirSync(reportsPath);
        return files.filter(file => file.endsWith('.json'));
      } catch (error) {
        console.error('Errore nel recupero della lista dei report:', error);
        return [];
      }
    });
    
    // Gestione lettura report
    ipcMain.handle('load-report', async (event, reportName) => {
      try {
        const { reportsPath } = ensureDirectoriesExist();
        const reportPath = path.join(reportsPath, reportName);
        
        if (fs.existsSync(reportPath)) {
          const data = fs.readFileSync(reportPath, 'utf8');
          return JSON.parse(data);
        }
        return null;
      } catch (error) {
        console.error('Errore nel caricamento del report:', error);
        return null;
      }
    });
    
    // Gestione eliminazione report
    ipcMain.handle('delete-report', async (event, reportName) => {
      try {
        const { reportsPath } = ensureDirectoriesExist();
        const reportPath = path.join(reportsPath, reportName);
        
        if (fs.existsSync(reportPath)) {
          fs.unlinkSync(reportPath);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Errore nell\'eliminazione del report:', error);
        throw error;
      }
    });
    
    // Gestione export report in formato Excel (MIGLIORATO DA FEDE)
    ipcMain.handle('export-report-excel', async (event, reportData, filePath) => {
      try {
        const Excel = require('exceljs');
        const workbook = new Excel.Workbook();
        
        // Foglio principale con i dati del report
        const worksheetData = workbook.addWorksheet('Classificazione');
        
        // Verifica se ci sono dati
        if (reportData && reportData.length > 0) {
          // Ottieni intestazioni dalle chiavi del primo oggetto
          const headers = Object.keys(reportData[0]);
          
          // Aggiungi intestazioni
          worksheetData.addRow(headers);
          
          // Formatta intestazioni in grassetto
          worksheetData.getRow(1).font = { bold: true };
          worksheetData.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4CAF50' }
          };
          worksheetData.getRow(1).font = {
            bold: true,
            color: { argb: 'FFFFFF' }
          };
          
          // Aggiungi righe dati
          reportData.forEach(row => {
            const values = headers.map(header => row[header]);
            worksheetData.addRow(values);
          });
          
          // Formatta colonne
          headers.forEach((header, index) => {
            const col = worksheetData.getColumn(index + 1);
            col.width = Math.max(15, header.length * 1.5);
          });
        } else {
          worksheetData.addRow(['Nessun dato disponibile']);
        }
        
        // Aggiungi informazioni sul report
        const infoWorksheet = workbook.addWorksheet('Informazioni');
        infoWorksheet.addRow(['Report di Classificazione Rifiuti']);
        infoWorksheet.addRow(['Data generazione', new Date().toLocaleString('it-IT')]);
        infoWorksheet.addRow(['Software', 'WasteGuard']);
        
        // Salva il file
        await workbook.xlsx.writeFile(filePath);
        
        return {
          success: true,
          message: "Report Excel generato con successo",
          path: filePath
        };
      } catch (error) {
        console.error('Errore nella generazione del report Excel:', error);
        return {
          success: false,
          message: `Errore nella generazione del report Excel: ${error.message}`
        };
      }
    });
    
    // Gestione export report in formato PDF
    ipcMain.handle('export-report-pdf', async (event, reportData, filePath) => {
      try {
        const { jsPDF } = require('jspdf');
        const doc = new jsPDF();
        
        // Titolo
        doc.setFontSize(18);
        doc.text('Report Classificazione Rifiuti', 14, 22);
        
        // Data
        doc.setFontSize(12);
        doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, 14, 32);
        
        // Tabella
        const headers = Object.keys(reportData[0]);
        const rows = reportData.map(row => headers.map(header => row[header]));
        
        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 40,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [46, 125, 50] }
        });
        
        // Aggiungi footer
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(`WasteGuard 1.0 - Biorigeneral Informatics - Pagina ${i} di ${pageCount}`, 14, doc.internal.pageSize.getHeight() - 10);
        }
        
        // Salva il file
        doc.save(filePath);
        return true;
      } catch (error) {
        console.error('Errore nell\'esportazione del report in PDF:', error);
        throw error;
      }
    });

    ipcMain.handle('save-excel-to-python', async (event, data, dataType = 'raccolta') => {
      try {
        const userDataPath = app.getPath('userData');
        console.log(`Salvando dati di tipo: raccolta`);
        
        // Imposta la cartella temporanea dedicata ai dati di raccolta
        const tempDir = path.join(userDataPath, 'raccolta_temp');
        
        // Assicurati che la cartella esista
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Nome file per i dati di raccolta
        const tempFileName = 'temp_raccolta_data.json';
        const tempFilePath = path.join(tempDir, tempFileName);
        
        console.log(`Salvando dati raccolta in: ${tempFilePath}`);
        
        // Salva i dati in un file JSON temporaneo
        fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2));
        
        // Passa il tipo di dati 'raccolta' come terzo parametro allo script Python
        const result = await runPythonScript('raccolta.py', ['process_excel', tempFilePath, 'raccolta']);
        
        if (!result.success) {
          throw new Error(result.message || `Errore nell'elaborazione dei dati raccolta in Python`);
        }
        
        console.log(`Risultato elaborazione Python per raccolta:`, result);
        
        return result;
      } catch (error) {
        console.error(`Errore nel salvataggio dei dati raccolta in Python:`, error);
        return {
          success: false,
          message: `Errore: ${error.message}`
        };
      }
    });
    
    // Gestione dati form raccolta

    // Percorso del file JSON per i dati dei form
    const INFO_RACCOLTA_PATH = path.join(app.getPath('userData'), 'info_raccolta.json');

    // Handler per salvare i dati dei form
    ipcMain.handle('save-info-raccolta', async (event, data) => {
        try {
            // Assicurati che il file esista
            if (!fs.existsSync(path.dirname(INFO_RACCOLTA_PATH))) {
                fs.mkdirSync(path.dirname(INFO_RACCOLTA_PATH), { recursive: true });
            }

            // Salva i dati in formato JSON
            fs.writeFileSync(INFO_RACCOLTA_PATH, JSON.stringify(data, null, 2));
            
            return {
                success: true,
                message: 'Dati salvati con successo'
            };
        } catch (error) {
            console.error('Errore nel salvataggio dei dati di raccolta:', error);
            return {
                success: false,
                message: `Errore nel salvataggio: ${error.message}`
            };
        }
    });

    // Handler per caricare i dati dei form
    ipcMain.handle('load-info-raccolta', async () => {
        try {
            if (fs.existsSync(INFO_RACCOLTA_PATH)) {
                const data = fs.readFileSync(INFO_RACCOLTA_PATH, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.error('Errore nel caricamento dei dati di raccolta:', error);
            return null;
        }
    });

    // Handler per ottenere i dati dei form per il report
    ipcMain.handle('get-info-raccolta', async () => {
        try {
            if (fs.existsSync(INFO_RACCOLTA_PATH)) {
                const data = fs.readFileSync(INFO_RACCOLTA_PATH, 'utf8');
                return {
                    success: true,
                    data: JSON.parse(data)
                };
            }
            return {
                success: false,
                message: 'Nessun dato di raccolta trovato'
            };
        } catch (error) {
            console.error('Errore nel recupero dei dati di raccolta:', error);
            return {
                success: false,
                message: `Errore: ${error.message}`
            };
        }
    });

    // Handler per verificare se esistono dati dei form salvati
    ipcMain.handle('has-info-raccolta', async () => {
        return fs.existsSync(INFO_RACCOLTA_PATH);
    });

    // Handler per cancellare i dati dei form
    ipcMain.handle('clear-info-raccolta', async () => {
        try {
            if (fs.existsSync(INFO_RACCOLTA_PATH)) {
                fs.unlinkSync(INFO_RACCOLTA_PATH);
            }
            return {
                success: true,
                message: 'Dati cancellati con successo'
            };
        } catch (error) {
            console.error('Errore nella cancellazione dei dati di raccolta:', error);
            return {
                success: false,
                message: `Errore: ${error.message}`
            };
        }
});

    //Handle aggiunto appena messo "calcolo_metalli.py"
    ipcMain.handle('run-python-script', async (event, scriptName, args = []) => {
      try {
        console.log(`🐍 Richiesta esecuzione script Python: ${scriptName} con args:`, args);
        
        // 🔧 NUOVO: Se il primo argomento è un nome file di campione, converti in percorso completo
        if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('dati_campione_')) {
          const campioneDir = path.join(app.getPath('userData'), 'campione_data');
          const fullPath = path.join(campioneDir, args[0]);
          
          console.log(`📁 Verifico esistenza file campione: ${fullPath}`);
          
          // Verifica che il file esista
          if (fs.existsSync(fullPath)) {
            console.log(`✅ File campione trovato, conversione: ${args[0]} -> ${fullPath}`);
            args[0] = fullPath; // Sostituisci con il percorso completo
          } else {
            console.error(`❌ File campione non trovato: ${fullPath}`);
            
            // Log debug per vedere cosa c'è nella directory
            if (fs.existsSync(campioneDir)) {
              const filesInDir = fs.readdirSync(campioneDir);
              console.log(`📋 File presenti in ${campioneDir}:`, filesInDir);
            } else {
              console.log(`📁 Directory campione non esiste: ${campioneDir}`);
            }
            
            return {
              success: false,
              message: `File campione '${args[0]}' non trovato in ${campioneDir}`
            };
          }
        }
        
        console.log(`🐍 Esecuzione con args finali:`, args);
        
        // Chiama la funzione runPythonScript esistente
        const result = await runPythonScript(scriptName, args);
        
        console.log(`✅ Risultato script Python:`, result);
        return result;
        
      } catch (error) {
        console.error('❌ Errore nell\'esecuzione dello script Python:', error);
        return {
          success: false,
          message: error.message
        };
      }
    });
  

  } catch (error) {
    console.error('Error during initialization:', error);
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to initialize the application. Some Python dependencies might be missing. Please check the logs for more details.'
    );
    app.quit();
  }
});


// Funzione per verificare i dati Excel senza salvarli
ipcMain.handle('verifyExcelData', async (event, data, dataType) => {
    try {
        const tempFile = path.join(app.getPath('temp'), 'temp_verify_data.json');
        
        // Salva i dati in un file temporaneo
        await fs.writeFile(tempFile, JSON.stringify(data), 'utf8');
        
        // Esegui la stessa verifica di process_excel ma senza salvare permanentemente
        const raccoltaScript = path.join(__dirname, 'app', 'raccolta.py');
        
        // Esegui lo script Python con una nuova opzione "verify_only"
        const result = execSync(`python "${raccoltaScript}" verify_excel "${tempFile}" ${dataType}`).toString();
        
        try {
            // Elimina il file temporaneo
            fs.unlinkSync(tempFile);
        } catch (e) {
            console.warn('Non è stato possibile eliminare il file temporaneo', e);
        }
        
        return JSON.parse(result);
    } catch (error) {
        console.error('Errore nella verifica dei dati Excel:', error);
        return {
            success: false,
            message: `Errore nella verifica dei dati: ${error.message}`
        };
    }
});


// CARTELLA ECHA DATABASE
// Gestione verifiche esistenza file
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Errore nel controllo esistenza file:', error);
    return false;
  }
});

// Gestione copia file
ipcMain.handle('copy-file', async (event, srcPath, destPath) => {
  try {
    // Crea la directory di destinazione se non esiste
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Percorso assoluto della destinazione
    let absoluteDestPath;
    if (path.isAbsolute(destPath)) {
      absoluteDestPath = destPath;
    } else {
      // Se è un percorso relativo, lo rendi assoluto riferendolo alla cartella dell'app
      const appDir = path.join(__dirname, 'app', 'echa');
      absoluteDestPath = path.join(appDir, destPath);
    }
    
    // Copia il file
    fs.copyFileSync(srcPath, absoluteDestPath);
    
    return { 
      success: true, 
      message: "File copiato con successo",
      destPath: absoluteDestPath
    };
  } catch (error) {
    console.error('Errore nella copia del file:', error);
    return { 
      success: false, 
      message: `Errore: ${error.message}` 
    };
  }
});

// Gestione eliminazione file OLD ALE
/*ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, message: "File eliminato con successo" };
    } else {
      return { success: false, message: "Il file non esiste" };
    }
  } catch (error) {
    console.error('Errore nell\'eliminazione del file:', error);
    return { success: false, message: `Errore: ${error.message}` };
  }
});*/

// Gestione eliminazione file
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    // Se il percorso è relativo, lo convertiamo in assoluto basandoci sul percorso dell'app
    let absolutePath = filePath;
    if (!path.isAbsolute(filePath)) {
      absolutePath = path.join(__dirname, 'app', filePath);
    }
    
    // Verifica se il file esiste
    if (!fs.existsSync(absolutePath)) {
      return {
        success: false,
        message: "File non trovato"
      };
    }
    
    // Elimina il file
    fs.unlinkSync(absolutePath);
    return {
      success: true,
      message: "File eliminato con successo"
    };
  } catch (error) {
    console.error('Errore nell\'eliminazione del file:', error);
    return {
      success: false,
      message: `Errore nell'eliminazione del file: ${error.message}`
    };
  }
});

// Gestione creazione directory
ipcMain.handle('ensure-dir', async (event, dirPath) => {
  try {
    // Se è un percorso relativo, lo rendi assoluto riferendolo alla cartella dell'app
    let absoluteDirPath;
    if (path.isAbsolute(dirPath)) {
      absoluteDirPath = dirPath;
    } else {
      const appDir = path.join(__dirname, 'app', 'echa');
      absoluteDirPath = path.join(appDir, dirPath);
    }
    
    if (!fs.existsSync(absoluteDirPath)) {
      fs.mkdirSync(absoluteDirPath, { recursive: true });
    }
    
    return { 
      success: true, 
      message: "Directory creata con successo",
      dirPath: absoluteDirPath
    };
  } catch (error) {
    console.error('Errore nella creazione della directory:', error);
    return { 
      success: false, 
      message: `Errore: ${error.message}` 
    };
  }
});

// Ottieni percorso dell'applicazione
ipcMain.handle('get-app-path', async () => {
  return path.join(__dirname, 'app');
});



//========== CLASSIFICATORE e sezione CLASSIFICAZIONE ===========//
// Gestione salvataggio dati campione per classificazione
ipcMain.handle('save-campione-data', async (event, data, fileName = null) => {
  try {
    let targetPath;
    
    if (fileName) {
      // Nuovo sistema: salva con timestamp nella cartella dedicata
      const campioneDir = path.join(app.getPath('userData'), 'campione_data');
      
      if (!fs.existsSync(campioneDir)) {
        fs.mkdirSync(campioneDir, { recursive: true });
        console.log(`📁 Creata directory campione: ${campioneDir}`);
      }
      
      targetPath = path.join(campioneDir, fileName);
      console.log(`💾 Salvando file campione: ${targetPath}`);
    } else {
      // Sistema esistente: salva in app/data/dati_campione.json
      const appDir = path.join(__dirname, 'app');
      const dataDir = path.join(appDir, 'data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`📁 Creata directory data: ${dataDir}`);
      }
      
      targetPath = path.join(dataDir, 'dati_campione.json');
      console.log(`💾 Salvando file campione classico: ${targetPath}`);
    }
    
    // Salva i dati come JSON
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
    console.log(`✅ File campione salvato con successo: ${targetPath}`);
    
    // 🔧 NUOVO: Verifica e log del contenuto della directory
    if (fileName) {
      const campioneDir = path.join(app.getPath('userData'), 'campione_data');
      try {
        const files = fs.readdirSync(campioneDir);
        console.log(`📋 File nella directory campione dopo salvataggio:`, files);
      } catch (e) {
        console.warn(`⚠️ Impossibile leggere directory campione:`, e.message);
      }
    }
    
    return { 
      success: true, 
      message: "Dati campione salvati con successo",
      fileName: fileName || 'dati_campione.json',
      filePath: targetPath  // 🔧 NUOVO: Restituisce anche il percorso completo
    };
  } catch (error) {
    console.error('❌ Errore nel salvataggio dei dati campione:', error);
    return { success: false, message: `Errore: ${error.message}` };
  }
});

// Ottieni il percorso della cartella reports dove salvare le classificazioni
ipcMain.handle('getReportsPath', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const reportsPath = path.join(userDataPath, 'reports');
    
    // Assicura che la cartella esista
    if (!fs.existsSync(reportsPath)) {
      fs.mkdirSync(reportsPath, { recursive: true });
    }
    
    return reportsPath;
  } catch (error) {
    console.error('Errore nel recupero del percorso reports:', error);
    throw error;
  }
});

// Apri una cartella nel file explorer
ipcMain.handle('openFolder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return true;
  } catch (error) {
    console.error('Errore nell\'apertura della cartella:', error);
    throw error;
  }
});

// Assicura che una directory esista
ipcMain.handle('ensureDir', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Errore nella creazione della directory:', error);
    throw error;
  }
});

// Handler per ottenere la lista dei file campione
ipcMain.handle('get-campione-files', async () => {
    try {
        const campioneDir = path.join(app.getPath('userData'), 'campione_data');
        
        // Crea la directory se non esiste
        if (!fs.existsSync(campioneDir)) {
            fs.mkdirSync(campioneDir, { recursive: true });
            return [];
        }
        
        // Leggi tutti i file .json nella directory
        const files = fs.readdirSync(campioneDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => {
                // Ordina per timestamp (più recente per primo)
                const timestampA = a.match(/dati_campione_(\d{14})/)?.[1] || '0';
                const timestampB = b.match(/dati_campione_(\d{14})/)?.[1] || '0';
                return timestampB.localeCompare(timestampA);
            });
        
        return files;
    } catch (error) {
        console.error('Errore nel recupero dei file campione:', error);
        return [];
    }
});

// Handler per eliminare un file campione
// MODIFICATO: Handler per eliminare file campione con avviso committente
ipcMain.handle('delete-campione-file-with-warning', async (event, fileName) => {
    try {
        const campioneDir = path.join(app.getPath('userData'), 'campione_data');
        const filePath = path.join(campioneDir, fileName);
        
        if (!fs.existsSync(filePath)) {
            return { 
                success: false, 
                message: 'File non trovato' 
            };
        }
        
        // Leggi i metadati per l'avviso
        let committente = 'Committente Sconosciuto';
        let dataCampionamento = 'Data non disponibile';
        let codiceEER = 'CODICE_EER_NON_TROVATO';

        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            const metadata = data._metadata || {};
            
            committente = metadata.committente || extractCommittenteFromFileName(fileName);
            dataCampionamento = metadata.dataCampionamento || 'Data non disponibile';
            codiceEER = metadata.infoCertificato?.codiceEER || extractCodiceEERFromFileName(fileName);
        } catch (e) {
            console.warn('Impossibile leggere metadati per avviso eliminazione');
            codiceEER = extractCodiceEERFromFileName(fileName);
            committente = extractCommittenteFromFileName(fileName);
        }
        
        // Elimina il file
        fs.unlinkSync(filePath);
        
        return { 
            success: true,
            message: `File eliminato: ${fileName}`,
            codiceEER,
            committente,
            dataCampionamento
        };
    } catch (error) {
        console.error('Errore nell\'eliminazione del file campione:', error);
        return { 
            success: false, 
            message: error.message 
        };
    }
});












//======== Handle SQL Lite
// Handler per query SELECT (AGGIORNATO)
ipcMain.handle('query-sqlite', async (event, query, params, dbName) => {
  try {
    // Costruisci il percorso del database
    let dbPath;
    
    // NUOVO: Se dbName è un percorso assoluto, usalo direttamente
    if (dbName && (dbName.includes(':') || dbName.startsWith('/'))) {
      // È un percorso assoluto (Windows: contiene ':', Unix: inizia con '/')
      dbPath = dbName;
      console.log(`Usando percorso assoluto: ${dbPath}`);
    }
    // Se dbName inizia con "echa/data/", costruisci il percorso relativo all'app
    else if (dbName && dbName.startsWith('echa/data/')) {
      dbPath = path.join(__dirname, 'app', dbName);
      console.log(`Usando percorso relativo echa: ${dbPath}`);
    }
    // Altrimenti usa il database principale
    else {
      dbPath = dbName ? path.join(__dirname, 'app', 'DB', dbName) : DB_PATH;
      console.log(`Usando percorso database principale: ${dbPath}`);
    }
    
    // Verifica che il file del database esista
    if (!fs.existsSync(dbPath)) {
      console.error(`Database non trovato: ${dbPath}`);
      return { 
        success: false, 
        message: `Database non trovato: ${dbPath}` 
      };
    }
    
    try {
      // Apri database con better-sqlite3
      const db = new Database(dbPath, { readonly: true });
      
      // Prepara e esegui la query
      const stmt = db.prepare(query);
      const rows = params && params.length > 0 ? stmt.all(...params) : stmt.all();
      
      // Chiudi il database
      db.close();
      
      return { 
        success: true, 
        data: rows 
      };
    } catch (err) {
      console.error(`Errore nell'esecuzione della query: ${err.message}`);
      return { 
        success: false, 
        message: `Errore nell'esecuzione della query: ${err.message}` 
      };
    }
  } catch (error) {
    console.error('Errore nell\'esecuzione della query SQLite:', error);
    return { 
      success: false, 
      message: `Errore generico: ${error.message}` 
    };
  }
});

// Handler per query INSERT, UPDATE, DELETE (AGGIORNATO)
ipcMain.handle('execute-sqlite', async (event, query, params, dbName) => {
  try {
    // Costruisci il percorso del database
    let dbPath;
    
    // NUOVO: Se dbName è un percorso assoluto, usalo direttamente
    if (dbName && (dbName.includes(':') || dbName.startsWith('/'))) {
      // È un percorso assoluto (Windows: contiene ':', Unix: inizia con '/')
      dbPath = dbName;
      console.log(`Usando percorso assoluto: ${dbPath}`);
    }
    // Se dbName inizia con "echa/data/", costruisci il percorso relativo all'app
    else if (dbName && dbName.startsWith('echa/data/')) {
      dbPath = path.join(__dirname, 'app', dbName);
      console.log(`Usando percorso relativo echa: ${dbPath}`);
    }
    // Altrimenti usa il database principale
    else {
      dbPath = dbName ? path.join(__dirname, 'app', 'DB', dbName) : DB_PATH;
      console.log(`Usando percorso database principale: ${dbPath}`);
    }
    
    // Verifica che il file del database esista
    if (!fs.existsSync(dbPath)) {
      console.error(`Database non trovato: ${dbPath}`);
      return { 
        success: false, 
        message: `Database non trovato: ${dbPath}` 
      };
    }
    
    try {
      // Apri database con better-sqlite3 (read-write)
      const db = new Database(dbPath);
      
      // Prepara e esegui la query
      const stmt = db.prepare(query);
      const result = params && params.length > 0 ? stmt.run(...params) : stmt.run();
      
      // Chiudi il database
      db.close();
      
      return { 
        success: true, 
        lastID: result.lastInsertRowid, 
        changes: result.changes 
      };
    } catch (err) {
      console.error(`Errore nell'esecuzione della query: ${err.message}`);
      return { 
        success: false, 
        message: `Errore nell'esecuzione della query: ${err.message}` 
      };
    }
  } catch (error) {
    console.error('Errore nell\'esecuzione della query SQLite:', error);
    return { 
      success: false, 
      message: `Errore generico: ${error.message}` 
    };
  }
});

// -------------- fine mainHandle ------------- //
// -------------  FINE SEZIONE HANDLE -------------//