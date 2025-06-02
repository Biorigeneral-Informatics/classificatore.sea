#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
aggiornamento_echa.py

Script per confrontare un database SQLite ECHA esistente con un nuovo file Excel ECHA.
"""

import pandas as pd
import sqlite3
import os
import sys
import json
from datetime import datetime
import traceback
import re

def normalize_cas(cas_value):
    """
    Normalizza un valore CAS per il confronto
    """
    if pd.isna(cas_value) or cas_value is None:
        return None
    
    cas_str = str(cas_value).strip()
    
    # Rimuovi caratteri non numerici e trattini
    if cas_str.lower() in ['nan', 'none', '', 'null']:
        return None
    
    # Rimuovi spazi extra e caratteri speciali
    cas_str = re.sub(r'[^\d\-]', '', cas_str)
    
    # Se non contiene trattini, potrebbe essere un numero senza formattazione
    if cas_str and cas_str != 'nan' and len(cas_str) > 0:
        return cas_str
    
    return None

def normalize_text(text_value):
    """
    Normalizza un valore di testo per il confronto
    """
    if pd.isna(text_value) or text_value is None:
        return ''
    
    text_str = str(text_value).strip()
    
    if text_str.lower() in ['nan', 'none', '', 'null']:
        return ''
    
    # Rimuovi spazi multipli e normalizza
    text_str = re.sub(r'\s+', ' ', text_str)
    
    return text_str

def compare_echa_excel_with_database(new_excel_path, database_path):
    """
    Confronta un database SQLite ECHA esistente con un nuovo file Excel ECHA
    """
    try:
        print(f"Nuovo file Excel: {new_excel_path}", file=sys.stderr)
        print(f"Database SQLite corrente: {database_path}", file=sys.stderr)
        
        # Verifica che i file esistano
        if not os.path.exists(new_excel_path):
            raise Exception(f"Il nuovo file Excel non esiste: {new_excel_path}")
        
        if not os.path.exists(database_path):
            raise Exception(f"Il database SQLite non esiste: {database_path}")
        
        # Carica il nuovo file Excel
        print("Caricamento nuovo file Excel...", file=sys.stderr)
        try:
            # Prova prima con header multilivello
            new_data = pd.read_excel(new_excel_path, header=[0, 1])
            print(f"Caricato nuovo file Excel con header multilivello: {len(new_data)} righe", file=sys.stderr)
            
            # Crea nomi di colonna combinati
            new_columns = []
            for col in new_data.columns:
                parts = [str(part).strip() for part in col if str(part) != 'nan']
                new_column = '_'.join(parts).replace(' ', '_').replace('(', '').replace(')', '').replace(',', '_')
                new_columns.append(new_column)
            
            new_data.columns = new_columns
            
        except Exception as e:
            print(f"Errore con header multilivello, provo con header singolo: {str(e)}", file=sys.stderr)
            new_data = pd.read_excel(new_excel_path)
        
        # Carica i dati dal database SQLite
        print("Caricamento database SQLite...", file=sys.stderr)
        try:
            conn = sqlite3.connect(database_path)
            
            # Ottieni la lista delle tabelle
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tabelle = cursor.fetchall()
            
            if not tabelle:
                conn.close()
                raise Exception("Nessuna tabella trovata nel database SQLite")
            
            # Usa la prima tabella
            nome_tabella = tabelle[0][0]
            print(f"Usando tabella del database: {nome_tabella}", file=sys.stderr)
            
            old_data = pd.read_sql_query(f"SELECT * FROM '{nome_tabella}'", conn)
            conn.close()
            
            print(f"Caricato database SQLite: {len(old_data)} righe", file=sys.stderr)
            
        except Exception as e:
            print(f"Errore nel caricamento del database: {str(e)}", file=sys.stderr)
            raise
        
        print("Colonne nuovo file Excel:", new_data.columns.tolist()[:5], "... (prime 5)", file=sys.stderr)
        print("Colonne database SQLite:", old_data.columns.tolist()[:5], "... (prime 5)", file=sys.stderr)
        
        # Identifica le colonne per il confronto in modo più flessibile
        
        # Per il nuovo file Excel
        cas_column_new = None
        name_column_new = None
        hazard_column_new = None
        
        for col in new_data.columns:
            col_lower = col.lower()
            if 'cas' in col_lower and not cas_column_new:
                cas_column_new = col
            elif ('identification' in col_lower or 'chemical' in col_lower) and not name_column_new:
                name_column_new = col
            elif ('hazard' in col_lower and 'class' in col_lower) and not hazard_column_new:
                hazard_column_new = col
        
        # Per il database SQLite
        cas_column_old = None
        name_column_old = None
        hazard_column_old = None
        
        for col in old_data.columns:
            col_lower = col.lower()
            if 'cas' in col_lower and not cas_column_old:
                cas_column_old = col
            elif ('identification' in col_lower or 'chemical' in col_lower or 'nome' in col_lower) and not name_column_old:
                name_column_old = col
            elif ('hazard' in col_lower and 'class' in col_lower) and not hazard_column_old:
                hazard_column_old = col
        
        print(f"Colonne identificate:", file=sys.stderr)
        print(f"  CAS - Nuovo: {cas_column_new}, Database: {cas_column_old}", file=sys.stderr)
        print(f"  Nome - Nuovo: {name_column_new}, Database: {name_column_old}", file=sys.stderr)
        print(f"  Hazard - Nuovo: {hazard_column_new}, Database: {hazard_column_old}", file=sys.stderr)
        
        if not cas_column_new or not cas_column_old:
            raise Exception("Impossibile identificare le colonne CAS per il confronto")
        
        # Normalizza i dati CAS
        print("Normalizzazione e pulizia colonne CAS...", file=sys.stderr)
        
        # Applica normalizzazione CAS
        new_data['cas_normalized'] = new_data[cas_column_new].apply(normalize_cas)
        old_data['cas_normalized'] = old_data[cas_column_old].apply(normalize_cas)
        
        # Rimuovi righe con CAS normalizzati vuoti
        new_data_clean = new_data[new_data['cas_normalized'].notna()].copy()
        old_data_clean = old_data[old_data['cas_normalized'].notna()].copy()
        
        print(f"Dopo normalizzazione e pulizia:", file=sys.stderr)
        print(f"  Nuovo file: {len(new_data)} -> {len(new_data_clean)} righe", file=sys.stderr)
        print(f"  Database: {len(old_data)} -> {len(old_data_clean)} righe", file=sys.stderr)
        
        # Crea set per confronto usando CAS normalizzati
        new_cas_set = set(new_data_clean['cas_normalized'].unique())
        old_cas_set = set(old_data_clean['cas_normalized'].unique())
        
        print(f"CAS unici normalizzati:", file=sys.stderr)
        print(f"  Nuovo file: {len(new_cas_set)}", file=sys.stderr)
        print(f"  Database: {len(old_cas_set)}", file=sys.stderr)
        
        # Calcola differenze
        added_cas_set = new_cas_set - old_cas_set
        removed_cas_set = old_cas_set - new_cas_set
        common_cas_set = new_cas_set & old_cas_set
        
        print(f"Risultati confronto CAS:", file=sys.stderr)
        print(f"  CAS aggiunti: {len(added_cas_set)}", file=sys.stderr)
        print(f"  CAS rimossi: {len(removed_cas_set)}", file=sys.stderr)
        print(f"  CAS comuni: {len(common_cas_set)}", file=sys.stderr)
        
        # Debug: mostra alcuni esempi di CAS rimossi se ce ne sono
        if removed_cas_set and len(removed_cas_set) < 20:
            print(f"Esempi CAS rimossi: {list(removed_cas_set)[:10]}", file=sys.stderr)
        
        # Prepara risultati
        added_substances = []
        removed_substances = []
        modified_substances = []
        
        # Sostanze aggiunte
        print("Elaborazione sostanze aggiunte...", file=sys.stderr)
        for cas_norm in added_cas_set:
            try:
                row = new_data_clean[new_data_clean['cas_normalized'] == cas_norm].iloc[0]
                
                original_cas = str(row[cas_column_new]) if cas_column_new else cas_norm
                name = normalize_text(row.get(name_column_new, '')) if name_column_new else ''
                hazard = normalize_text(row.get(hazard_column_new, '')) if hazard_column_new else ''
                
                added_substances.append({
                    "cas": original_cas,
                    "name": name,
                    "hazard": hazard
                })
            except Exception as e:
                print(f"Errore nell'elaborazione CAS aggiunto {cas_norm}: {e}", file=sys.stderr)
        
        # Sostanze rimosse - CONTROLLO AGGIUNTIVO
        print("Elaborazione sostanze rimosse (con controllo aggiuntivo)...", file=sys.stderr)
        for cas_norm in removed_cas_set:
            try:
                # Doppio controllo: verifica se il CAS è davvero assente nel nuovo file
                # Cerca anche con varianti del CAS
                cas_variants = [cas_norm]
                
                # Aggiungi varianti comuni
                if '-' in cas_norm:
                    cas_variants.append(cas_norm.replace('-', ''))
                else:
                    # Prova ad aggiungere trattini in posizioni standard per CAS
                    if len(cas_norm) >= 5:
                        # Formato standard CAS: XXXXX-XX-X
                        cas_with_dash = f"{cas_norm[:-3]}-{cas_norm[-3:-1]}-{cas_norm[-1]}"
                        cas_variants.append(cas_with_dash)
                
                # Controlla se una variante esiste nel nuovo file
                found_in_new = False
                for variant in cas_variants:
                    if variant in new_cas_set:
                        found_in_new = True
                        print(f"CAS {cas_norm} trovato come variante {variant} nel nuovo file - non rimosso", file=sys.stderr)
                        break
                
                if not found_in_new:
                    row = old_data_clean[old_data_clean['cas_normalized'] == cas_norm].iloc[0]
                    
                    original_cas = str(row[cas_column_old]) if cas_column_old else cas_norm
                    name = normalize_text(row.get(name_column_old, '')) if name_column_old else ''
                    hazard = normalize_text(row.get(hazard_column_old, '')) if hazard_column_old else ''
                    
                    removed_substances.append({
                        "cas": original_cas,
                        "name": name,
                        "hazard": hazard
                    })
                
            except Exception as e:
                print(f"Errore nell'elaborazione CAS rimosso {cas_norm}: {e}", file=sys.stderr)
        
        # Sostanze modificate
        print("Elaborazione sostanze modificate...", file=sys.stderr)
        modified_count = 0
        
        for cas_norm in common_cas_set:
            try:
                old_row = old_data_clean[old_data_clean['cas_normalized'] == cas_norm].iloc[0]
                new_row = new_data_clean[new_data_clean['cas_normalized'] == cas_norm].iloc[0]
                
                modifiche = []
                is_modified = False
                
                # Confronta hazard se disponibile
                if hazard_column_old and hazard_column_new:
                    old_hazard = normalize_text(old_row.get(hazard_column_old, ''))
                    new_hazard = normalize_text(new_row.get(hazard_column_new, ''))
                    
                    if old_hazard != new_hazard and old_hazard and new_hazard:
                        is_modified = True
                        modifiche.append({
                            'campo': 'Hazard_Class',
                            'vecchio': old_hazard,
                            'nuovo': new_hazard
                        })
                
                # Confronta nome se disponibile
                if name_column_old and name_column_new:
                    old_name = normalize_text(old_row.get(name_column_old, ''))
                    new_name = normalize_text(new_row.get(name_column_new, ''))
                    
                    if old_name != new_name and old_name and new_name:
                        is_modified = True
                        modifiche.append({
                            'campo': 'Nome',
                            'vecchio': old_name,
                            'nuovo': new_name
                        })
                
                if is_modified:
                    modified_count += 1
                    
                    original_cas = str(new_row[cas_column_new]) if cas_column_new else cas_norm
                    name = normalize_text(new_row.get(name_column_new, '')) if name_column_new else ''
                    old_hazard = normalize_text(old_row.get(hazard_column_old, '')) if hazard_column_old else ''
                    new_hazard = normalize_text(new_row.get(hazard_column_new, '')) if hazard_column_new else ''
                    
                    modified_substances.append({
                        "cas": original_cas,
                        "name": name,
                        "old_hazard": old_hazard,
                        "new_hazard": new_hazard,
                        "modifiche": modifiche
                    })
                    
                    if modified_count % 100 == 0:
                        print(f"Trovate {modified_count} sostanze modificate...", file=sys.stderr)
                        
            except Exception as e:
                print(f"Errore nel confronto CAS {cas_norm}: {e}", file=sys.stderr)
        
        print(f"Totale sostanze modificate: {len(modified_substances)}", file=sys.stderr)
        
        # Limita i risultati per evitare payload troppo grandi
        max_items = 1000
        if len(added_substances) > max_items:
            added_substances = added_substances[:max_items]
        if len(removed_substances) > max_items:
            removed_substances = removed_substances[:max_items]
        if len(modified_substances) > max_items:
            modified_substances = modified_substances[:max_items]
        
        # Prepara il risultato finale
        comparison_result = {
            'added': added_substances,
            'removed': removed_substances,
            'modified': modified_substances,
            'new_excel_path': new_excel_path,
            'current_database_path': database_path,
            'timestamp': datetime.now().isoformat(),
            'total_added': len(added_substances),
            'total_removed': len(removed_substances),
            'total_modified': len(modified_substances)
        }
        
        print("=" * 80, file=sys.stderr)
        print("CONFRONTO EXCEL vs DATABASE COMPLETATO", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        print(f"Nuovo file Excel: {os.path.basename(new_excel_path)}", file=sys.stderr)
        print(f"Database corrente: {os.path.basename(database_path)}", file=sys.stderr)
        print(f"Sostanze aggiunte: {len(added_substances)}", file=sys.stderr)
        print(f"Sostanze rimosse: {len(removed_substances)}", file=sys.stderr)
        print(f"Sostanze modificate: {len(modified_substances)}", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        
        result = {
            "success": True,
            "message": "Confronto completato con successo",
            "comparison": comparison_result
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
    Funzione principale che può essere chiamata da Electron
    """
    try:
        # Verifica gli argomenti
        if len(sys.argv) < 3:
            result = {
                "success": False,
                "message": "Argomenti insufficienti. Utilizzare: python aggiornamento_echa.py <nuovo_file_excel> <database_sqlite>"
            }
            print(json.dumps(result))
            return
        
        new_excel_path = sys.argv[1]
        database_path = sys.argv[2]
        
        print(f"Avvio confronto tra Excel e Database...", file=sys.stderr)
        print(f"Excel: {new_excel_path}", file=sys.stderr)
        print(f"Database: {database_path}", file=sys.stderr)
        
        # Esegui il confronto
        result = compare_echa_excel_with_database(new_excel_path, database_path)
        
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