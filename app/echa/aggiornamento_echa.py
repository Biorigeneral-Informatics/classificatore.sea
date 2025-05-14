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
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(script_dir, "data")
        
        print(f"Script directory: {script_dir}", file=sys.stderr)
        print(f"Directory dati ECHA: {data_dir}", file=sys.stderr)
        
        # Crea la directory data se non esiste
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
            print(f"Creata directory: {data_dir}", file=sys.stderr)
        
        # Trova il file Excel ECHA più recente (escludendo il nuovo file)
        old_excel_files = glob.glob(os.path.join(data_dir, "*.xlsx")) + glob.glob(os.path.join(data_dir, "*.xls"))
        print(f"Trovati {len(old_excel_files)} file Excel nella directory", file=sys.stderr)
        
        # Genera timestamp per i nomi dei file
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Copia il nuovo file nella directory dei dati con un nome specifico
        new_file_name = f"echa_new_{timestamp}.xlsx"
        new_file_path = os.path.join(data_dir, new_file_name)
        
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
            print("Tentativo di lettura vecchio file con header multilivello...", file=sys.stderr)
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
            print("Tentativo di lettura nuovo file con header multilivello...", file=sys.stderr)
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
        
        # DEBUG: stampa le colonne disponibili
        print("Colonne vecchio file:", old_data.columns.tolist(), file=sys.stderr)
        print("Colonne nuovo file:", new_data.columns.tolist(), file=sys.stderr)
        
        # Identifica le colonne chiave per il confronto
        
        # Per il CAS (chiave primaria per il confronto)
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
            if 'hazard' in col.lower() or 'h_' in col.lower() or 'fras' in col.lower() or 'classificat' in col.lower():
                h_column_old = col
                break
        
        h_column_new = None
        for col in new_data.columns:
            if 'hazard' in col.lower() or 'h_' in col.lower() or 'fras' in col.lower() or 'classificat' in col.lower():
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
        print("Conversione colonne CAS in stringhe...", file=sys.stderr)
        old_data[cas_column_old] = old_data[cas_column_old].astype(str).str.strip()
        new_data[cas_column_new] = new_data[cas_column_new].astype(str).str.strip()
        
        # Identifica tutte le colonne comuni per il confronto completo
        print("Identificazione delle colonne comuni per il confronto completo...", file=sys.stderr)
        old_columns_set = set(old_data.columns)
        new_columns_set = set(new_data.columns)
        common_columns = old_columns_set.intersection(new_columns_set)
        
        # Rimuovi le colonne CAS e nome dalle colonne di confronto (solo per il rilevamento delle modifiche)
        compare_columns = [col for col in common_columns if col != cas_column_old and col != name_column_old]
        
        print(f"Colonne comuni per confronto completo: {len(common_columns)}", file=sys.stderr)
        print(f"Colonne per rilevamento modifiche: {len(compare_columns)}", file=sys.stderr)
        
        # Crea indici per un accesso più veloce basato sul CAS
        print("Creazione indici per confronto veloce...", file=sys.stderr)
        old_data_dict = {}
        for idx, row in old_data.iterrows():
            cas = row[cas_column_old]
            if cas and cas.strip() != 'nan' and cas.strip():
                # Memorizza la riga completa per un confronto dettagliato
                old_data_dict[cas] = {
                    'row': row,
                    'idx': idx
                }
        
        new_data_dict = {}
        for idx, row in new_data.iterrows():
            cas = row[cas_column_new]
            if cas and cas.strip() != 'nan' and cas.strip():
                # Memorizza la riga completa per un confronto dettagliato
                new_data_dict[cas] = {
                    'row': row,
                    'idx': idx
                }
        
        print(f"Indice vecchio file: {len(old_data_dict)} elementi", file=sys.stderr)
        print(f"Indice nuovo file: {len(new_data_dict)} elementi", file=sys.stderr)
        
        # Set per un confronto più efficiente
        old_cas_set = set(old_data_dict.keys())
        new_cas_set = set(new_data_dict.keys())
        
        # Sostanze comuni (presenti in entrambi i file)
        common_cas_set = old_cas_set.intersection(new_cas_set)
        
        # Sostanze rimosse (presenti solo nel vecchio file)
        removed_cas_set = old_cas_set - new_cas_set
        
        # Sostanze aggiunte (presenti solo nel nuovo file)
        added_cas_set = new_cas_set - old_cas_set
        
        print(f"Sostanze comuni a entrambi i file: {len(common_cas_set)}", file=sys.stderr)
        print(f"Sostanze rimosse: {len(removed_cas_set)}", file=sys.stderr)
        print(f"Sostanze aggiunte: {len(added_cas_set)}", file=sys.stderr)
        
        # Liste per i risultati
        removed_substances = []
        added_substances = []
        modified_substances = []
        
        # Verifica delle sostanze modificate (presenti in entrambi i file ma con dati diversi)
        print("Verifica delle sostanze modificate...", file=sys.stderr)
        modified_count = 0
        unchanged_count = 0
        
        for cas in common_cas_set:
            old_data_row = old_data_dict[cas]['row']
            new_data_row = new_data_dict[cas]['row']
            
            # Verifica se ci sono modifiche in qualsiasi colonna di confronto
            is_modified = False
            modifiche = []
            
            # Confronta il campo hazard (priorità)
            if h_column_old and h_column_new:
                old_hazard = str(old_data_row[h_column_old]).strip()
                new_hazard = str(new_data_row[h_column_new]).strip()
                
                if new_hazard != old_hazard and new_hazard != "nan" and old_hazard != "nan":
                    is_modified = True
                    modifiche.append({
                        'campo': 'hazard',
                        'vecchio': old_hazard,
                        'nuovo': new_hazard
                    })
            
            # Confronta il campo nome
            old_name = str(old_data_row[name_column_old]).strip()
            new_name = str(new_data_row[name_column_new]).strip()
            
            if new_name != old_name and new_name != "nan" and old_name != "nan":
                is_modified = True
                modifiche.append({
                    'campo': 'nome',
                    'vecchio': old_name,
                    'nuovo': new_name
                })
            
            # Confronta anche le altre colonne comuni
            for col in compare_columns:
                if col in old_data.columns and col in new_data.columns:
                    old_value = str(old_data_row[col]).strip()
                    new_value = str(new_data_row[col]).strip()
                    
                    if new_value != old_value and new_value != "nan" and old_value != "nan":
                        is_modified = True
                        modifiche.append({
                            'campo': col,
                            'vecchio': old_value,
                            'nuovo': new_value
                        })
            
            # Se è stata rilevata una modifica, aggiungi alla lista
            if is_modified:
                modified_substances.append({
                    'cas': cas,
                    'name': new_name if new_name != "nan" else old_name,
                    'old_hazard': old_hazard if 'old_hazard' in locals() else "N/A",
                    'new_hazard': new_hazard if 'new_hazard' in locals() else "N/A",
                    'modifiche': modifiche  # Dettagli sulle modifiche
                })
                modified_count += 1
                if modified_count % 100 == 0:
                    print(f"  Trovate {modified_count} sostanze modificate...", file=sys.stderr)
            else:
                unchanged_count += 1
                if unchanged_count % 1000 == 0:
                    print(f"  Verificate {unchanged_count} sostanze senza modifiche...", file=sys.stderr)
        
        print(f"Trovate {len(modified_substances)} sostanze modificate", file=sys.stderr)
        
        # Raccogli le sostanze rimosse
        print("Raccolta delle sostanze rimosse...", file=sys.stderr)
        for cas in removed_cas_set:
            old_data_row = old_data_dict[cas]['row']
            old_name = str(old_data_row[name_column_old]).strip()
            old_hazard = str(old_data_row[h_column_old]).strip() if h_column_old else "N/A"
            
            removed_substances.append({
                'cas': cas,
                'name': old_name if old_name != "nan" else cas,
                'hazard': old_hazard if old_hazard != "nan" else "N/A"
            })
        
        print(f"Raccolte {len(removed_substances)} sostanze rimosse", file=sys.stderr)
        
        # Raccogli le sostanze aggiunte
        print("Raccolta delle sostanze aggiunte...", file=sys.stderr)
        for cas in added_cas_set:
            new_data_row = new_data_dict[cas]['row']
            new_name = str(new_data_row[name_column_new]).strip()
            new_hazard = str(new_data_row[h_column_new]).strip() if h_column_new else "N/A"
            
            added_substances.append({
                'cas': cas,
                'name': new_name if new_name != "nan" else cas,
                'hazard': new_hazard if new_hazard != "nan" else "N/A"
            })
        
        print(f"Raccolte {len(added_substances)} sostanze aggiunte", file=sys.stderr)
        
        # Limita il numero di elementi per evitare risposte troppo grandi
        max_items = 500
        if len(added_substances) > max_items:
            print(f"Limitato le sostanze aggiunte da {len(added_substances)} a {max_items}", file=sys.stderr)
            added_substances = added_substances[:max_items]
        
        if len(removed_substances) > max_items:
            print(f"Limitato le sostanze rimosse da {len(removed_substances)} a {max_items}", file=sys.stderr)
            removed_substances = removed_substances[:max_items]
        
        if len(modified_substances) > max_items:
            print(f"Limitato le sostanze modificate da {len(modified_substances)} a {max_items}", file=sys.stderr)
            modified_substances = modified_substances[:max_items]
        
        # Prepara il risultato
        print("Preparazione risultati del confronto...", file=sys.stderr)
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
        comparison_file = os.path.join(data_dir, f"echa_comparison_{timestamp}.json")
        print(f"Salvataggio risultati in: {comparison_file}", file=sys.stderr)
        
        try:
            with open(comparison_file, 'w', encoding='utf-8') as f:
                json.dump(comparison_result, f, indent=2, ensure_ascii=False)
            print(f"File JSON salvato con successo", file=sys.stderr)
        except Exception as json_error:
            print(f"ERRORE nel salvataggio del file JSON: {str(json_error)}", file=sys.stderr)
        
        # Stampa il messaggio di completamento con sintesi dei risultati
        print("=" * 80, file=sys.stderr)
        print("CONFRONTO COMPLETATO CON SUCCESSO", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        print(f"File originale: {os.path.basename(old_excel_path)}", file=sys.stderr)
        print(f"Nuovo file: {os.path.basename(new_file_path)}", file=sys.stderr)
        print(f"Risultati salvati in: {os.path.basename(comparison_file)}", file=sys.stderr)
        print(f"Sostanze aggiunte: {len(added_substances)}", file=sys.stderr)
        print(f"Sostanze rimosse: {len(removed_substances)}", file=sys.stderr)
        print(f"Sostanze modificate: {len(modified_substances)}", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        
        # Stampa i dettagli delle prime 5 sostanze di ogni categoria (se presenti)
        if added_substances:
            print("\nEsempi di sostanze aggiunte:", file=sys.stderr)
            for i, substance in enumerate(added_substances[:5]):
                print(f"  {i+1}. {substance['name']} (CAS: {substance['cas']})", file=sys.stderr)
                print(f"     Hazard: {substance['hazard']}", file=sys.stderr)
        
        if removed_substances:
            print("\nEsempi di sostanze rimosse:", file=sys.stderr)
            for i, substance in enumerate(removed_substances[:5]):
                print(f"  {i+1}. {substance['name']} (CAS: {substance['cas']})", file=sys.stderr)
                print(f"     Hazard: {substance['hazard']}", file=sys.stderr)
        
        if modified_substances:
            print("\nEsempi di sostanze modificate:", file=sys.stderr)
            for i, substance in enumerate(modified_substances[:5]):
                print(f"  {i+1}. {substance['name']} (CAS: {substance['cas']})", file=sys.stderr)
                if 'old_hazard' in substance and 'new_hazard' in substance:
                    print(f"     Vecchio hazard: {substance['old_hazard']}", file=sys.stderr)
                    print(f"     Nuovo hazard: {substance['new_hazard']}", file=sys.stderr)
                # Mostra anche le altre modifiche
                if 'modifiche' in substance:
                    for mod in substance['modifiche']:
                        print(f"     {mod['campo']}: {mod['vecchio']} -> {mod['nuovo']}", file=sys.stderr)
        
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
    try:
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
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"ERRORE in main: {str(e)}", file=sys.stderr)
        print(error_traceback, file=sys.stderr)
        
        result = {
            "success": False,
            "message": f"Errore generale: {str(e)}",
            "error_details": error_traceback
        }
        print(json.dumps(result))


if __name__ == "__main__":
    main()