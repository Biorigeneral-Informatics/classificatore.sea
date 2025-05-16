#!/usr/bin/env python3
import sys
import json
import sqlite3
import os

def calcola_concentrazioni_aggiustate(metalli_campione, selezioni_sali):
    """
    Calcola le concentrazioni aggiustate in base ai sali selezionati
    
    Args:
        metalli_campione (dict): Dizionario con i metalli e le loro concentrazioni
        selezioni_sali (dict): Dizionario con le selezioni sale-metallo
        
    Returns:
        dict: Dizionario con le concentrazioni aggiustate
    """
    risultati = {}
    
    try:
        # Connessione al database per ottenere i fattori di conversione
        script_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(script_dir, "DB", "database_app.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Per ogni metallo nel campione
        for metallo_nome, metallo_dati in metalli_campione.items():
            # Ottieni il sale selezionato per questo metallo
            if metallo_nome in selezioni_sali:
                sale_id = selezioni_sali[metallo_nome]
                
                # Ottieni il fattore di conversione dal database
                cursor.execute("SELECT Fattore, Sali FROM sali WHERE ID = ?", (sale_id,))
                result = cursor.fetchone()
                
                if result and result[0] is not None:  # Verifica che il fattore non sia None
                    fattore = float(result[0])  # Converte esplicitamente in float
                    nome_sale = result[1]
                    
                    # Calcola la concentrazione aggiustata
                    concentrazione_ppm = metallo_dati["concentrazione_ppm"]
                    concentrazione_aggiustata = concentrazione_ppm * fattore
                    
                    # Memorizza il risultato
                    risultati[metallo_nome] = {
                        "concentrazione_ppm": concentrazione_aggiustata,
                        "concentrazione_percentuale": concentrazione_aggiustata / 10000,
                        "fattore_conversione": fattore,
                        "sale_id": sale_id,
                        "sale_nome": nome_sale
                    }
        
        conn.close()
    except Exception as e:
        # Usa print per l'errore e poi invia JSON valido
        import traceback
        traceback.print_exc()
        print(f"Errore nel calcolo delle concentrazioni: {str(e)}", file=sys.stderr)
    
    return risultati

def main():
    """
    Funzione principale chiamata quando lo script viene eseguito direttamente
    """
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "message": "Argomenti insufficienti"}))
        return
        
    try:
        # Leggi i dati JSON dagli argomenti
        metalli_campione_json = sys.argv[1]
        selezioni_sali_json = sys.argv[2]
        
        # Converti le stringhe JSON in dizionari Python
        metalli_campione = json.loads(metalli_campione_json)
        selezioni_sali = json.loads(selezioni_sali_json)
        
        # Calcola le concentrazioni aggiustate
        risultati = calcola_concentrazioni_aggiustate(metalli_campione, selezioni_sali)
        
        # Restituisci i risultati come JSON
        print(json.dumps({
            "success": True,
            "message": "Calcolo completato con successo",
            "data": risultati
        }))
    except Exception as e:
        print(json.dumps({
            "success": False, 
            "message": f"Errore: {str(e)}"
        }))

if __name__ == "__main__":
    main()