#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Programma per la classificazione dei rifiuti in base alle caratteristiche di pericolo

NOTA IMPORTANTE:
---------------
Questo script attualmente usa dei dati temporanei! Vedere appunti fed eper dettagli.

"""

# Importazioni necessarie
import pandas as pd
import numpy as np
import re
import sqlite3  # Per la connessione al database


# E sostituiscila con questa funzione per caricare i dati reali:
import json
import os





#---------CARICAMENTO DATI REALI-----------#
def carica_dati_campione():
    """
    Carica i dati reali del campione dal file JSON creato nella sezione sali-metalli
    
    Returns:
        dict: Dizionario con le sostanze e le loro concentrazioni
        None: Se si verifica un errore nel caricamento
    """
    try:
        # Percorso del file JSON con i dati reali
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(script_dir, "data")
        json_path = os.path.join(data_dir, "dati_campione.json")
        
        # Controlla se il file esiste
        if not os.path.exists(json_path):
            print(f"File dei dati campione non trovato: {json_path}")
            return None
            
        # Carica il file JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            dati_reali = json.load(f)
            
        # Verifica che i dati siano validi
        if not dati_reali or not isinstance(dati_reali, dict) or len(dati_reali) == 0:
            print("File JSON caricato, ma non contiene dati validi")
            return None
            
        print(f"Dati campione caricati con successo: {len(dati_reali)} sostanze trovate")
        return dati_reali
            
    except Exception as e:
        print(f"Errore nel caricamento dei dati del campione: {str(e)}")
        return None





# ===============================================================================================================
# Definizione del mini database: sostanze - frasi H associate (TUTTE LE FRASI H VALIDE SONO QUI PER IL SOFTWARE)
# ===============================================================================================================
class DatabaseSostanze:
    def __init__(self):
        """Inizializza il database delle sostanze"""
        # Mappatura delle sostanze alle frasi H
        self.sostanze_frasi_h = {}
        
      # Mappatura delle frasi H alle caratteristiche di pericolo (HP)
# Questa associazione è fissa e non viene caricata dal database
        self.hp_mapping = {
            # HP1 - Esplosivo
            "HP1": ["H200", "H201", "H202", "H203", "H204", "H240", "H241"],
            
            # HP2 - Comburente
            "HP2": ["H270", "H271", "H272"],
            
            # HP3 - Infiammabile
            "HP3": ["H224", "H225", "H226", "H228", "H242", "H250", "H251", "H252", "H260", "H261"],
            
            # HP4 - Irritante
            "HP4": ["H314", "H315", "H318", "H319"],
            
            # HP5 - Tossicità organi bersaglio/aspirazione
            "HP5": ["H304", "H335", "H370", "H371", "H372", "H373"],
            
            # HP6 - Tossicità acuta
            "HP6": ["H300", "H301", "H302", "H310", "H311", "H312", "H330", "H331", "H332"],
            
            # HP7 - Cancerogeno
            "HP7": ["H350", "H350i", "H351"],
            
            # HP8 - Corrosivo
            "HP8": ["H314"],
            
            # HP9 - Infettivo
            # L'HP9 non è basato su frasi H ma su presenza di microrganismi vitali o tossine
            "HP9": [],
            
            # HP10 - Tossico per la riproduzione
            "HP10": ["H360", "H360D", "H360Df", "H360F", "H360FD", "H360Fd", "H361", "H361d", "H361f", "H361fd", "H362"],
            
            # HP11 - Mutageno
            "HP11": ["H340", "H341"],
            
            # HP12 - Liberazione di gas a tossicità acuta
            "HP12": ["EUH029", "EUH031", "EUH032"],
            
            # HP13 - Sensibilizzante
            "HP13": ["H317", "H334"],
            
            # HP14 - Ecotossico
            "HP14": ["H400", "H410", "H411", "H412", "H413"],
            
            # HP15 - Proprietà che rendono pericolosi i rifiuti dopo lo smaltimento
            "HP15": ["H205", "H240", "H241", "EUH001", "EUH019", "EUH044"]
        }

        # Valori soglia per ogni caratteristica di pericolo (in percentuale)
        self.valori_soglia = {
            "HP1": 0,  # Qualsiasi presenza
            "HP2": 0,  # Qualsiasi presenza
            "HP3": 0,  # Qualsiasi presenza
            "HP4": 1,  # 1% per H314 (Skin Corr. 1), H318 (Eye Dam. 1) e 10% per H315 (Skin Irrit. 2), H319 (Eye Irrit. 2)
            "HP5": 1,  # 1% per STOT SE 1, STOT RE 1, 10% per STOT SE 2, STOT RE 2
            "HP6": 0.1,  # Varia in base alla categoria
            "HP7": 0.1,  # 0.1% per Carc. 1A, 1B; 1% per Carc. 2
            "HP8": 1,  # 1% per H314
            "HP9": 0,  # Valutazione qualitativa, non basata su concentrazioni
            "HP10": 0.3,  # 0.3% per Repr. 1A, 1B; 3% per Repr. 2
            "HP11": 0.1,  # 0.1% per Muta. 1A, 1B; 1% per Muta. 2
            "HP12": 0,  # Qualsiasi presenza che possa liberare gas tossici
            "HP13": 1,  # 1% per Skin Sens. 1, Resp. Sens. 1
            "HP14": 0.1,  # Vari valori in base alla categoria
            "HP15": 0   # Qualsiasi presenza di sostanze con queste frasi
        }

        # Soglie per la sommatoria delle concentrazioni di ogni frase H
        self.soglie_sommatoria = {
            # HP4
            "H314": 1,    # Skin Corr. 1
            "H318": 1,    # Eye Dam. 1
            "H315": 10,   # Skin Irrit. 2
            "H319": 10,   # Eye Irrit. 2
            
            # HP6
            "H300": 0.1,  # Acute Tox. 1, 2 (oral)
            "H301": 0.25, # Acute Tox. 3 (oral)
            "H302": 2.5,  # Acute Tox. 4 (oral)
            "H310": 0.1,  # Acute Tox. 1, 2 (dermal)
            "H311": 0.25, # Acute Tox. 3 (dermal)
            "H312": 2.5,  # Acute Tox. 4 (dermal)
            "H330": 0.1,  # Acute Tox. 1, 2 (inhal)
            "H331": 0.25, # Acute Tox. 3 (inhal)
            "H332": 2.5,  # Acute Tox. 4 (inhal)
            
            # HP5
            "H370": 0.1,  # STOT SE 1
            "H371": 1,    # STOT SE 2
            "H372": 0.1,  # STOT RE 1
            "H373": 1,    # STOT RE 2
            "H304": 1,    # Asp. Tox. 1
            "H335": 10,   # STOT SE 3
            
            # HP7
            "H350": 0.1,  # Carc. 1A, 1B
            "H350i": 0.1, # Carc. 1A, 1B
            "H351": 1,    # Carc. 2
            
            # HP10
            "H360": 0.3,  # Repr. 1A, 1B
            "H360D": 0.3, # Repr. 1A, 1B
            "H360F": 0.3, # Repr. 1A, 1B
            "H360FD": 0.3, # Repr. 1A, 1B
            "H360Fd": 0.3, # Repr. 1A, 1B
            "H360Df": 0.3, # Repr. 1A, 1B
            "H361": 3,    # Repr. 2
            "H361d": 3,   # Repr. 2
            "H361f": 3,   # Repr. 2
            "H361fd": 3,  # Repr. 2
            "H362": 3,    # Lact.
            
            # HP11
            "H340": 0.1,  # Muta. 1A, 1B
            "H341": 1,    # Muta. 2
            
            # HP12
            "EUH029": 0,  # Qualsiasi concentrazione
            "EUH031": 0,  # Qualsiasi concentrazione
            "EUH032": 0,  # Qualsiasi concentrazione
            
            # HP13
            "H317": 1,    # Skin Sens. 1
            "H334": 1,    # Resp. Sens. 1
            
            # HP14
            "H400": 0.1,  # Aquatic Acute 1
            "H410": 0.1,  # Aquatic Chronic 1
            "H411": 0.25, # Aquatic Chronic 2
            "H412": 2.5,  # Aquatic Chronic 3
            "H413": 2.5,  # Aquatic Chronic 4
            
            # HP15
            "H205": 0,    # Qualsiasi concentrazione
            "H240": 0,    # Qualsiasi concentrazione
            "H241": 0,    # Qualsiasi concentrazione
            "EUH001": 0,  # Qualsiasi concentrazione
            "EUH019": 0,  # Qualsiasi concentrazione
            "EUH044": 0   # Qualsiasi concentrazione
        }








    #---------CONNESSIONE DB------------#
    def connetti_database(self, db_path=None):
        """
        Connette al database SQLite per ottenere le frasi H associate alle sostanze
        
        Args:
            db_path (str, optional): Percorso personalizzato del file del database SQLite.
                                    Se None, usa il percorso predefinito nella cartella DB.
                
        Returns:
            bool: True se la connessione ha avuto successo, False altrimenti
        """
        try:
            # Se non viene fornito un percorso, usa il percorso predefinito
            if db_path is None:
                import os
                script_dir = os.path.dirname(os.path.abspath(__file__))
                db_path = os.path.join(script_dir, "DB", "database_app.db")
            
            self.conn = sqlite3.connect(db_path)
            print(f"Connessione al database {db_path} stabilita con successo.")
            return True
        except sqlite3.Error as e:
            print(f"Errore nella connessione al database: {e}")
            return False

    def carica_frasi_h(self):
        """
        Carica i dati delle sostanze e frasi H dal database SQLite
        
        Questa funzione è essenziale per ottenere le associazioni tra sostanze e frasi H
        necessarie per la classificazione.
        
        Returns:
            bool: True se il caricamento ha avuto successo, False altrimenti
        """
        if not self.conn:
            print("Errore: Nessuna connessione al database attiva.")
            return False
        
        try:
            cursor = self.conn.cursor()
            
            # Verifica la struttura del database
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [table[0] for table in cursor.fetchall()]
            print(f"Tabelle presenti nel database: {', '.join(tables)}")
            
            # Query corretta per leggere dalla tabella "frasi H"
            query = """
                SELECT Nome_sostanza, Hazard_Statement
                FROM "frasi H"
            """
            
            try:
                cursor.execute(query)
            except sqlite3.OperationalError as e:
                print(f"Errore nella query SQL: {e}")
                # Tenta una query alternativa se la tabella ha un nome diverso
                alternative_names = [name for name in tables if "frasi" in name.lower() or "h" in name.lower()]
                if alternative_names:
                    print(f"Tentativo con tabelle alternative: {alternative_names}")
                    for table_name in alternative_names:
                        try:
                            query = f"""
                                SELECT Nome_sostanza, Hazard_Statement
                                FROM "{table_name}"
                            """
                            cursor.execute(query)
                            break
                        except sqlite3.OperationalError:
                            continue
                else:
                    # Se non ci sono alternative, mostra la struttura delle tabelle
                    for table in tables:
                        cursor.execute(f'PRAGMA table_info("{table}")')
                        columns = cursor.fetchall()
                        print(f"Struttura della tabella {table}: {[col[1] for col in columns]}")
                    return False
            
            # Costruisci il dizionario di sostanze e frasi H
            for row in cursor.fetchall():
                nome_sostanza = row[0]
                frase_h = row[1]
                
                if nome_sostanza not in self.sostanze_frasi_h:
                    self.sostanze_frasi_h[nome_sostanza] = []
                
                # Pulisci la frase H da eventuali asterischi e spazi
                frase_h_clean = re.sub(r'\s*\*+\s*', '', str(frase_h))
                
                if frase_h_clean and frase_h_clean not in self.sostanze_frasi_h[nome_sostanza]:
                    self.sostanze_frasi_h[nome_sostanza].append(frase_h_clean)
            
            print(f"Database caricato: {len(self.sostanze_frasi_h)} sostanze con frasi H")
            
            # Se il dizionario è vuoto, potrebbe esserci un problema con la query
            if not self.sostanze_frasi_h:
                print("Avviso: Nessuna sostanza caricata dal database.")
                return False
            
            return True
        except sqlite3.Error as e:
            print(f"Errore nel caricamento dei dati dal database: {e}")
            return False
        finally:
            cursor.close()
    
    def chiudi_connessione(self):
        """
        Chiude la connessione al database
        """
        if self.conn:
            self.conn.close()
            print("Connessione al database chiusa.")
    
    def get_frasi_h(self, nome_sostanza):
        """
        Ottiene le frasi H associate a una sostanza
        
        Args:
            nome_sostanza (str): Nome della sostanza
            
        Returns:
            list: Lista delle frasi H associate alla sostanza
        """
        return self.sostanze_frasi_h.get(nome_sostanza, [])









# =============================================================================
# Classe per la classificazione dei rifiuti
# =============================================================================
class ClassificatoreRifiuti:

    def __init__(self, database):
        """Inizializza il classificatore con un database"""
        self.database = database

    def normalize_name(self, nome):
        """
        Normalizza il nome della sostanza rimuovendo spazi extra e convertendo in minuscolo
        per un confronto più robusto.
        """
        # Rimuove spazi multipli e converte in minuscolo
        return re.sub(r'\s+', ' ', nome).lower().strip()
    
    def classifica_dati(self, campione_dati):
        """
        Classifica un rifiuto in base ai dati del campione già preprocessati
        
        Args:
            campione_dati (dict): Dizionario con chiave il nome della sostanza e valore
                                 un dizionario con 'concentrazione_ppm' e 'concentrazione_percentuale'
        
        Returns:
            dict: Risultati della classificazione o None se ci sono errori
        """
       # Verifica preliminare: controlla se tutte le sostanze sono presenti nel database
        sostanze_mancanti = []
        # Prima ottieni tutte le sostanze dal database con i loro nomi normalizzati
        cursor = self.database.conn.cursor()
        cursor.execute('SELECT Nome FROM "sostanze"')
        sostanze_db = [row[0] for row in cursor.fetchall()]
        cursor.close()

        # Crea un dizionario di nomi normalizzati per il confronto
        sostanze_db_normalize = {self.normalize_name(nome): nome for nome in sostanze_db}

        for nome_sostanza in campione_dati.keys():
            # Normalizza il nome della sostanza dall'input
            nome_normalizzato = self.normalize_name(nome_sostanza)
            
            # Controlla se il nome normalizzato esiste nel database
            if nome_normalizzato not in sostanze_db_normalize:
                sostanze_mancanti.append(nome_sostanza)

        # Se ci sono sostanze mancanti, interrompi la classificazione
        if sostanze_mancanti:
            print("\nERRORE: Impossibile avviare la classificazione.")
            print("Le seguenti sostanze non sono presenti nella Tabella di Riscontro:")
            for sostanza in sostanze_mancanti:
                print(f"  - {sostanza}")
            print("\nPotrebbe trattarsi di errori di battitura nei file di input.")
            print("Verificare i nomi delle sostanze e assicurarsi che corrispondano esattamente a quelli nella Tabella di Riscontro.")
            return None
        
        # Se tutte le sostanze sono nel database, procedi con la classificazione
        # Resto del codice esistente...

        # Dizionario per memorizzare le informazioni complete del campione
        campione = {}
        
        # Dizionario per la sommatoria delle concentrazioni per ogni frase H
        sommatoria = {frase: 0 for frase in self.database.soglie_sommatoria.keys()}
        
        # Processa ogni sostanza nel campione
        for nome_sostanza, dati in campione_dati.items():
            # Estrai i dati della sostanza
            concentrazione_ppm = dati["concentrazione_ppm"]
            concentrazione_percentuale = dati["concentrazione_percentuale"]
            
            # Cerca la sostanza nel database per ottenere le frasi H associate
            frasi_h_associate = self.database.get_frasi_h(nome_sostanza)
            
            # Se la sostanza non è trovata, avvisa ma continua
            if not frasi_h_associate:
                print(f"Avviso: Sostanza '{nome_sostanza}' non trovata nel database.")
            
            # Aggiungi la sostanza al dizionario del campione
            campione[nome_sostanza] = {
                "concentrazione_ppm": concentrazione_ppm,
                "concentrazione_percentuale": concentrazione_percentuale,
                "frasi_h": frasi_h_associate
            }
            
            # Per ogni frase H associata alla sostanza, verifica le caratteristiche di pericolo
            for frase_h in frasi_h_associate:
                # Assicurati che la frase H sia pulita e normalizzata rispetto agli spazi
                frase_h_clean = re.sub(r'\s+', '', re.sub(r'\s*\*+\s*', '', str(frase_h)))
                
                # Aggiungi la concentrazione alla sommatoria per questa frase H
                if frase_h_clean in sommatoria:
                    sommatoria[frase_h_clean] += concentrazione_percentuale
                
                # Controlla tutte le caratteristiche di pericolo
                for hp, frasi in self.database.hp_mapping.items():
                    # Normalizza anche le frasi H nel hp_mapping se necessario 
                    frasi_normalizzate = [re.sub(r'\s+', '', f) for f in frasi]
                    
                    # Se la frase H è associata a questa caratteristica di pericolo
                    if frase_h_clean in frasi_normalizzate:
                        valore_soglia = self.database.valori_soglia[hp]
                        
                        # Se la concentrazione supera la soglia
                        if concentrazione_percentuale >= valore_soglia:
                            # Assegna la caratteristica di pericolo alla sostanza
                            if "caratteristiche_pericolo" not in campione[nome_sostanza]:
                                campione[nome_sostanza]["caratteristiche_pericolo"] = []
                            
                            if hp not in campione[nome_sostanza]["caratteristiche_pericolo"]:
                                campione[nome_sostanza]["caratteristiche_pericolo"].append(hp)
        
        # Verifica finale in base alla sommatoria delle concentrazioni
        caratteristiche_pericolo_assegnate = set()
        
        # Aggiungi le caratteristiche di pericolo di ogni sostanza al set finale
        for nome_sostanza, dati in campione.items():
            if "caratteristiche_pericolo" in dati:
                for hp in dati["caratteristiche_pericolo"]:
                    caratteristiche_pericolo_assegnate.add(hp)
        
        # Per tenere traccia delle caratteristiche di pericolo assegnate per sommatoria
        hp_per_sommatoria = {}
        
        for frase_h, concentrazione_totale in sommatoria.items():
            # Verifica se la frase H è effettivamente presente nelle sostanze
            frase_presente = False
            for nome_sostanza, dati in campione.items():
                if "frasi_h" in dati and frase_h in dati["frasi_h"]:
                    frase_presente = True
                    break
            
            # Procedi solo se la frase è presente o se la concentrazione è > 0
            if frase_presente or concentrazione_totale > 0:
                if frase_h in self.database.soglie_sommatoria:
                    soglia_sommatoria = self.database.soglie_sommatoria[frase_h]
                    
                    if concentrazione_totale >= soglia_sommatoria:
                        # Trova le caratteristiche di pericolo associate a questa frase H
                        for hp, frasi in self.database.hp_mapping.items():
                            if frase_h in frasi:
                                caratteristiche_pericolo_assegnate.add(hp)
                                
                                # Aggiungi alla traccia delle HP assegnate per sommatoria
                                # (solo per le HP effettivamente associate a questa frase H)
                                if hp not in hp_per_sommatoria:
                                    hp_per_sommatoria[hp] = []
                                hp_per_sommatoria[hp].append(frase_h)
        
        # Prepara i risultati
        risultati = {
            "campione": campione,
            "sommatoria": sommatoria,
            "soglie_sommatoria": self.database.soglie_sommatoria,
            "caratteristiche_pericolo": sorted(list(caratteristiche_pericolo_assegnate)),
            "hp_per_sommatoria": hp_per_sommatoria
        }
        
        return risultati
    
    def salva_risultati(self, risultati, file_output):
        """
        Salva i risultati della classificazione in un file Excel
        
        Args:
            risultati (dict): Risultati della classificazione
            file_output (str): Percorso del file Excel di output
            
        Returns:
            bool: True se il salvataggio ha avuto successo, False altrimenti
        """
        if not risultati:
            print("Nessun risultato da salvare.")
            return False
        
        try:
            # Assicurati che la cartella risultati_classificazione esista
            import os
            risultati_dir = "risultati_classificazione"
            if not os.path.exists(risultati_dir):
                os.makedirs(risultati_dir)
            
            # Prepara il percorso completo del file
            file_path = os.path.join(risultati_dir, file_output)
            
            # Crea un DataFrame per i risultati delle sostanze
            sostanze_risultati = []
            for nome_sostanza, dati in risultati["campione"].items():
                riga = {
                    "Sostanza": nome_sostanza,
                    "Concentrazione (ppm)": dati["concentrazione_ppm"],
                    "Concentrazione (%)": dati["concentrazione_percentuale"],
                    "Frasi H": ", ".join(dati["frasi_h"]),
                }
                
                if "caratteristiche_pericolo" in dati:
                    riga["Caratteristiche di Pericolo"] = ", ".join(dati["caratteristiche_pericolo"])
                else:
                    riga["Caratteristiche di Pericolo"] = ""
                
                sostanze_risultati.append(riga)
            
            # Crea un DataFrame per i risultati della sommatoria
            sommatoria_risultati = [
                {"Frase H": frase_h, "Concentrazione Totale (%)": concentrazione}
                for frase_h, concentrazione in risultati["sommatoria"].items()
                if concentrazione > 0  # Mostra solo le frasi H con concentrazione > 0
            ]
            
            # Ordina per frase H
            sommatoria_risultati = sorted(sommatoria_risultati, key=lambda x: x["Frase H"])
            
            # Crea un DataFrame per il risultato finale
            risultato_finale = [
                {"Caratteristica di Pericolo": hp}
                for hp in risultati["caratteristiche_pericolo"]
            ]
            
            # Crea un DataFrame per le HP assegnate per sommatoria
            hp_sommatoria = []
            if "hp_per_sommatoria" in risultati and risultati["hp_per_sommatoria"]:
                for hp, frasi in risultati["hp_per_sommatoria"].items():
                    for frase in frasi:
                        valore = risultati["sommatoria"][frase]
                        soglia = risultati["soglie_sommatoria"][frase]
                        hp_sommatoria.append({
                            "Caratteristica di Pericolo": hp,
                            "Frase H": frase,
                            "Concentrazione Totale (%)": valore,
                            "Soglia (%)": soglia
                        })
            
            # Crea un file Excel con fogli multipli
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                pd.DataFrame(sostanze_risultati).to_excel(writer, sheet_name="Sostanze", index=False)
                pd.DataFrame(sommatoria_risultati).to_excel(writer, sheet_name="Sommatoria Frasi H", index=False)
                pd.DataFrame(risultato_finale).to_excel(writer, sheet_name="Risultato Finale", index=False)
                
                if hp_sommatoria:
                    pd.DataFrame(hp_sommatoria).to_excel(writer, sheet_name="HP per Sommatoria", index=False)
            
            print(f"Risultati salvati in {file_path}")
            return True
        except Exception as e:
            print(f"Errore nel salvataggio dei risultati: {e}")
            return False






# =============================================================================
# Funzioni di utilità
# =============================================================================
def stampa_risultati(risultati):
    """
    Stampa i risultati della classificazione in console in modo dettagliato
    """
    print("\n===== RISULTATI DELLA CLASSIFICAZIONE =====\n")
    
    # Stampa le caratteristiche di pericolo assegnate
    print("Caratteristiche di pericolo assegnate:")
    if risultati["caratteristiche_pericolo"]:
        for hp in sorted(risultati["caratteristiche_pericolo"]):
            print(f"  - {hp}")
    else:
        print("  Nessuna caratteristica di pericolo assegnata")
    
    print("\nDettaglio delle sostanze analizzate:")
    for nome_sostanza, dati in risultati["campione"].items():
        print(f"\n  • {nome_sostanza}")
        print(f"    Concentrazione: {dati['concentrazione_ppm']:.2f} ppm ({dati['concentrazione_percentuale']:.6f}%)")
        
        if dati["frasi_h"]:
            print(f"    Frasi H associate: {', '.join(dati['frasi_h'])}")
        else:
            print(f"    Frasi H associate: Nessuna")
        
        if "caratteristiche_pericolo" in dati and dati["caratteristiche_pericolo"]:
            print(f"    Caratteristiche di pericolo: {', '.join(dati['caratteristiche_pericolo'])}")
        else:
            print(f"    Caratteristiche di pericolo: Nessuna")
    
    print("\nSommatoria delle concentrazioni per frase H:")
    frasi_h_rilevanti = {k: v for k, v in risultati["sommatoria"].items() if v > 0}
    
    if frasi_h_rilevanti:
        for frase_h, concentrazione in sorted(frasi_h_rilevanti.items()):
            # Aggiungi indicazione se supera la soglia
            if frase_h in risultati.get("soglie_sommatoria", {}):
                soglia = risultati["soglie_sommatoria"][frase_h]
                if concentrazione >= soglia:
                    print(f"  - {frase_h}: {concentrazione:.6f}% (SUPERA LA SOGLIA DI {soglia}%)")
                else:
                    print(f"  - {frase_h}: {concentrazione:.6f}% (soglia: {soglia}%)")
            else:
                print(f"  - {frase_h}: {concentrazione:.6f}%")
    else:
        print("  Nessuna sommatoria rilevante")
    
    # Sezione per le caratteristiche di pericolo assegnate per singola sostanza
    hp_per_sostanza = {}
    for nome_sostanza, dati in risultati["campione"].items():
        if "caratteristiche_pericolo" in dati and dati["caratteristiche_pericolo"]:
            for hp in dati["caratteristiche_pericolo"]:
                if hp not in hp_per_sostanza:
                    hp_per_sostanza[hp] = []
                hp_per_sostanza[hp].append(f"{nome_sostanza} ({dati['concentrazione_percentuale']:.6f}%)")

    if hp_per_sostanza:
        print("\nCaratteristiche di pericolo assegnate per singola sostanza:")
        for hp, sostanze in sorted(hp_per_sostanza.items()):
            print(f"  - {hp}: {', '.join(sostanze)}")
    else:
        print("\nNessuna caratteristica di pericolo assegnata per singola sostanza")
    
    # Sezione per le caratteristiche di pericolo assegnate per sommatoria
    if "hp_per_sommatoria" in risultati and risultati["hp_per_sommatoria"]:
        print("\nCaratteristiche di pericolo assegnate per sommatoria:")
        
        # Filtra i valori con concentrazione a zero
        hp_per_sommatoria_filtered = {}
        for hp, frasi in risultati["hp_per_sommatoria"].items():
            frasi_rilevanti = []
            for frase in frasi:
                valore = risultati["sommatoria"].get(frase, 0)
                if valore > 0:
                    frasi_rilevanti.append(frase)
            
            if frasi_rilevanti:
                hp_per_sommatoria_filtered[hp] = frasi_rilevanti
        
        # Stampa le HP assegnate per sommatoria (solo quelle rilevanti)
        for hp, frasi in sorted(hp_per_sommatoria_filtered.items()):
            frasi_desc = []
            for frase in frasi:
                valore = risultati["sommatoria"][frase]
                soglia = risultati["soglie_sommatoria"][frase]
                frasi_desc.append(f"{frase} ({valore:.6f}% > {soglia}%)")
            
            print(f"  - {hp}: {', '.join(frasi_desc)}")
    else:
        print("\nNessuna caratteristica di pericolo assegnata per sommatoria")
    
    print("\n============================================\n")










# =============================================================================
# Funzione principale del programma
# =============================================================================
def main():
    """
    Funzione principale del programma
    """
    try:
        # Inizializza il database
        database = DatabaseSostanze()
        
        # Collegamento al database SQLite
        success_connection = database.connetti_database()
        if not success_connection:
            return json.dumps({
                "success": False, 
                "message": "Impossibile connettersi al database"
            })

        success_loading = database.carica_frasi_h()
        if not success_loading:
            return json.dumps({
                "success": False, 
                "message": "Impossibile caricare i dati dal database"
            })
        
        # Inizializza il classificatore
        classificatore = ClassificatoreRifiuti(database)
        
        # Carica i dati reali del campione
        campione_dati = carica_dati_campione()
        
        # Verifica che siano stati caricati dati
        if not campione_dati:
            return json.dumps({
                "success": False, 
                "message": "Nessun dato campione disponibile"
            })
        
        # Classifica il rifiuto usando i dati reali
        risultati = classificatore.classifica_dati(campione_dati)

        # Se c'è stato un errore nella classificazione
        if not risultati:
            return json.dumps({
                "success": False, 
                "message": "Errore durante la classificazione"
            })
        
        # Chiudi la connessione al database
        database.chiudi_connessione()
        
        # Restituisci i risultati come JSON
        return json.dumps({
            "success": True, 
            "message": "Classificazione completata con successo", 
            "data": risultati
        })
    
    except Exception as e:
        # Gestisci qualsiasi eccezione non prevista
        return json.dumps({
            "success": False, 
            "message": f"Errore durante la classificazione: {str(e)}"
        })

# =============================================================================
# Punto di ingresso del programma
# =============================================================================
if __name__ == "__main__":
    # Stampa il risultato JSON
    print(main())