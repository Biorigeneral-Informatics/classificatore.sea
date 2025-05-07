#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
aggiornamento_echa.py

Script per confrontare un vecchio file Excel ECHA con un nuovo file Excel ECHA.
"""

import pandas as pd
import os
import sys
import json
from datetime import datetime
import traceback
import glob
import shutil

def find_most_recent_excel(directory):
    """
    Trova il file Excel più recente nella directory specificata (escluso il nuovo file)
    
    Args:
        directory (str): Directory in cui cercare i file Excel
        
    Returns:
        str: Percorso del file Excel più recente
    """
    excel_files = glob.glob(os.path.join(directory, "*.xlsx")) + glob.glob(os.path.join(directory, "*.xls"))
    
    # Ordina i file per data di modifica, dal più recente al più vecchio
    excel_files.sort(key=os.path.getmtime, reverse=True)
    
    # Se ci sono file Excel disponibili, restituisci il più recente
    if excel_files:
        return excel_files[0]
    
    return None

def compare_echa_excel_files(new_excel_path):
    """
    Confronta un file Excel ECHA esistente con un nuovo file Excel ECHA
    
    Args:
        new_excel_path (str): Percorso del nuovo file Excel ECHA
    
    Returns:
        dict: Risultato dell'operazione con informazioni sul confronto
    """
    try:
        print(f"Inizio elaborazione con nuovo file: {new_excel_path}", file=sys.stderr)
        
        # Verifica che il nuovo file esista
        if not os.path.exists(new_excel_path):
            raise Exception(f"Il nuovo file Excel non esiste: {new_excel_path}")
        
        # Determina la directory di destinazione
        # Cerca di determinare la directory dei dati
        app_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        dir_path = os.path.join(app_dir, "echa", "data")
        
        print(f"Directory app: {app_dir}", file=sys.stderr)
        print(f"Directory dati ECHA: {dir_path}", file=sys.stderr)
        
        # Crea la directory se non esiste
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print(f"Creata directory: {dir_path}", file=sys.stderr)
        
        # Trova il file Excel ECHA più recente (escludendo il nuovo file)
        old_excel_files = glob.glob(os.path.join(dir_path, "*.xlsx")) + glob.glob(os.path.join(dir_path, "*.xls"))
        print(f"Trovati {len(old_excel_files)} file Excel nella directory", file=sys.stderr)
        
        # Genera timestamp per i nomi dei file
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Copia il nuovo file nella directory dei dati con un nome specifico
        new_file_name = f"echa_new_{timestamp}.xlsx"
        new_file_path = os.path.join(dir_path, new_file_name)
        
        print(f"Copio il nuovo file da {new_excel_path} a {new_file_path}", file=sys.stderr)
        
        # Copia il nuovo file nella directory dei dati
        try:
            shutil.copy2(new_excel_path, new_file_path)
            print(f"Nuovo file copiato con successo in: {new_file_path}", file=sys.stderr)
        except Exception as e:
            raise Exception(f"Errore nella copia del file: {str(e)}")
        
        # Rimuovi il nuovo file dall'elenco se è già nella directory
        old_excel_files = [f for f in old_excel_files if os.path.basename(f) != os.path.basename(new_file_path)]
        
        # Ordina i file per data di modifica, dal più recente al più vecchio
        old_excel_files.sort(key=os.path.getmtime, reverse=True)
        
        # Se non ci sono file Excel disponibili, restituisci un errore
        if not old_excel_files:
            raise Exception("Nessun file Excel ECHA esistente trovato per il confronto. Carica prima un file base.")
        
        # Prendi il file Excel più recente
        old_excel_path = old_excel_files[0]
        
        print(f"Confronto tra {old_excel_path} e {new_file_path}", file=sys.stderr)
        
        # Leggi i file Excel
        try:
            # Prima prova con header multilivello
            old_data = pd.read_excel(old_excel_path, header=[0, 1])
            
            # Crea nomi di colonna combinati
            old_columns = []
            for col in old_data.columns:
                # Combina i livelli di intestazione, eliminando i NaN
                parts = [str(part).strip() for part in col if str(part) != 'nan']
                old_column = '_'.join(parts).replace(' ', '_').replace('(', '').replace(')', '')
                old_columns.append(old_column)
            
            # Assegna i nuovi nomi di colonna
            old_data.columns = old_columns
            
        except Exception as e:
            print(f"Errore con header multilivello nel vecchio file, provo con header singolo: {str(e)}", file=sys.stderr)
            # Se fallisce, prova con header singolo
            old_data = pd.read_excel(old_excel_path)
        
        try:
            # Prima prova con header multilivello
            new_data = pd.read_excel(new_file_path, header=[0, 1])
            
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
            print(f"Errore con header multilivello nel nuovo file, provo con header singolo: {str(e)}", file=sys.stderr)
            # Se fallisce, prova con header singolo
            new_data = pd.read_excel(new_file_path)
        
        print(f"Letti {len(old_data)} record dal vecchio file Excel", file=sys.stderr)
        print(f"Letti {len(new_data)} record dal nuovo file Excel", file=sys.stderr)
        
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
        
        # Converti i valori CAS in stringhe per un confronto più semplice
        old_data[cas_column_old] = old_data[cas_column_old].astype(str)
        new_data[cas_column_new] = new_data[cas_column_new].astype(str)
        
        # Trova sostanze presenti solo nel vecchio file Excel (rimosse)
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
        
        # Trova sostanze presenti solo nel nuovo file Excel (aggiunte)
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
            'old_excel_path': old_excel_path,
            'new_excel_path': new_file_path,
            'timestamp': datetime.now().isoformat(),
            'total_added': len(added_substances),
            'total_removed': len(removed_substances),
            'total_modified': len(modified_substances)
        }
        
        # Salva i risultati del confronto in un file JSON
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
            "old_excel_path": old_excel_path,
            "new_excel_path": new_file_path
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
    # Verifica che l'argomento sia stato fornito
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "message": "Argomenti insufficienti. Fornire il percorso del nuovo file Excel ECHA."
        }
        print(json.dumps(result))
        return
    
    # Prendi l'argomento direttamente da sys.argv
    new_excel_path = sys.argv[1]
    
    print(f"Nuovo file Excel: {new_excel_path}", file=sys.stderr)
    
    # Esegui il confronto
    result = compare_echa_excel_files(new_excel_path)
    
    # Stampa il risultato come JSON (per Electron)
    print(json.dumps(result))


if __name__ == "__main__":
    main()