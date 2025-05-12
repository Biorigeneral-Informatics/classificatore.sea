#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
convert_echa.py

Script per convertire il file Excel ECHA in un database SQLite.
Questo script è simile a convtab.py, ma specifico per i dati ECHA.
"""

import pandas as pd
import sqlite3
import os
import sys
import json
from datetime import datetime

def excel_to_sqlite(excel_file_path, sqlite_db_path):
    """
    Converte il file Excel ECHA in un database SQLite
    
    Args:
        excel_file_path (str): Percorso del file Excel ECHA
        sqlite_db_path (str): Percorso di destinazione per il database SQLite
    
    Returns:
        dict: Risultato dell'operazione con info sul database creato
    """
    try:
        print(f"Conversione di {excel_file_path} in SQLite", file=sys.stderr)
        
        # Mantieni l'estensione originale ma usa il nome "db_echa"
        dir_path = os.path.dirname(sqlite_db_path)
        _, ext = os.path.splitext(sqlite_db_path)
        if not ext:
            ext = '.db'  # Usa .db come estensione predefinita
        
        # Crea il nuovo percorso mantenendo l'estensione originale
        new_db_path = os.path.join(dir_path, f"db_echa{ext}")
        
        print(f"Percorso database di output: {new_db_path}", file=sys.stderr)
        
        # Verifica che la directory di destinazione esista
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print(f"Creata directory: {dir_path}", file=sys.stderr)
        
        # Verifica che l'Excel esista
        if not os.path.exists(excel_file_path):
            raise FileNotFoundError(f"Il file Excel non esiste: {excel_file_path}")
        
        # Leggi l'Excel con headers multilivello (le prime 2 righe)
        df = pd.read_excel(excel_file_path, header=[0, 1])
        
        # Crea nomi di colonna combinati
        new_columns = []
        for col in df.columns:
            # Combina i livelli di intestazione, eliminando i NaN
            parts = [str(part).strip() for part in col if str(part) != 'nan']
            new_column = '_'.join(parts).replace(' ', '_').replace('(', '').replace(')', '')
            new_columns.append(new_column)
        
        # Assegna i nuovi nomi di colonna
        df.columns = new_columns
        
        # Se il db esiste già, rimuovilo per evitare problemi di accesso
        if os.path.exists(new_db_path):
            try:
                os.remove(new_db_path)
                print(f"File database esistente rimosso: {new_db_path}", file=sys.stderr)
            except Exception as e:
                print(f"Attenzione: impossibile rimuovere il file esistente: {str(e)}", file=sys.stderr)
        
        # Crea una connessione al database SQLite
        conn = sqlite3.connect(new_db_path)
        
        # Inserisci il DataFrame nel database
        table_name = 'echa_substances'
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        
        # Ottieni alcune statistiche
        num_rows, num_cols = df.shape
        
        # Chiudi la connessione al database
        conn.close()
        
        # Restituisci le informazioni sul database creato
        tables_info = {
            table_name: {
                "rows": num_rows,
                "columns": num_cols,
                "column_names": list(df.columns)
            }
        }
        
        result = {
            "success": True,
            "message": f"Database SQLite creato con successo: {new_db_path}",
            "database_path": new_db_path,  # Restituisci il percorso aggiornato
            "tables": tables_info,
            "total_rows": num_rows,
            "sheet_count": 1,
            "conversion_date": datetime.now().isoformat()
        }
        
        print(f"Conversione completata con successo. Totale righe: {num_rows}", file=sys.stderr)
        return result
    except Exception as e:
        # Gestione errori
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        error_result = {
            "success": False,
            "message": f"Errore nella conversione: {str(e)}",
            "error_details": traceback.format_exc()
        }
        return error_result


def main():
    """
    Funzione principale che può essere chiamata da Electron o dalla command line
    """
    # Verifica che entrambi gli argomenti siano stati forniti
    if len(sys.argv) < 3:
        result = {
            "success": False,
            "message": "Argomenti insufficienti. Fornire il percorso del file Excel e il percorso di destinazione SQLite."
        }
        print(json.dumps(result))
        return
    
    # Prendi gli argomenti direttamente da sys.argv
    excel_path = sys.argv[1]
    db_path = sys.argv[2]
    
    print(f"Excel path: {excel_path}", file=sys.stderr)
    print(f"DB path: {db_path}", file=sys.stderr)
    
    # Esegui la conversione
    result = excel_to_sqlite(excel_path, db_path)
    
    # Stampa il risultato come JSON (per Electron)
    print(json.dumps(result))


if __name__ == "__main__":
    main()