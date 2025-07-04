#!/usr/bin/env python3
# Converte l'excel in dashboard.js, ricevuto tramite file json, in un dizionario

import sys
import json
import os
import sqlite3
import pandas as pd
import re
from datetime import datetime

class RaccoltaHandler:
    def __init__(self, data_path=None):
        """
        Inizializza il gestore della raccolta dati
        
        Args:
            data_path (str, optional): Percorso per salvare i dati elaborati
        """
        # Se non viene specificato un percorso, usa la cartella dell'app
        if data_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            self.data_path = os.path.join(script_dir, "data")
        else:
            self.data_path = data_path
            
        # Crea la cartella se non esiste
        os.makedirs(self.data_path, exist_ok=True)
        
        # Stampa il percorso per debug
        print(f"Percorso dati: {self.data_path}", file=sys.stderr)
    
    def clean_string(self, text):
        """
        Pulisce la stringa (rimuove spazi multipli ma mantiene maiuscole/minuscole)
        
        Args:
            text (str): Testo da pulire
            
        Returns:
            str: Testo pulito
        """
        if not text:
            return ""
        
        # Converti in stringa se non lo è già
        text = str(text)
        
        # Rimuovi spazi iniziali e finali
        text = text.strip()
        
        # Sostituisci spazi multipli con un singolo spazio
        text = re.sub(r'\s+', ' ', text)
        
        return text
    
    def is_known_substance_type(self, name):
        """
        Verifica se il nome contiene indicazioni che si tratta di una sostanza nota
        (es. metalli, composti chimici noti)
        
        Args:
            name (str): Nome da controllare
            
        Returns:
            bool: True se è una sostanza nota
        """
        # Lista di metalli e altri elementi comuni
        known_elements = [
            'arsenico', 'antimonio', 'bario', 'berillio', 'cadmio', 'cobalto', 'cromo',
            'manganese', 'mercurio', 'molibdeno', 'nichel', 'piombo', 'rame', 'selenio',
            'tallio', 'zinco', 'alluminio', 'ferro', 'argento', 'oro', 'platino', 'palladio',
            'stagno', 'vanadio', 'tungsteno', 'silicio', 'fosforo', 'zolfo', 'cloro', 'fluoro',
            'bromo', 'iodio', 'calcio', 'magnesio', 'sodio', 'potassio'
        ]
        
        name_lower = name.lower()
        
        # Se contiene il nome di un elemento noto
        for element in known_elements:
            if element in name_lower:
                return True
                
        # Se contiene "composti" o "come" (tipico dei nomi di elementi chimici)
        if 'composti' in name_lower or ' come ' in name_lower:
            return True
            
        return False
    
    def process_excel_data(self, json_path, data_type="raccolta"):
        """
        Elabora i dati JSON provenienti da un file Excel caricato nell'interfaccia
        
        Args:
            json_path (str): Percorso del file JSON contenente i dati Excel
            data_type (str): Tipo di dati ('raccolta' o 'echa') per salvare in cartelle separate
            
        Returns:
            dict: Risultato dell'elaborazione con stato e messaggio
        """
        try:
            print(f"Elaborazione dati di tipo: {data_type}", file=sys.stderr)
            print(f"File da elaborare: {json_path}", file=sys.stderr)
            
            # Leggi il file JSON
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Verifica se i dati sono validi
            if not data or not isinstance(data, list):
                print("Dati non validi", file=sys.stderr)
                return {"success": False, "message": "I dati non sono validi"}
                
            # Stampa le prime righe per debug
            print(f"Prime righe di dati: {data[:2]}", file=sys.stderr)
                
            # Converti in DataFrame per un'elaborazione più semplice
            df = pd.DataFrame(data)
            
            # In base al tipo di dati, salva in cartelle separate
            if data_type == "echa":
                print("Elaborazione dati ECHA", file=sys.stderr)
                
                # Crea una sottocartella dedicata per i dati ECHA
                echa_dir = os.path.join(self.data_path, "echa")
                if not os.path.exists(echa_dir):
                    os.makedirs(echa_dir, exist_ok=True)
                
                # Percorsi dei file
                pickle_path = os.path.join(echa_dir, "echa_data.pkl")
                processed_json_path = os.path.join(echa_dir, "echa_data.json")
                
                print(f"Salvataggio dati ECHA in: {processed_json_path}", file=sys.stderr)
                
                # Salva una copia in un file pickle per elaborazioni future
                df.to_pickle(pickle_path)
                
                # Crea il dizionario con dati elaborati
                processed_data = {
                    "timestamp": datetime.now().isoformat(),
                    "filename": os.path.basename(json_path),
                    "data": data,
                    "columns": df.columns.tolist()
                }
                
                # Salva come JSON
                with open(processed_json_path, 'w', encoding='utf-8') as f:
                    json.dump(processed_data, f, ensure_ascii=False, indent=2)
                
                return {
                    "success": True, 
                    "message": "Dati ECHA elaborati con successo", 
                    "data": data,
                    "columns": df.columns.tolist()
                }
            else:  # data_type == "raccolta"
                print("Elaborazione dati RACCOLTA", file=sys.stderr)
                
                # NUOVO CODICE: Verifica solo le sostanze che NON sono metalli noti
                if len(df.columns) > 0:
                    print(f"Colonne nel DataFrame: {df.columns.tolist()}", file=sys.stderr)
                    
                    # Ottieni la prima colonna
                    prima_colonna = df.columns[0]
                    print(f"Nome della prima colonna: '{prima_colonna}'", file=sys.stderr)
                    
                    # Estrai i valori non nulli dalla prima colonna (nomi delle sostanze)
                    sostanze_nel_file = []
                    for sostanza in df[prima_colonna].dropna():
                        sostanza_str = str(sostanza)
                        if sostanza_str:  # Assicurati che non sia vuota
                            sostanze_nel_file.append(sostanza_str)
                    
                    print(f"Sostanze trovate nel file ({len(sostanze_nel_file)}): {sostanze_nel_file}", file=sys.stderr)
                    
                    # Connessione al database
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    db_path = os.path.join(script_dir, "DB", "database_app.db")
                    print(f"Percorso database: {db_path}", file=sys.stderr)
                    
                    if not os.path.exists(db_path):
                        print(f"ERRORE: Database non trovato in: {db_path}", file=sys.stderr)
                        return {"success": False, "message": "Database non trovato"}
                    
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    
                    # Ottieni tutte le sostanze dal database
                    cursor.execute("SELECT Nome FROM sostanze")
                    sostanze_db_rows = cursor.fetchall()
                    
                    if not sostanze_db_rows:
                        print("ATTENZIONE: Nessuna sostanza trovata nel database!", file=sys.stderr)
                    
                    # Crea set per confronto veloce
                    sostanze_db_clean = set()
                    sostanze_db_orig = set()
                    
                    for row in sostanze_db_rows:
                        original = str(row[0])
                        sostanze_db_orig.add(original)
                        cleaned = self.clean_string(original)
                        sostanze_db_clean.add(cleaned)
                    
                    print(f"Sostanze nel DB ({len(sostanze_db_orig)}): {list(sostanze_db_orig)[:10]}...", file=sys.stderr)
                    
                    # Controlla ogni sostanza nel file
                    sostanze_mancanti = []
                    for sostanza in sostanze_nel_file:
                        # Pulisci la sostanza
                        sostanza_clean = self.clean_string(sostanza)
                        
                        # Controllo 1: Esiste esattamente nel DB?
                        if sostanza in sostanze_db_orig:
                            print(f"Corrispondenza esatta: '{sostanza}'", file=sys.stderr)
                            continue
                            
                        # Controllo 2: Esiste una versione pulita nel DB?
                        if sostanza_clean in sostanze_db_clean:
                            print(f"Corrispondenza dopo pulizia: '{sostanza}'", file=sys.stderr)
                            continue
                            
                        # Controllo 3: È un tipo di sostanza nota (es. metallo)?
                        if self.is_known_substance_type(sostanza):
                            print(f"Sostanza nota riconosciuta: '{sostanza}'", file=sys.stderr)
                            continue
                        
                        # Se non passa nessuno dei controlli, è mancante
                        print(f"Sostanza sconosciuta/mancante: '{sostanza}'", file=sys.stderr)
                        sostanze_mancanti.append(sostanza)
                    
                    conn.close()
                    
                    # Se ci sono sostanze mancanti, restituisci errore
                    if sostanze_mancanti:
                        print(f"Sostanze mancanti nel database: {sostanze_mancanti}", file=sys.stderr)
                        return {
                            "success": False, 
                            "message": f"Alcune sostanze non sono presenti nel database: {', '.join(sostanze_mancanti)}",
                            "sostanze_mancanti": sostanze_mancanti
                        }
                
                # Crea un percorso specifico per i dati della raccolta
                raccolta_dir = os.path.join(self.data_path, "raccolta")
                if not os.path.exists(raccolta_dir):
                    os.makedirs(raccolta_dir, exist_ok=True)
                
                # Percorsi dei file
                pickle_path = os.path.join(raccolta_dir, "raccolta_data.pkl")
                processed_json_path = os.path.join(raccolta_dir, "raccolta_data.json")
                
                print(f"Salvataggio dati RACCOLTA in: {processed_json_path}", file=sys.stderr)
                
                # Salva una copia in un file pickle per elaborazioni future più veloci
                df.to_pickle(pickle_path)
                
                # Crea il DIZIONARIO CON DATI ELABORATI
                processed_data = {
                    "timestamp": datetime.now().isoformat(),
                    "filename": os.path.basename(json_path),
                    "data": data,
                    "columns": df.columns.tolist()
                }
                
                # Salva come JSON
                with open(processed_json_path, 'w', encoding='utf-8') as f:
                    json.dump(processed_data, f, ensure_ascii=False, indent=2)
                
                # Identifica i metalli nel campione
                metalli_campione = identifica_metalli_campione(data)
                
                # Salva i metalli identificati nel file JSON
                metalli_path = os.path.join(self.data_path, "metalli_campione.json")
                with open(metalli_path, 'w', encoding='utf-8') as f:
                    json.dump(metalli_campione, f, ensure_ascii=False, indent=2)
                    
                return {
                    "success": True, 
                    "message": "Dati Excel elaborati con successo", 
                    "data": data,
                    "columns": df.columns.tolist(),
                    "metalli_campione": metalli_campione
                }
                
        except Exception as e:
            import traceback
            traceback.print_exc(file=sys.stderr)
            print(f"Errore nell'elaborazione del file: {str(e)}", file=sys.stderr)
            return {"success": False, "message": f"Errore nell'elaborazione del file: {str(e)}"}


def process_excel(json_path, data_type="raccolta"):
    """
    Funzione wrapper per l'elaborazione dei dati Excel
    
    Args:
        json_path (str): Percorso del file JSON contenente i dati Excel
        data_type (str): Tipo di dati ('raccolta' o 'echa')
        
    Returns:
        str: JSON con il risultato dell'elaborazione
    """
    print(f"Inizio process_excel con tipo: {data_type}, file: {json_path}", file=sys.stderr)
    
    handler = RaccoltaHandler()
    result = handler.process_excel_data(json_path, data_type)
    
    print(f"Risultato process_excel_data: {result.get('success')}", file=sys.stderr)
    
    # Verifica che il risultato contenga dati prima di procedere
    if result.get("success") and result.get("data"):
        try:
            # Estrai i dati per identificare i metalli (solo per dati di raccolta)
            if data_type == "raccolta":
                data = result.get("data", [])
                
                # Identifica i metalli e aggiungi al risultato
                metalli_campione = identifica_metalli_campione(data)
                result["metalli_campione"] = metalli_campione
                
                # Usa sys.stderr invece di print standard
                print(f"Metalli identificati: {len(metalli_campione)}", file=sys.stderr)
            else:
                # Per i dati ECHA, non cerchiamo metalli
                result["metalli_campione"] = {}
                print("Saltata identificazione metalli per dati ECHA", file=sys.stderr)
        except Exception as e:
            print(f"Errore nell'identificazione dei metalli: {str(e)}", file=sys.stderr)
            # Non far fallire l'intera operazione per un errore nell'identificazione dei metalli
            result["metalli_campione"] = {}
    else:
        result["metalli_campione"] = {}

    # Qui stampiamo solo il JSON risultante, nulla prima o dopo
    return json.dumps(result)


def identifica_metalli_campione(excel_data):
    """
    Identifica i metalli nel campione e crea un dizionario con le loro concentrazioni
    Ignora tutti i valori che iniziano con "<"
    """
    metalli_campione = {}
    
    # Connessione al database per verificare quali sostanze sono metalli
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(script_dir, "DB", "database_app.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Ottieni tutti i metalli dal database con i loro ID
        cursor.execute("SELECT ID, Nome FROM sostanze WHERE Categoria = 'Metallo'")
        metalli_db = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Funzione per pulire una stringa
        def clean_string(text):
            if not text:
                return ""
            text = str(text).strip()
            text = re.sub(r'\s+', ' ', text)
            return text
        
        # Crea versioni pulite per il confronto
        metalli_db_clean = {id: clean_string(nome) for id, nome in metalli_db.items()}
        
        print(f"Metalli nel database: {metalli_db}", file=sys.stderr)
        
        # Verifica quali metalli sono presenti nei dati Excel
        for row in excel_data:
            nome_sostanza_orig = row.get("Descriz", "")
            nome_sostanza_clean = clean_string(nome_sostanza_orig)
            valore_txt = row.get("Valore_Txt", "")
            
            print(f"Analisi sostanza: '{nome_sostanza_orig}'", file=sys.stderr)
            
            if not nome_sostanza_orig or not valore_txt:
                continue
                
            # Ignora valori che iniziano con "<"
            if valore_txt.strip().startswith("<"):
                print(f"Ignorato valore '{valore_txt}' per '{nome_sostanza_orig}' perché sotto il limite di rilevabilità", file=sys.stderr)
                continue
            
            try:
                concentrazione = float(valore_txt)
                
                # Cerca corrispondenze tra i metalli del database
                metallo_trovato = False
                metallo_id = None
                
                # Confronto 1: Corrispondenza diretta
                for id, nome in metalli_db.items():
                    if nome_sostanza_orig == nome:
                        metallo_trovato = True
                        metallo_id = id
                        print(f"Corrispondenza esatta: '{nome_sostanza_orig}' = '{metalli_db[id]}'", file=sys.stderr)
                        break
                
                # Confronto 2: Corrispondenza dopo pulizia
                if not metallo_trovato:
                    for id, nome_clean in metalli_db_clean.items():
                        if nome_sostanza_clean == nome_clean:
                            metallo_trovato = True
                            metallo_id = id
                            print(f"Corrispondenza dopo pulizia: '{nome_sostanza_orig}' ↔ '{metalli_db[id]}'", file=sys.stderr)
                            break
                
                # Se abbiamo trovato un metallo, aggiungiamolo
                if metallo_trovato and metallo_id is not None:
                    metallo_nome_db = metalli_db[metallo_id]
                    metalli_campione[nome_sostanza_orig] = {
                        "concentrazione_ppm": concentrazione,
                        "concentrazione_percentuale": concentrazione / 10000,
                        "metallo_db_nome": metallo_nome_db,
                        "metallo_db_id": metallo_id
                    }
                else:
                    print(f"Nessun metallo trovato per '{nome_sostanza_orig}'", file=sys.stderr)
                
            except ValueError as e:
                print(f"Errore nella conversione della concentrazione per '{nome_sostanza_orig}': {e}", file=sys.stderr)
        
        conn.close()
        
        print(f"Metalli trovati nel campione: {list(metalli_campione.keys())}", file=sys.stderr)
        
    except Exception as e:
        print(f"Errore nell'identificazione dei metalli: {str(e)}", file=sys.stderr)
    
    return metalli_campione

def main():
    """
    Funzione principale che viene chiamata quando lo script viene eseguito
    da Electron.
    """
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "message": "Argomenti insufficienti"}))
        return

    command = sys.argv[1]
    
    try:
        if command == "process_excel":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "message": "Argomenti insufficienti per process_excel"}))
                return
            
            json_path = sys.argv[2]
            # Controlla se è stato specificato un tipo di dati (raccolta o echa)
            data_type = "raccolta"  # Valore predefinito
            if len(sys.argv) >= 4:
                data_type = sys.argv[3]
            
            print(f"Esecuzione process_excel con: path={json_path}, tipo={data_type}", file=sys.stderr)
            result = process_excel(json_path, data_type)
            print(result)
            
        else:
            print(json.dumps({"success": False, "message": f"Comando sconosciuto: {command}"}))
            
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "message": f"Errore: {str(e)}"}))


if __name__ == "__main__":
    main()