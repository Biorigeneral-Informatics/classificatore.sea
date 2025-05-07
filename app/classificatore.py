#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Implementazione dell'HP3 nel classificatore rifiuti
"""

import os
import json
import re
import sqlite3
import pandas as pd
from datetime import datetime

#---------CARICAMENTO DATI CAMPIONE-----------#
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


# Funzione per caricare le informazioni della raccolta
def carica_info_raccolta():
    """
    Carica le informazioni di raccolta, inclusi stato fisico e punto di infiammabilità
    
    Returns:
        dict: Dizionario con le informazioni di raccolta
        None: Se si verifica un errore nel caricamento
    """
    try:
        # Percorso delle informazioni di raccolta
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Percorsi possibili per info_raccolta.json
        # 1. Nella cartella dati dell'applicazione (classico)
        data_dir = os.path.join(script_dir, "data")
        classic_path = os.path.join(data_dir, "info_raccolta.json")
        
        # 2. Nella cartella utente (Electron)
        from pathlib import Path
        home_dir = str(Path.home())
        electron_dir = os.path.join(home_dir, '.config', 'WasteGuard') if os.name != 'nt' else os.path.join(os.getenv('APPDATA'), 'WasteGuard')
        electron_path = os.path.join(electron_dir, "info_raccolta.json")
        
        # Prova a caricare da uno dei percorsi possibili
        if os.path.exists(classic_path):
            file_path = classic_path
        elif os.path.exists(electron_path):
            file_path = electron_path
        else:
            print("File info_raccolta.json non trovato. Percorsi cercati:")
            print(f"- {classic_path}")
            print(f"- {electron_path}")
            return None
        
        # Carica il file JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            info_raccolta = json.load(f)
        
        print(f"Informazioni raccolta caricate con successo da {file_path}")
        return info_raccolta
        
    except Exception as e:
        print(f"Errore nel caricamento delle informazioni raccolta: {str(e)}")
        return None


class DatabaseSostanze:
    def __init__(self):
        """Inizializza il database delle sostanze"""
        # Connessione al database
        self.conn = None
        
        # Mappatura delle sostanze alle frasi H
        self.sostanze_frasi_h = {}
        
        # Mappatura delle frasi H alle caratteristiche di pericolo (HP)
        # Questa associazione è fissa e verrà usata per determinare quali frasi H sono rilevanti per ogni HP
        self.hp_mapping = {
            # HP1 - Esplosivo
            "HP1": ["H200", "H201", "H202", "H203", "H204", "H240", "H241"],

            # HP2 - Comburente
            "HP2": ["H270", "H271", "H272"],

            # HP3 - Infiammabile
            "HP3": ["H224", "H225", "H226", "H228", "H242", "H250", "H251", "H252", "H260", "H261"],

            # HP4 - Irritante
            "HP4": ["H314", "H315", "H318", "H319"],

            # HP5 - Tossicità specifica per organi bersaglio (STOT)/Tossicità in caso di aspirazione
            "HP5": ["H370", "H371", "H335", "H372", "H373", "H304"],

            # HP6 - Tossicità acuta
            "HP6": ["H300", "H301", "H302", "H310", "H311", "H312", "H330", "H331", "H332"],

            # HP8 - Corrosivo
            "HP8": ["H314"],
            
            # Altre HP verranno aggiunte in seguito
        }

        # Valori CUT-OFF (soglia) per ogni caratteristica di pericolo (in percentuale)
        # Questi valori fungono da filtro: se la concentrazione è < cut-off, 
        # la sostanza NON viene considerata nella classificazione
        self.valori_cut_off = {
            "HP1": 0,  # HP1 non ha valori soglia cut-off
            "HP2": 0,  # HP2 non ha valori soglia cut-off
            "HP3": 0,  # HP3 non ha valori soglia cut-off
            "HP4": 1.0,  # HP4 ha valore soglia dell'1%
            "HP5": 1.0,  # HP5 ha valore soglia dell'1% per H370, H372
            "HP6": 1.0,  # HP6 ha valore soglia dell'1%
            "HP8": 1.0,  # HP8 ha valore soglia dell'1%
            
            # Altri valori soglia verranno aggiunti in seguito
        }

        # Valori LIMITE per attribuzione effettiva delle caratteristiche di pericolo
        # Questi valori determinano se una HP deve essere assegnata in base a sommatorie specifiche
        self.valori_limite = {
            # HP1 - Esplosivo
            "H200": 0.1,   # Esplosivo instabile
            "H201": 0.1,   # Esplosivo; pericolo di esplosione di massa
            "H202": 0.1,   # Esplosivo; grave pericolo di proiezione
            "H203": 0.1,   # Esplosivo; pericolo di incendio, di spostamento d'aria o di proiezione
            "H204": 0.1,   # Pericolo di incendio o di proiezione
            "H240": 0.1,   # Rischio di esplosione per riscaldamento
            "H241": 0.1,   # Rischio d'incendio o di esplosione per riscaldamento

            # HP2 - Comburente
            "H270": 0.1,   # Può provocare o aggravare un incendio; comburente
            "H271": 0.1,   # Può provocare un incendio o un'esplosione; molto comburente
            "H272": 0.1,   # Può aggravare un incendio; comburente

            # HP3 - Infiammabile
            # Per le frasi H di HP3, ogni frase ha un limite minimo dello 0.1%
            "H224": 0.1,   # Liquido e vapori altamente infiammabili
            "H225": 0.1,   # Liquido e vapori facilmente infiammabili
            "H226": 0.1,   # Liquido e vapori infiammabili
            "H228": 0.1,   # Solido infiammabile
            "H242": 0.1,   # Rischio d'incendio per riscaldamento
            "H250": 0.1,   # Spontaneamente infiammabile all'aria
            "H251": 0.1,   # Autoriscaldante; può infiammarsi
            "H252": 0.1,   # Autoriscaldante in grandi quantità; può infiammarsi
            "H260": 0.1,   # A contatto con l'acqua libera gas infiammabili che possono infiammarsi spontaneamente
            "H261": 0.1,   # A contatto con l'acqua libera gas infiammabili

            # HP4 - Irritante
            "H314_HP4_MIN": 1.0,  # Per HP4: Limite minimo per H314
            "H314_HP4_MAX": 5.0,  # Per HP4: Limite massimo per H314 (sotto questo valore è HP4, sopra è HP8)
            "H318": 10.0,         # Somma delle sostanze con H318 deve essere ≥ 10%
            "H315_H319": 20.0,    # Somma delle sostanze con H315 e/o H319 deve essere ≥ 20%

            # HP5 - Tossicità specifica per organi bersaglio (STOT)
            "H370": 1.0,   # STOT SE 1 limite 1%
            "H371": 10.0,  # STOT SE 2 limite 10%
            "H335": 20.0,  # STOT SE 3 limite 20%
            "H372": 1.0,   # STOT RE 1 limite 1%
            "H373": 10.0,  # STOT RE 2 limite 10%
            "H304": 10.0,  # Asp. Tox. 1 limite 10%

            # HP6 - Tossicità acuta
            ## Esposizione orale
            "H300_1": 0.1,    # Acute Tox. 1 (H300)
            "H300_2": 0.25,   # Acute Tox. 2 (H300)
            "H301": 5.0,      # Acute Tox. 3 (H301)
            "H302": 25.0,     # Acute Tox. 4 (H302)
            ## Esposizione cutanea
            "H310_1": 0.25,   # Acute Tox. 1 (H310)
            "H310_2": 2.5,    # Acute Tox. 2 (H310)
            "H311": 15.0,     # Acute Tox. 3 (H311)
            "H312": 55.0,     # Acute Tox. 4 (H312)
            ## Esposizione per inalazione
            "H330_1": 0.1,    # Acute Tox. 1 (H330)
            "H330_2": 0.5,    # Acute Tox. 2 (H330)
            "H331": 3.5,      # Acute Tox. 3 (H331)
            "H332": 22.5,     # Acute Tox. 4 (H332)            

            # HP8 - Corrosivo
            "H314": 5.0,  # Somma delle concentrazioni delle sostanze con H314 deve essere ≥ 5%
            

            # Altri valori limite verranno aggiunti in seguito
        }

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








#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################



#------------- INIZO CLASSE CLASSIFICATORE RIFIUTI -------------#

#Questa classe è:
## - La responsabile della classificazione con il metodo classifica_dati
## - La responsabile della normalizzazione dei nomi delle sostanze con il metodo normalize_name
## - Gestisce tuti i diversi approcci di classificazione per ogni HP


#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################






class ClassificatoreRifiuti:
    def __init__(self, database):
        """Inizializza il classificatore con un database"""
        self.database = database
        
        # Carica informazioni dalla raccolta
        self.info_raccolta = carica_info_raccolta()
        
        # Imposta valori predefiniti
        self.stato_fisico = None
        self.punto_infiammabilita = None
        self.contiene_gasolio = False
        
        # Estrai le informazioni rilevanti se disponibili
        if self.info_raccolta and 'caratteristicheFisiche' in self.info_raccolta:
            self.stato_fisico = self.info_raccolta['caratteristicheFisiche'].get('statoFisico', None)
            self.contiene_gasolio = self.info_raccolta['caratteristicheFisiche'].get('gasolio', False)
            
            # Estrai e converti il punto di infiammabilità
            infiammabilita_str = self.info_raccolta['caratteristicheFisiche'].get('infiammabilita', '')
            try:
                # Estrai solo il valore numerico dal campo infiammabilità
                # Ad esempio, da "55 °C" estrae "55"
                numeric_match = re.search(r'(\d+(?:\.\d+)?)', infiammabilita_str)
                if numeric_match:
                    self.punto_infiammabilita = float(numeric_match.group(1))
                    print(f"Punto di infiammabilità estratto: {self.punto_infiammabilita} °C")
                else:
                    print(f"Impossibile estrarre punto di infiammabilità da: '{infiammabilita_str}'")
            except (ValueError, TypeError) as e:
                print(f"Errore nella conversione del punto di infiammabilità: {e}")
                self.punto_infiammabilita = None
        
        # Log delle informazioni estratte
        print(f"Stato fisico: {self.stato_fisico}")
        print(f"Punto di infiammabilità: {self.punto_infiammabilita} °C")
        print(f"Contiene gasolio/carburanti/oli: {self.contiene_gasolio}")



    #-----------METODI DI CLASSIFICAZIONE E NORMALIZZAZIONE-----------#
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
        try:
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
            
            # Dizionario per memorizzare le informazioni complete del campione
            campione = {}
            
            # Dizionari per tenere traccia delle sommatorie
            # Sommatoria per ciascuna frase H specifica
            sommatoria_per_frase = {}
            
            # Insieme per tenere traccia delle caratteristiche di pericolo assegnate
            hp_assegnate = set()
            
            # Dizionario per memorizzare le motivazioni delle assegnazioni HP
            motivazioni_hp = {}
            
            # STEP 1: Verifica preliminare per HP3 - Controllo punto di infiammabilità
            # Questa verifica viene fatta prima di processare le sostanze
            hp3_infiammabilita = self._verifica_hp3_infiammabilita()
            if hp3_infiammabilita["assegnata"]:
                hp_assegnate.add("HP3")
                motivazioni_hp["HP3"] = hp3_infiammabilita["motivo"]
            
            # STEP 1.1: Verifica preliminare per HP8 - Controllo pH
            hp8_ph = self._verifica_hp8_ph()
            if hp8_ph["assegnata"]:
                hp_assegnate.add("HP8")
                motivazioni_hp["HP8"] = hp8_ph["motivo"]
            
            # STEP 2: Processa ogni sostanza nel campione
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
                
                # Inizializza un insieme per tenere traccia delle caratteristiche di pericolo della sostanza
                hp_sostanza = set()
                
                #------AGGIORNAMENTO SOMMATORIE E VERIFICA DEI CUT-OFF--------#
                # Per ogni frase H associata alla sostanza, aggiorna le sommatorie
                for frase_h in frasi_h_associate:
                    # Assicurati che la frase H sia pulita e normalizzata rispetto agli spazi
                    frase_h_clean = re.sub(r'\s+', '', re.sub(r'\s*\*+\s*', '', str(frase_h)))
                    
                    # Inizializza la sommatoria per questa frase se non esiste già
                    if frase_h_clean not in sommatoria_per_frase:
                        sommatoria_per_frase[frase_h_clean] = 0
                    
                    # Per HP1, le frasi H corrispondenti hanno tutte limite 0.1%
                    if frase_h_clean in self.database.hp_mapping["HP1"]:
                        # Aggiungi alla sommatoria senza considerare il cut-off (come per HP3)
                        sommatoria_per_frase[frase_h_clean] += concentrazione_percentuale
                        
                        # Verifica se la frase supera il limite per HP1
                        if concentrazione_percentuale >= self.database.valori_limite.get(frase_h_clean, 0):
                            hp_sostanza.add("HP1")
                    
                    # Per HP2, le frasi H corrispondenti hanno tutte limite 0.1%
                    if frase_h_clean in self.database.hp_mapping["HP2"]:
                        # Aggiungi alla sommatoria senza considerare il cut-off (come per HP1 e HP3)
                        sommatoria_per_frase[frase_h_clean] += concentrazione_percentuale
                        
                        # Verifica se la frase supera il limite per HP2
                        if concentrazione_percentuale >= self.database.valori_limite.get(frase_h_clean, 0):
                            hp_sostanza.add("HP2")
                    
                    # Per HP3, le frasi H corrispondenti hanno tutte limite 0.1%
                    if frase_h_clean in self.database.hp_mapping["HP3"]:
                        # Aggiungi alla sommatoria solo se la concentrazione supera il cut-off
                        sommatoria_per_frase[frase_h_clean] += concentrazione_percentuale
                        
                        # Verifica se la frase supera il limite per HP3
                        if concentrazione_percentuale >= self.database.valori_limite.get(frase_h_clean, 0):
                            hp_sostanza.add("HP3")
                    
                    # Per HP8, verifica H314 con cut-off 1%
                    if frase_h_clean in self.database.hp_mapping["HP8"]:
                        # Aggiungi alla sommatoria solo se la concentrazione supera il cut-off
                        if concentrazione_percentuale >= self.database.valori_cut_off.get("HP8", 1.0):
                            sommatoria_per_frase[frase_h_clean] += concentrazione_percentuale
                            
                            # Aggiungi HP8 alle HP della sostanza
                            hp_sostanza.add("HP8")

                    # Per HP4, verifica frasi H con cut-off 1%
                    if frase_h_clean in self.database.hp_mapping["HP4"]:
                        # Aggiungi alla sommatoria solo se la concentrazione supera il cut-off
                        if concentrazione_percentuale >= self.database.valori_cut_off.get("HP4", 1.0):
                            sommatoria_per_frase[frase_h_clean] += concentrazione_percentuale
                            
                            # Aggiungi HP4 alle HP della sostanza
                            hp_sostanza.add("HP4")
                    
                    # Per HP5, verifica frasi H con cut-off 1%
                    if frase_h_clean in self.database.hp_mapping["HP5"]:
                        # Aggiungi alla sommatoria solo se la concentrazione supera il cut-off
                        if concentrazione_percentuale >= self.database.valori_cut_off.get("HP5", 1.0):
                            sommatoria_per_frase[frase_h_clean] += concentrazione_percentuale
                            
                            # Aggiungi HP5 alle HP della sostanza
                            hp_sostanza.add("HP5")
                    
                    # Per HP6, verifica frasi H con cut-off 1%
                    if frase_h_clean in self.database.hp_mapping["HP6"]:
                        # Aggiungi alla sommatoria solo se la concentrazione supera il cut-off
                        if concentrazione_percentuale >= self.database.valori_cut_off.get("HP6", 1.0):
                            # Per le frasi H300 e H310 e H330 che possono essere di categoria 1 o 2
                            # useremo la categoria più conservativa (categoria 1)
                            if frase_h_clean == "H300":
                                frase_key = "H300_1"  # Categoria 1, valore più basso
                            elif frase_h_clean == "H310":
                                frase_key = "H310_1"  # Categoria 1, valore più basso
                            elif frase_h_clean == "H330":
                                frase_key = "H330_1"  # Categoria 1, valore più basso
                            else:
                                frase_key = frase_h_clean
                            
                            # Aggiungi alla sommatoria
                            sommatoria_per_frase[frase_h_clean] += concentrazione_percentuale
                            
                            # Aggiungi HP6 alle HP della sostanza
                            hp_sostanza.add("HP6")
                
                # Salva le caratteristiche di pericolo associate alla sostanza
                if hp_sostanza:
                    campione[nome_sostanza]["caratteristiche_pericolo"] = list(hp_sostanza)
                    # Aggiorna l'insieme globale delle HP assegnate
                    hp_assegnate.update(hp_sostanza)
            
            # STEP 3: Verifica le sommatorie per HP3
            hp3_sommatoria = self._verifica_hp3_sommatoria(sommatoria_per_frase)
            if hp3_sommatoria["assegnata"]:
                hp_assegnate.add("HP3")
                # Aggiungi o aggiorna la motivazione
                if "HP3" in motivazioni_hp:
                    motivazioni_hp["HP3"] = f"{motivazioni_hp['HP3']}; {hp3_sommatoria['motivo']}"
                else:
                    motivazioni_hp["HP3"] = hp3_sommatoria["motivo"]
            
            # STEP 4: Verifica le sommatorie per HP8
            hp8_sommatoria = self._verifica_hp8_sommatoria(sommatoria_per_frase)
            if hp8_sommatoria["assegnata"]:
                hp_assegnate.add("HP8")
                # Aggiungi o aggiorna la motivazione
                if "HP8" in motivazioni_hp:
                    motivazioni_hp["HP8"] = f"{motivazioni_hp['HP8']}; {hp8_sommatoria['motivo']}"
                else:
                    motivazioni_hp["HP8"] = hp8_sommatoria["motivo"]

            # STEP 5: Verifica le sommatorie per HP4
            hp4_sommatoria = self._verifica_hp4_sommatoria(sommatoria_per_frase)
            if hp4_sommatoria["assegnata"]:
                hp_assegnate.add("HP4")
                # Aggiungi o aggiorna la motivazione
                if "HP4" in motivazioni_hp:
                    motivazioni_hp["HP4"] = f"{motivazioni_hp['HP4']}; {hp4_sommatoria['motivo']}"
                else:
                    motivazioni_hp["HP4"] = hp4_sommatoria["motivo"]

            # STEP 6: Verifica le sommatorie per HP5
            hp5_sommatoria = self._verifica_hp5_sommatoria(sommatoria_per_frase)
            if hp5_sommatoria["assegnata"]:
                hp_assegnate.add("HP5")
                # Aggiungi o aggiorna la motivazione
                if "HP5" in motivazioni_hp:
                    motivazioni_hp["HP5"] = f"{motivazioni_hp['HP5']}; {hp5_sommatoria['motivo']}"
                else:
                    motivazioni_hp["HP5"] = hp5_sommatoria["motivo"]
            
            # STEP 7: Verifica le sommatorie per HP6
            hp6_sommatoria = self._verifica_hp6_sommatoria(sommatoria_per_frase)
            if hp6_sommatoria["assegnata"]:
                hp_assegnate.add("HP6")
                # Aggiungi o aggiorna la motivazione
                if "HP6" in motivazioni_hp:
                    motivazioni_hp["HP6"] = f"{motivazioni_hp['HP6']}; {hp6_sommatoria['motivo']}"
                else:
                    motivazioni_hp["HP6"] = hp6_sommatoria["motivo"]
            
            # STEP 8: Verifica le sommatorie per HP1
            hp1_sommatoria = self._verifica_hp1_sommatoria(sommatoria_per_frase)
            if hp1_sommatoria["assegnata"]:
                hp_assegnate.add("HP1")
                # Aggiungi o aggiorna la motivazione
                motivazioni_hp["HP1"] = hp1_sommatoria["motivo"]

            # STEP 9: Verifica le sommatorie per HP2
            hp2_sommatoria = self._verifica_hp2_sommatoria(sommatoria_per_frase)
            if hp2_sommatoria["assegnata"]:
                hp_assegnate.add("HP2")
                # Aggiungi o aggiorna la motivazione
                motivazioni_hp["HP2"] = hp2_sommatoria["motivo"]
            
            # Prepara i risultati finali della classificazione
            risultati = {
                "campione": campione,
                "sommatoria_per_frase": sommatoria_per_frase,
                "caratteristiche_pericolo": sorted(list(hp_assegnate)),
                "motivazioni_hp": motivazioni_hp,
                "valori_limite": self.database.valori_limite,
                "valori_cut_off": self.database.valori_cut_off,
                "stato_fisico": self.stato_fisico,
                "punto_infiammabilita": self.punto_infiammabilita,
                "contiene_gasolio": self.contiene_gasolio
            }
            
            return risultati
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Errore nella classificazione: {str(e)}")
            return None
    
    def _verifica_hp3_infiammabilita(self):
        """
        Verifica i criteri di HP3 basati sul punto di infiammabilità
        
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Verifica se abbiamo le informazioni necessarie
        if not self.stato_fisico or self.punto_infiammabilita is None:
            print("Informazioni mancanti per verificare HP3 (stato fisico o punto di infiammabilità)")
            return risultato
        
        # Verifica lo stato fisico
        stati_fisici_liquidi = ["Liquido", "Fangoso palabile", "Fangoso pompabile"]
        
        if self.stato_fisico not in stati_fisici_liquidi:
            print(f"Stato fisico '{self.stato_fisico}' non richiede verifica del punto di infiammabilità")
            return risultato
        
        # Verifica il punto di infiammabilità in base allo stato fisico e alla presenza di gasolio
        if self.stato_fisico == "Liquido":
            if self.contiene_gasolio:
                # Per gasoli, carburanti e oli: punto tra 55 e 75 °C
                if 55 <= self.punto_infiammabilita <= 75:
                    risultato["assegnata"] = True
                    risultato["motivo"] = f"Punto di infiammabilità ({self.punto_infiammabilita} °C) tra 55 e 75 °C per gasolio/carburante/olio [Eseguire metodo di prova]"
                    print(f"HP3 assegnata: {risultato['motivo']}")
            else:
                # Per altri liquidi: punto <= 60 °C
                if self.punto_infiammabilita <= 60:
                    risultato["assegnata"] = True
                    risultato["motivo"] = f"Punto di infiammabilità ({self.punto_infiammabilita} °C) <= 60 °C [Eseguire metodo di prova]"
                    print(f"HP3 assegnata: {risultato['motivo']}")
        elif self.stato_fisico in ["Fangoso palabile", "Fangoso pompabile"]:
            # Per fangosi, verificare punto di infiammabilità ma con logica da definire
            # Per ora utilizziamo la stessa logica del liquido
            if self.contiene_gasolio:
                if 55 <= self.punto_infiammabilita <= 75:
                    risultato["assegnata"] = True
                    risultato["motivo"] = f"Punto di infiammabilità ({self.punto_infiammabilita} °C) tra 55 e 75 °C per gasolio/carburante/olio in stato {self.stato_fisico} [Eseguire metodo di prova]"
                    print(f"HP3 assegnata: {risultato['motivo']}")
            else:
                if self.punto_infiammabilita <= 60:
                    risultato["assegnata"] = True
                    risultato["motivo"] = f"Punto di infiammabilità ({self.punto_infiammabilita} °C) <= 60 °C in stato {self.stato_fisico} [Eseguire metodo di prova]"
                    print(f"HP3 assegnata: {risultato['motivo']}")
        
        return risultato
    
    def _verifica_hp3_sommatoria(self, sommatoria_per_frase):
        """
        Verifica i criteri di HP3 basati sulle sommatorie delle frasi H
        
        Args:
            sommatoria_per_frase (dict): Sommatoria delle concentrazioni per ciascuna frase H
            
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Lista di frasi H rilevanti per HP3
        frasi_hp3 = self.database.hp_mapping["HP3"]
        
        # Verifica se qualsiasi frase H di HP3 ha una sommatoria > 0.1%
        frasi_sopra_limite = []
        for frase_h in frasi_hp3:
            if frase_h in sommatoria_per_frase:
                sommatoria = sommatoria_per_frase[frase_h]
                limite = self.database.valori_limite.get(frase_h, 0.1)  # Default 0.1% se non specificato
                
                if sommatoria >= limite:
                    frasi_sopra_limite.append(f"{frase_h} ({sommatoria:.4f}% >= {limite}%)")
        
        # Se almeno una frase è sopra il limite, assegna HP3
        if frasi_sopra_limite:
            risultato["assegnata"] = True
            risultato["motivo"] = f"Sommatoria frasi H sopra limite: {', '.join(frasi_sopra_limite)} [Eseguire metodo di prova]"
            print(f"HP3 assegnata: {risultato['motivo']}")
        
        return risultato
    
    def _verifica_hp8_ph(self):
        """
        Verifica i criteri di HP8 basati sul pH
        
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Verifica se abbiamo le informazioni sul pH
        if not self.info_raccolta or 'caratteristicheFisiche' not in self.info_raccolta or 'ph' not in self.info_raccolta['caratteristicheFisiche']:
            print("Informazioni mancanti per verificare HP8 (pH)")
            return risultato
        
        # Estrai il valore del pH
        ph_str = self.info_raccolta['caratteristicheFisiche']['ph']
        
        try:
            # Tenta di convertire il pH in float
            ph = float(ph_str.replace(',', '.'))
            
            # Verifica se il pH è estremamente acido o alcalino
            if ph <= 2.0:
                risultato["assegnata"] = True
                risultato["motivo"] = f"pH ≤ 2.0 (valore rilevato: {ph})"
                print(f"HP8 assegnata: {risultato['motivo']}")
                
            elif ph >= 11.5:
                risultato["assegnata"] = True
                risultato["motivo"] = f"pH ≥ 11.5 (valore rilevato: {ph})"
                print(f"HP8 assegnata: {risultato['motivo']}")
        
        except (ValueError, TypeError) as e:
            print(f"Errore nella conversione del pH: {e}")
        
        return risultato
    
    def _verifica_hp8_sommatoria(self, sommatoria_per_frase):
        """
        Verifica i criteri di HP8 basati sulle sommatorie delle frasi H314
        
        Args:
            sommatoria_per_frase (dict): Sommatoria delle concentrazioni per ciascuna frase H
            
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Verifica se la frase H314 ha una sommatoria >= 5%
        if 'H314' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H314']
            limite = self.database.valori_limite.get('H314', 5.0)  # Default 5% se non specificato
            
            if sommatoria >= limite:
                risultato["assegnata"] = True
                risultato["motivo"] = f"Sommatoria sostanze con frase H314 (SkinCorr. 1A/1B/1C) pari a {sommatoria:.4f}% ≥ {limite}%"
                print(f"HP8 assegnata: {risultato['motivo']}")
        
        return risultato
    
    def _verifica_hp4_sommatoria(self, sommatoria_per_frase):
        """
        Verifica i criteri di HP4 basati sulle sommatorie delle frasi H
        
        Args:
            sommatoria_per_frase (dict): Sommatoria delle concentrazioni per ciascuna frase H
                
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Prima verifica se HP8 è già stata assegnata
        # Secondo la regola di precedenza, se HP8 è già assegnata, HP4 non deve essere applicata
        if 'H314' in sommatoria_per_frase:
            sommatoria_h314 = sommatoria_per_frase['H314']
            limite_hp8 = self.database.valori_limite.get('H314', 5.0)
            
            if sommatoria_h314 >= limite_hp8:
                # HP8 è già assegnata, quindi HP4 non si applica
                risultato["motivo"] = "HP4 non assegnata per precedenza di HP8 (H314 ≥ 5%)"
                print(risultato["motivo"])
                return risultato
        
        # Inizializzazione delle sommatorie per i diversi gruppi di frasi H
        sommatoria_h314_hp4 = 0
        sommatoria_h318 = 0
        sommatoria_h315_h319 = 0
        
        # Calcolo sommatoria H314 per HP4 (solo se >= cut-off)
        if 'H314' in sommatoria_per_frase:
            sommatoria_h314_hp4 = sommatoria_per_frase['H314']
        
        # Calcolo sommatoria H318
        if 'H318' in sommatoria_per_frase:
            sommatoria_h318 = sommatoria_per_frase['H318']
        
        # Calcolo sommatoria H315 e/o H319
        # Nota: una sostanza potrebbe avere sia H315 che H319, ma non vogliamo contarla due volte
        # Questo è gestito a livello di popolamento di sommatoria_per_frase
        if 'H315' in sommatoria_per_frase:
            sommatoria_h315_h319 += sommatoria_per_frase['H315']
        
        if 'H319' in sommatoria_per_frase:
            sommatoria_h315_h319 += sommatoria_per_frase['H319']
        
        # Per tenere traccia di tutte le condizioni che portano ad assegnare HP4
        condizioni_soddisfatte = []
        
        # Verifica condizione 1: H314 >= 1% e < 5%
        limite_h314_hp4_min = self.database.valori_limite.get('H314_HP4_MIN', 1.0)
        limite_h314_hp4_max = self.database.valori_limite.get('H314_HP4_MAX', 5.0)
        
        if sommatoria_h314_hp4 >= limite_h314_hp4_min and sommatoria_h314_hp4 < limite_h314_hp4_max:
            condizioni_soddisfatte.append(f"Somma H314 = {sommatoria_h314_hp4:.4f}% ≥ {limite_h314_hp4_min}% e < {limite_h314_hp4_max}%")
        
        # Verifica condizione 2: H318 >= 10%
        limite_h318 = self.database.valori_limite.get('H318', 10.0)
        if sommatoria_h318 >= limite_h318:
            condizioni_soddisfatte.append(f"Somma H318 = {sommatoria_h318:.4f}% ≥ {limite_h318}%")
        
        # Verifica condizione 3: H315/H319 >= 20%
        limite_h315_h319 = self.database.valori_limite.get('H315_H319', 20.0)
        if sommatoria_h315_h319 >= limite_h315_h319:
            condizioni_soddisfatte.append(f"Somma H315 e/o H319 = {sommatoria_h315_h319:.4f}% ≥ {limite_h315_h319}%")
        
        # Se almeno una condizione è soddisfatta, assegna HP4
        if condizioni_soddisfatte:
            risultato["assegnata"] = True
            risultato["motivo"] = f"HP4 assegnata per: {'; '.join(condizioni_soddisfatte)}"
            print(f"HP4 assegnata: {risultato['motivo']}")
        
        return risultato

    def _verifica_hp5_sommatoria(self, sommatoria_per_frase):
        """
        Verifica i criteri di HP5 basati sulle sommatorie delle frasi H
        
        Args:
            sommatoria_per_frase (dict): Sommatoria delle concentrazioni per ciascuna frase H
            
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Verifica STOT SE 1 (H370)
        hp5_conditions = []
        if 'H370' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H370']
            limite = self.database.valori_limite.get('H370', 1.0)
            if sommatoria >= limite:
                hp5_conditions.append(f"STOT SE 1 (H370) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Verifica STOT SE 2 (H371)
        if 'H371' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H371']
            limite = self.database.valori_limite.get('H371', 10.0)
            if sommatoria >= limite:
                hp5_conditions.append(f"STOT SE 2 (H371) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Verifica STOT SE 3 (H335)
        if 'H335' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H335']
            limite = self.database.valori_limite.get('H335', 20.0)
            if sommatoria >= limite:
                hp5_conditions.append(f"STOT SE 3 (H335) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Verifica STOT RE 1 (H372)
        if 'H372' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H372']
            limite = self.database.valori_limite.get('H372', 1.0)
            if sommatoria >= limite:
                hp5_conditions.append(f"STOT RE 1 (H372) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Verifica STOT RE 2 (H373)
        if 'H373' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H373']
            limite = self.database.valori_limite.get('H373', 10.0)
            if sommatoria >= limite:
                hp5_conditions.append(f"STOT RE 2 (H373) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Verifica Asp. Tox. 1 (H304)
        if 'H304' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H304']
            limite = self.database.valori_limite.get('H304', 10.0)
            if sommatoria >= limite:
                hp5_conditions.append(f"Asp. Tox. 1 (H304) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Se almeno una condizione è soddisfatta, assegna HP5
        if hp5_conditions:
            risultato["assegnata"] = True
            risultato["motivo"] = f"HP5 assegnata per: {'; '.join(hp5_conditions)}"
            print(f"HP5 assegnata: {risultato['motivo']}")
        
        return risultato

    def _verifica_hp6_sommatoria(self, sommatoria_per_frase):
        """
        Verifica i criteri di HP6 (Tossicità acuta) basati sulle sommatorie delle frasi H
        
        Args:
            sommatoria_per_frase (dict): Sommatoria delle concentrazioni per ciascuna frase H
                
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Per tenere traccia delle condizioni soddisfatte per HP6
        condizioni_soddisfatte = []
        
        # Verifica per esposizione orale (H300, H301, H302)
        if 'H300' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H300']
            limite_cat1 = self.database.valori_limite.get('H300_1', 0.1)
            limite_cat2 = self.database.valori_limite.get('H300_2', 0.25)
            
            # Verifichiamo prima con il limite più conservativo (categoria 1)
            if sommatoria >= limite_cat1:
                condizioni_soddisfatte.append(f"Somma H300 (Acute Tox. 1) = {sommatoria:.4f}% ≥ {limite_cat1}%")
            # Altrimenti verifichiamo con il limite di categoria 2
            elif sommatoria >= limite_cat2:
                condizioni_soddisfatte.append(f"Somma H300 (Acute Tox. 2) = {sommatoria:.4f}% ≥ {limite_cat2}%")
        
        if 'H301' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H301']
            limite = self.database.valori_limite.get('H301', 5.0)
            
            if sommatoria >= limite:
                condizioni_soddisfatte.append(f"Somma H301 (Acute Tox. 3) = {sommatoria:.4f}% ≥ {limite}%")
        
        if 'H302' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H302']
            limite = self.database.valori_limite.get('H302', 25.0)
            
            if sommatoria >= limite:
                condizioni_soddisfatte.append(f"Somma H302 (Acute Tox. 4) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Verifica per esposizione cutanea (H310, H311, H312)
        if 'H310' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H310']
            limite_cat1 = self.database.valori_limite.get('H310_1', 0.25)
            limite_cat2 = self.database.valori_limite.get('H310_2', 2.5)
            
            # Verifichiamo prima con il limite più conservativo (categoria 1)
            if sommatoria >= limite_cat1:
                condizioni_soddisfatte.append(f"Somma H310 (Acute Tox. 1) = {sommatoria:.4f}% ≥ {limite_cat1}%")
            # Altrimenti verifichiamo con il limite di categoria 2
            elif sommatoria >= limite_cat2:
                condizioni_soddisfatte.append(f"Somma H310 (Acute Tox. 2) = {sommatoria:.4f}% ≥ {limite_cat2}%")
        
        if 'H311' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H311']
            limite = self.database.valori_limite.get('H311', 15.0)
            
            if sommatoria >= limite:
                condizioni_soddisfatte.append(f"Somma H311 (Acute Tox. 3) = {sommatoria:.4f}% ≥ {limite}%")
        
        if 'H312' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H312']
            limite = self.database.valori_limite.get('H312', 55.0)
            
            if sommatoria >= limite:
                condizioni_soddisfatte.append(f"Somma H312 (Acute Tox. 4) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Verifica per esposizione per inalazione (H330, H331, H332)
        if 'H330' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H330']
            limite_cat1 = self.database.valori_limite.get('H330_1', 0.1)
            limite_cat2 = self.database.valori_limite.get('H330_2', 0.5)
            
            # Verifichiamo prima con il limite più conservativo (categoria 1)
            if sommatoria >= limite_cat1:
                condizioni_soddisfatte.append(f"Somma H330 (Acute Tox. 1) = {sommatoria:.4f}% ≥ {limite_cat1}%")
            # Altrimenti verifichiamo con il limite di categoria 2
            elif sommatoria >= limite_cat2:
                condizioni_soddisfatte.append(f"Somma H330 (Acute Tox. 2) = {sommatoria:.4f}% ≥ {limite_cat2}%")
        
        if 'H331' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H331']
            limite = self.database.valori_limite.get('H331', 3.5)
            
            if sommatoria >= limite:
                condizioni_soddisfatte.append(f"Somma H331 (Acute Tox. 3) = {sommatoria:.4f}% ≥ {limite}%")
        
        if 'H332' in sommatoria_per_frase:
            sommatoria = sommatoria_per_frase['H332']
            limite = self.database.valori_limite.get('H332', 22.5)
            
            if sommatoria >= limite:
                condizioni_soddisfatte.append(f"Somma H332 (Acute Tox. 4) = {sommatoria:.4f}% ≥ {limite}%")
        
        # Se almeno una condizione è soddisfatta, assegna HP6
        if condizioni_soddisfatte:
            risultato["assegnata"] = True
            risultato["motivo"] = f"HP6 assegnata per: {'; '.join(condizioni_soddisfatte)}"
            print(f"HP6 assegnata: {risultato['motivo']}")
        
        return risultato
    

    def _verifica_hp1_sommatoria(self, sommatoria_per_frase):
        """
        Verifica i criteri di HP1 basati sulle sommatorie delle frasi H
        
        Args:
            sommatoria_per_frase (dict): Sommatoria delle concentrazioni per ciascuna frase H
            
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Lista di frasi H rilevanti per HP1
        frasi_hp1 = self.database.hp_mapping["HP1"]
        
        # Verifica se qualsiasi frase H di HP1 ha una sommatoria > 0.1%
        frasi_sopra_limite = []
        for frase_h in frasi_hp1:
            if frase_h in sommatoria_per_frase:
                sommatoria = sommatoria_per_frase[frase_h]
                limite = self.database.valori_limite.get(frase_h, 0.1)  # Default 0.1% se non specificato
                
                if sommatoria >= limite:
                    frasi_sopra_limite.append(f"{frase_h} ({sommatoria:.4f}% >= {limite}%)")
        
        # Se almeno una frase è sopra il limite, assegna HP1
        if frasi_sopra_limite:
            risultato["assegnata"] = True
            risultato["motivo"] = f"Sommatoria frasi H sopra limite: {', '.join(frasi_sopra_limite)} [Eseguire metodo di prova]"
            print(f"HP1 assegnata: {risultato['motivo']}")
        
        return risultato
    

    def _verifica_hp2_sommatoria(self, sommatoria_per_frase):
        """
        Verifica i criteri di HP2 basati sulle sommatorie delle frasi H
        
        Args:
            sommatoria_per_frase (dict): Sommatoria delle concentrazioni per ciascuna frase H
            
        Returns:
            dict: Dizionario con il risultato della verifica
        """
        risultato = {
            "assegnata": False,
            "motivo": ""
        }
        
        # Lista di frasi H rilevanti per HP2
        frasi_hp2 = self.database.hp_mapping["HP2"]
        
        # Verifica se qualsiasi frase H di HP2 ha una sommatoria > 0.1%
        frasi_sopra_limite = []
        for frase_h in frasi_hp2:
            if frase_h in sommatoria_per_frase:
                sommatoria = sommatoria_per_frase[frase_h]
                limite = self.database.valori_limite.get(frase_h, 0.1)  # Default 0.1% se non specificato
                
                if sommatoria >= limite:
                    frasi_sopra_limite.append(f"{frase_h} ({sommatoria:.4f}% >= {limite}%)")
        
        # Se almeno una frase è sopra il limite, assegna HP2
        if frasi_sopra_limite:
            risultato["assegnata"] = True
            risultato["motivo"] = f"Sommatoria frasi H sopra limite: {', '.join(frasi_sopra_limite)} [Eseguire metodo di prova]"
            print(f"HP2 assegnata: {risultato['motivo']}")
        
        return risultato










#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################



#------------- FINE CLASSE CLASSIFICATORE RIFIUTI -------------#



#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################
#########################################################################################################







def salva_risultati(risultati, nome_file="risultati_classificazione.json"):
    """
    Salva i risultati della classificazione in un file JSON
    
    Args:
        risultati (dict): Risultati della classificazione
        nome_file (str): Nome del file di output
        
    Returns:
        bool: True se il salvataggio ha avuto successo, False altrimenti
    """
    try:
        if not risultati:
            print("Nessun risultato da salvare.")
            return False
        
        # Percorso del file
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(script_dir, "data")
        
        # Assicurati che la cartella esista
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        
        file_path = os.path.join(data_dir, nome_file)
        
        # Salva i risultati come JSON
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(risultati, f, ensure_ascii=False, indent=2)
        
        print(f"Risultati salvati in {file_path}")
        return True
    except Exception as e:
        print(f"Errore nel salvataggio dei risultati: {e}")
        return False


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
        
        # Salva i risultati per uso futuro
        salva_risultati(risultati, "risultati_classificazione.json")
        
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
        import traceback
        traceback.print_exc()
        return json.dumps({
            "success": False, 
            "message": f"Errore durante la classificazione: {str(e)}"
        })


# Funzioni di supporto per esportazione dei risultati
def esporta_risultati_excel(risultati, file_path):
    """
    Esporta i risultati in formato Excel
    
    Args:
        risultati (dict): Risultati della classificazione
        file_path (str): Percorso del file Excel da creare
        
    Returns:
        bool: True se l'esportazione ha avuto successo, False altrimenti
    """
    try:
        import pandas as pd
        
        # Crea DataFrame per le sostanze
        sostanze_data = []
        for nome_sostanza, info in risultati["campione"].items():
            sostanze_data.append({
                "Sostanza": nome_sostanza,
                "Concentrazione (ppm)": info["concentrazione_ppm"],
                "Concentrazione (%)": info["concentrazione_percentuale"],
                "Frasi H": ", ".join(info.get("frasi_h", [])),
                "Caratteristiche HP": ", ".join(info.get("caratteristiche_pericolo", []))
            })
        
        sostanze_df = pd.DataFrame(sostanze_data)
        
        # Crea DataFrame per le sommatorie
        sommatorie_data = []
        for frase_h, valore in risultati["sommatoria_per_frase"].items():
            if valore > 0:  # Mostra solo valori > 0
                limite = risultati["valori_limite"].get(frase_h, "N/A")
                sommatorie_data.append({
                    "Frase H": frase_h,
                    "Concentrazione Totale (%)": valore,
                    "Valore Limite (%)": limite,
                    "Superamento Limite": "Sì" if limite != "N/A" and valore >= limite else "No"
                })
        
        sommatorie_df = pd.DataFrame(sommatorie_data)
        
        # Crea DataFrame per il risultato finale
        hp_data = []
        for hp in risultati["caratteristiche_pericolo"]:
            motivazione = risultati.get("motivazioni_hp", {}).get(hp, "")
            hp_data.append({
                "Caratteristica di Pericolo": hp,
                "Descrizione": _get_hp_description(hp),
                "Motivazione": motivazione
            })
        
        hp_df = pd.DataFrame(hp_data)
        
        # Crea DataFrame per informazioni sul punto di infiammabilità
        info_data = []
        info_data.append({
            "Stato Fisico": risultati.get("stato_fisico", "N/A"),
            "Punto Infiammabilità (°C)": risultati.get("punto_infiammabilita", "N/A"),
            "Contiene Gasolio/Carburanti/Oli": "Sì" if risultati.get("contiene_gasolio", False) else "No"
        })
        
        info_df = pd.DataFrame(info_data)
        
        # Scrivi i DataFrame in un file Excel con fogli separati
        with pd.ExcelWriter(file_path) as writer:
            hp_df.to_excel(writer, sheet_name="Caratteristiche di Pericolo", index=False)
            info_df.to_excel(writer, sheet_name="Informazioni Fisiche", index=False)
            sostanze_df.to_excel(writer, sheet_name="Sostanze", index=False)
            sommatorie_df.to_excel(writer, sheet_name="Sommatorie", index=False)
        
        print(f"Risultati esportati in Excel: {file_path}")
        return True
    
    except Exception as e:
        print(f"Errore nell'esportazione in Excel: {e}")
        return False


def _get_hp_description(hp):
    """
    Restituisce la descrizione di una caratteristica di pericolo HP
    
    Args:
        hp (str): Codice della caratteristica di pericolo (es. "HP4")
        
    Returns:
        str: Descrizione della caratteristica di pericolo
    """
    descrizioni = {
        "HP1": "Esplosivo",
        "HP2": "Comburente",
        "HP3": "Infiammabile",
        "HP4": "Irritante - Irritazione cutanea e lesioni oculari",
        "HP5": "Tossicità specifica per organi bersaglio (STOT)/Tossicità in caso di aspirazione",
        "HP6": "Tossicità acuta",
        "HP7": "Cancerogeno",
        "HP8": "Corrosivo",
        "HP9": "Infettivo",
        "HP10": "Tossico per la riproduzione",
        "HP11": "Mutageno",
        "HP12": "Liberazione di gas a tossicità acuta",
        "HP13": "Sensibilizzante",
        "HP14": "Ecotossico",
        "HP15": "Rifiuto che non possiede direttamente una delle caratteristiche di pericolo summenzionate ma può manifestarla successivamente"
    }
    
    return descrizioni.get(hp, "Descrizione non disponibile")


# Avvia il programma se eseguito direttamente
if __name__ == "__main__":
    # Stampa il risultato JSON
    print(main())