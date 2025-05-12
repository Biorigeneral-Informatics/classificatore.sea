import pandas as pd
import sqlite3
import os

#----------IMPORTANTE----------#
#Questo file serve per trasformare l'excel database_app.xlsx in un file sqllite. Va eseguito per fare la trasformazione.









def excel_to_sqlite(excel_file_path, sqlite_db_path):
    """
    Converte tutti i fogli di un file Excel in tabelle di un database SQLite
    """
    # Crea la connessione al database SQLite
    # Se il file del database non esiste, verrà creato
    conn = sqlite3.connect(sqlite_db_path)
    
    # Carica i fogli Excel
    xl = pd.ExcelFile(excel_file_path)
    
    # Per ogni foglio nel file Excel
    for sheet_name in xl.sheet_names:
        # Leggi il foglio come DataFrame
        df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
        
        # Pulisci i nomi delle colonne (rimuovi spazi e caratteri speciali)
        df.columns = [str(col).strip().replace(' ', '_').replace('(', '').replace(')', '') for col in df.columns]
        
        # Inserisci il DataFrame nel database come tabella
        df.to_sql(sheet_name, conn, if_exists='replace', index=False)
        
        print(f"Foglio '{sheet_name}' convertito in tabella SQLite")
    
    # Chiudi la connessione
    conn.close()
    
    print(f"Database SQLite creato con successo: {sqlite_db_path}")

# Ottiene il percorso assoluto della directory in cui si trova lo script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Crea percorsi relativi a questa directory
# NOTA: Qui assumiamo che i file siano nella stessa directory dello script.
# Se il file Excel o il database SQLite dovessero essere in una sottocartella,
# modifica i percorsi di conseguenza (es. os.path.join(script_dir, "data", "file.xlsx"))
excel_file = os.path.join(script_dir, "database_app.xlsx")
sqlite_db = os.path.join(script_dir, "database_app.db")

# Conversione (esegui questa parte solo una volta per creare il database)
excel_to_sqlite(excel_file, sqlite_db)