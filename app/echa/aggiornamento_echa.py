#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
aggiornamento_echa.py

Script per confrontare il database ECHA esistente con un nuovo file Excel ECHA.
"""

import pandas as pd
import sqlite3
import os
import sys
import json
from datetime import datetime
import shutil
import traceback

def compare_echa_databases(old_db_path, new_excel_path):
    """
    Confronta il database ECHA esistente con un nuovo file Excel
    
    Args:
        old_db_path (str): Percorso del database SQLite ECHA esistente
        new_excel_path (str): Percorso del nuovo file Excel ECHA
    
    Returns:
        dict: Risultato dell'operazione con informazioni sul confronto
    """
    try:
        print(f"Confronto tra {old_db_path} e {new_excel_path}", file=sys.stderr)
        
        # Crea un nuovo nome per il database basato sul file Excel
        dir_path = os.path.dirname(old_db_path)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Utilizza echa_new come nome predefinito come richiesto
        new_db_name = f"echa_new_{timestamp}.db"
        new_db_path = os.path.join(dir_path, new_db_name)
        
        # Copia il database esistente come backup
        backup_db_path = os.path.join(dir_path, f"db_echa_backup_{timestamp}.db")
        shutil.copy2(old_db_path, backup_db_path)
        print(f"Backup del database creato: {backup_db_path}", file=sys.stderr)
        
        # Connessione al vecchio database
        conn_old = sqlite3.connect(old_db_path)
        
        # Ottieni il nome della tabella principale
        cursor_old = conn_old.cursor()
        cursor_old.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor_old.fetchall()
        
        if not tables:
            raise Exception("Nessuna tabella trovata nel database esistente")
        
        old_table_name = tables[0][0]
        print(f"Tabella trovata nel database esistente: {old_table_name}", file=sys.stderr)
        
        # Leggi i dati dal database vecchio
        old_data = pd.read_sql_query(f"SELECT * FROM '{old_table_name}'", conn_old)
        print(f"Letti {len(old_data)} record dal database esistente", file=sys.stderr)
        
        # Chiudi la connessione al vecchio database
        conn_old.close()
        
        # Leggi il nuovo file Excel
        try:
            # Prima prova con header multilivello
            new_data = pd.read_excel(new_excel_path, header=[0, 1])
            
            # Crea nomi di colonna combinati
            new_columns = []
            for col in new_data.columns:
                # Combina i livelli di intestazione, eliminando i NaN
                parts = [str(part).strip() for part in col if str(part) != 'nan']
                new_column = '_'.join(parts).replace(' ', '_').replace('(', '').replace(')', '')
                new_columns.append(new_column)
            
            # Assegna i nuovi nomi di colonna
            new_data.columns = new_columns
            
        except Exception as e:
            print(f"Errore con header multilivello, provo con header singolo: {str(e)}", file=sys.stderr)
            # Se fallisce, prova con header singolo
            new_data = pd.read_excel(new_excel_path)
        
        print(f"Letti {len(new_data)} record dal nuovo file Excel", file=sys.stderr)
        
        # Crea un nuovo database SQLite
        conn_new = sqlite3.connect(new_db_path)
        
        # Inserisci i dati nel nuovo database
        new_data.to_sql('echa_substances', conn_new, if_exists='replace', index=False)
        
        # Chiudi la connessione al nuovo database
        conn_new.close()
        
        print(f"Nuovo database creato con successo: {new_db_path}", file=sys.stderr)
        
        # Confronta i dati vecchi e nuovi
        # Trova colonne con nomi simili tra i due dataframe
        
        # Per il CAS
        cas_column_old = None
        for col in old_data.columns:
            if 'cas' in col.lower():
                cas_column_old = col
                break
        
        cas_column_new = None
        for col in new_data.columns:
            if 'cas' in col.lower():
                cas_column_new = col
                break
        
        # Se non troviamo colonne con "cas", usa una convenzione
        if not cas_column_old:
            cas_column_old = old_data.columns[0] if len(old_data.columns) > 0 else None
        
        if not cas_column_new:
            cas_column_new = new_data.columns[0] if len(new_data.columns) > 0 else None
        
        # Per il nome
        name_column_old = None
        for col in old_data.columns:
            if 'name' in col.lower() or 'nome' in col.lower() or 'sost' in col.lower():
                name_column_old = col
                break
        
        name_column_new = None
        for col in new_data.columns:
            if 'name' in col.lower() or 'nome' in col.lower() or 'sost' in col.lower():
                name_column_new = col
                break
        
        # Se non troviamo colonne con "name", usa una convenzione
        if not name_column_old:
            name_column_old = old_data.columns[1] if len(old_data.columns) > 1 else None
        
        if not name_column_new:
            name_column_new = new_data.columns[1] if len(new_data.columns) > 1 else None
        
        # Per le frasi H
        h_column_old = None
        for col in old_data.columns:
            if 'hazard' in col.lower() or 'h_' in col.lower() or 'fras' in col.lower():
                h_column_old = col
                break
        
        h_column_new = None
        for col in new_data.columns:
            if 'hazard' in col.lower() or 'h_' in col.lower() or 'fras' in col.lower():
                h_column_new = col
                break
        
        # Se non troviamo colonne con "hazard", usa una convenzione
        if not h_column_old:
            h_column_old = old_data.columns[2] if len(old_data.columns) > 2 else None
        
        if not h_column_new:
            h_column_new = new_data.columns[2] if len(new_data.columns) > 2 else None
        
        print(f"Colonne per confronto - CAS: {cas_column_old} -> {cas_column_new}", file=sys.stderr)
        print(f"Colonne per confronto - Nome: {name_column_old} -> {name_column_new}", file=sys.stderr)
        print(f"Colonne per confronto - Hazard: {h_column_old} -> {h_column_new}", file=sys.stderr)
        
        # Verifica che abbiamo trovato le colonne necessarie
        if not cas_column_old or not cas_column_new or not name_column_old or not name_column_new:
            raise Exception("Impossibile identificare le colonne necessarie per il confronto")
        
        # Trova sostanze presenti solo nel vecchio database (rimosse)
        removed_substances = []
        for idx, row in old_data.iterrows():
            old_cas = str(row[cas_column_old])
            
            # Cerca nel nuovo dataframe
            found = False
            for idx_new, new_row in new_data.iterrows():
                new_cas = str(new_row[cas_column_new])
                if new_cas == old_cas:
                    found = True
                    break
            
            if not found:
                removed_substances.append({
                    'cas': old_cas,
                    'name': str(row[name_column_old]),
                    'hazard': str(row[h_column_old]) if h_column_old else "N/A"
                })
        
        # Trova sostanze presenti solo nel nuovo database (aggiunte)
        added_substances = []
        for idx, row in new_data.iterrows():
            new_cas = str(row[cas_column_new])
            
            # Cerca nel vecchio dataframe
            found = False
            for idx_old, old_row in old_data.iterrows():
                old_cas = str(old_row[cas_column_old])
                if new_cas == old_cas:
                    found = True
                    break
            
            if not found:
                added_substances.append({
                    'cas': new_cas,
                    'name': str(row[name_column_new]),
                    'hazard': str(row[h_column_new]) if h_column_new else "N/A"
                })
        
        # Trova sostanze modificate
        modified_substances = []
        for idx_new, new_row in new_data.iterrows():
            new_cas = str(new_row[cas_column_new])
            
            for idx_old, old_row in old_data.iterrows():
                old_cas = str(old_row[cas_column_old])
                
                if new_cas == old_cas:
                    # Verifica se ci sono cambiamenti nelle frasi H
                    new_hazard = str(new_row[h_column_new]) if h_column_new else "N/A"
                    old_hazard = str(old_row[h_column_old]) if h_column_old else "N/A"
                    
                    if new_hazard != old_hazard and new_hazard != "N/A" and old_hazard != "N/A":
                        modified_substances.append({
                            'cas': new_cas,
                            'name': str(new_row[name_column_new]),
                            'old_hazard': old_hazard,
                            'new_hazard': new_hazard
                        })
                    break
        
        # Limita il numero di elementi per evitare risposte troppo grandi
        max_items = 100
        if len(added_substances) > max_items:
            added_substances = added_substances[:max_items]
        
        if len(removed_substances) > max_items:
            removed_substances = removed_substances[:max_items]
        
        if len(modified_substances) > max_items:
            modified_substances = modified_substances[:max_items]
        
        # Prepara il risultato
        comparison_result = {
            'added': added_substances,
            'removed': removed_substances,
            'modified': modified_substances,
            'old_db_path': old_db_path,
            'new_db_path': new_db_path,
            'timestamp': datetime.now().isoformat(),
            'old_table': old_table_name,
            'new_table': 'echa_substances',
            'total_added': len(added_substances),
            'total_removed': len(removed_substances),
            'total_modified': len(modified_substances)
        }
        
        # Salva i risultati del confronto in un file JSON (nome richiesto)
        comparison_file = os.path.join(dir_path, f"echa_comparison_{timestamp}.json")
        with open(comparison_file, 'w', encoding='utf-8') as f:
            json.dump(comparison_result, f, indent=2, ensure_ascii=False)
        
        print(f"Risultati del confronto salvati in: {comparison_file}", file=sys.stderr)
        print(f"Aggiunti: {len(added_substances)}, Rimossi: {len(removed_substances)}, Modificati: {len(modified_substances)}", file=sys.stderr)
        
        result = {
            "success": True,
            "message": "Confronto completato con successo",
            "comparison": comparison_result,
            "comparison_file": comparison_file,
            "old_db_path": old_db_path,
            "new_db_path": new_db_path,
            "backup_db_path": backup_db_path
        }
        
        return result
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"ERRORE: {str(e)}", file=sys.stderr)
        print(error_traceback, file=sys.stderr)
        
        return {
            "success": False,
            "message": f"Errore nel confronto: {str(e)}",
            "error_details": error_traceback
        }


def main():
    """
    Funzione principale che può essere chiamata da Electron o dalla command line
    """
    # Verifica che entrambi gli argomenti siano stati forniti
    if len(sys.argv) < 3:
        result = {
            "success": False,
            "message": "Argomenti insufficienti. Fornire il percorso del database esistente e del nuovo file Excel."
        }
        print(json.dumps(result))
        return
    
    # Prendi gli argomenti direttamente da sys.argv
    old_db_path = sys.argv[1]
    new_excel_path = sys.argv[2]
    
    print(f"Database esistente: {old_db_path}", file=sys.stderr)
    print(f"Nuovo file Excel: {new_excel_path}", file=sys.stderr)
    
    # Esegui il confronto
    result = compare_echa_databases(old_db_path, new_excel_path)
    
    # Stampa il risultato come JSON (per Electron)
    print(json.dumps(result))


if __name__ == "__main__":
    main()