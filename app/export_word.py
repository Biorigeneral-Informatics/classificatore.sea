#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
import os
from datetime import datetime

# Logging per debug
def debug_log(message):
    print(f"DEBUG: {message}", file=sys.stderr)

debug_log("Script Python avviato")

try:
    from docx import Document
    from docx.shared import Inches, Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.shared import OxmlElement, qn
    from docx.oxml.ns import nsdecls
    from docx.oxml import parse_xml
    debug_log("Importazioni docx completate")
except ImportError as e:
    debug_log(f"Errore importazione docx: {e}")
    print(f"ERROR: python-docx non installato: {e}")
    sys.exit(1)

def add_table_border(table):
    """Aggiunge bordi alla tabella"""
    try:
        tbl = table._tbl
        tblPr = tbl.tblPr
        
        # Crea elemento bordi
        tblBorders = OxmlElement('w:tblBorders')
        
        # Definisci i bordi
        borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        for border in borders:
            border_el = OxmlElement(f'w:{border}')
            border_el.set(qn('w:val'), 'single')
            border_el.set(qn('w:sz'), '4')
            border_el.set(qn('w:color'), '000000')
            tblBorders.append(border_el)
        
        tblPr.append(tblBorders)
        debug_log("Bordi tabella aggiunti")
    except Exception as e:
        debug_log(f"Errore aggiunta bordi: {e}")

def create_word_report(report_data, file_path):
    """Crea il documento Word con i dati del report"""
    
    try:
        debug_log(f"Inizio creazione documento Word: {file_path}")
        debug_log(f"Tipo report_data: {type(report_data)}")
        
        # Verifica cartella di destinazione
        dest_dir = os.path.dirname(file_path)
        if not os.path.exists(dest_dir):
            debug_log(f"Creazione cartella: {dest_dir}")
            os.makedirs(dest_dir, exist_ok=True)
        
        # Crea nuovo documento
        doc = Document()
        debug_log("Documento Word creato")
        
        # FIX: Gestisci sia dizionari che liste
        if isinstance(report_data, dict):
            # Formato atteso: {'risultati_classificazione': [...], '_metadata': {...}}
            risultati = report_data.get('risultati_classificazione', [])
            metadata = report_data.get('_metadata', {})
            debug_log(f"Formato dizionario - Risultati: {len(risultati)}, Metadata: {list(metadata.keys())}")
        elif isinstance(report_data, list):
            # Formato diretto: [...]
            risultati = report_data
            metadata = {}
            debug_log(f"Formato lista - Risultati: {len(risultati)}")
        else:
            # Formato sconosciuto
            debug_log(f"Formato sconosciuto: {type(report_data)}")
            risultati = []
            metadata = {}
        
        # Informazioni base con fallback sicuri
        committente = metadata.get('committente', 'Non specificato')
        codice_eer = 'N/A'
        numero_campionamento = 'N/A'
        
        # Prova a estrarre info dai metadata con diversi formati
        if isinstance(metadata.get('infoCertificato'), dict):
            codice_eer = metadata['infoCertificato'].get('codiceEER', 'N/A')
            numero_campionamento = metadata['infoCertificato'].get('numeroCampionamento', 'N/A')
        else:
            codice_eer = metadata.get('codiceEER', 'N/A')
            numero_campionamento = metadata.get('numeroCampionamento', 'N/A')
        
        data_generazione = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        
        debug_log(f"Info estratte - Committente: {committente}, EER: {codice_eer}, Campionamento: {numero_campionamento}")
        
        # === HEADER DEL DOCUMENTO ===
        doc.add_heading('Report Classificazione Rifiuti', level=0)
        
        # Informazioni generali
        info_table = doc.add_table(rows=4, cols=2)
        info_table.style = 'Table Grid'
        add_table_border(info_table)
        
        info_cells = [
            ('Committente:', committente),
            ('Codice EER:', codice_eer),
            ('Numero Campionamento:', numero_campionamento),
            ('Data Generazione:', data_generazione)
        ]
        
        for i, (label, value) in enumerate(info_cells):
            info_table.cell(i, 0).text = label
            info_table.cell(i, 1).text = str(value)
        
        debug_log("Header documento completato")
        
        # === DATI CLASSIFICAZIONE ===
        if risultati and len(risultati) > 0:
            doc.add_heading('Risultati Classificazione', level=1)
            
            # Verifica che risultati sia una lista di dizionari
            if isinstance(risultati[0], dict):
                headers = list(risultati[0].keys())
                debug_log(f"Headers trovati: {headers}")
                
                table = doc.add_table(rows=1, cols=len(headers))
                table.style = 'Table Grid'
                add_table_border(table)
                
                # Aggiungi header
                header_cells = table.rows[0].cells
                for i, header in enumerate(headers):
                    header_cells[i].text = str(header)
                
                # Aggiungi dati
                for result in risultati:
                    row_cells = table.add_row().cells
                    for i, header in enumerate(headers):
                        value = result.get(header, '') if isinstance(result, dict) else str(result)
                        row_cells[i].text = str(value) if value is not None else ''
                
                debug_log(f"Tabella dati creata: {len(risultati)} righe, {len(headers)} colonne")
            else:
                # Risultati non sono dizionari, mostra come lista semplice
                debug_log("Risultati non sono dizionari, creazione lista semplice")
                
                for i, item in enumerate(risultati):
                    doc.add_paragraph(f"{i+1}. {str(item)}")
        else:
            doc.add_heading('Nessun Dato Disponibile', level=1)
            doc.add_paragraph('Il report non contiene dati di classificazione.')
            debug_log("Nessun dato disponibile")
        
        # === FOOTER ===
        doc.add_page_break()
        
        # Informazioni tecniche
        doc.add_heading('Informazioni Tecniche', level=1)
        
        tech_info = doc.add_paragraph()
        tech_info.add_run('Documento generato automaticamente dal sistema di classificazione rifiuti.\n')
        tech_info.add_run(f'Data e ora di generazione: {data_generazione}\n')
        tech_info.add_run('Per maggiori informazioni contattare il responsabile del sistema.')
        
        debug_log("Footer completato")
        
        # Salva il documento
        debug_log(f"Salvataggio documento: {file_path}")
        doc.save(file_path)
        
        # Verifica che il file sia stato creato
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            debug_log(f"File creato con successo, dimensione: {file_size} bytes")
            return True
        else:
            debug_log("ERRORE: File non creato")
            return False
        
    except Exception as e:
        debug_log(f"Errore durante creazione documento: {e}")
        import traceback
        debug_log(f"Traceback: {traceback.format_exc()}")
        return False

def main():
    """Funzione principale"""
    try:
        debug_log("Inizio main()")
        
        # Leggi dati da stdin
        debug_log("Lettura dati da stdin...")
        input_data = sys.stdin.read()
        debug_log(f"Dati ricevuti: {len(input_data)} caratteri")
        
        if not input_data.strip():
            debug_log("ERRORE: Nessun dato ricevuto da stdin")
            print("ERROR: Nessun dato ricevuto")
            sys.exit(1)
        
        debug_log("Parsing JSON...")
        data = json.loads(input_data)
        
        report_data = data['reportData']
        file_path = data['filePath']
        
        debug_log(f"Report data keys: {list(report_data.keys()) if isinstance(report_data, dict) else 'Not a dict'}")
        debug_log(f"File path: {file_path}")
        
        # Crea il report
        debug_log("Avvio creazione report...")
        success = create_word_report(report_data, file_path)
        
        if success:
            print("SUCCESS: Report Word creato con successo")
            debug_log("SUCCESS: Report completato")
        else:
            print("ERROR: Errore nella creazione del report")
            debug_log("ERROR: Creazione fallita")
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        debug_log(f"Errore JSON: {e}")
        print(f"ERROR: Errore parsing JSON: {e}")
        sys.exit(1)
    except KeyError as e:
        debug_log(f"Errore chiave mancante: {e}")
        print(f"ERROR: Chiave mancante nei dati: {e}")
        sys.exit(1)
    except Exception as e:
        debug_log(f"Errore generale: {e}")
        import traceback
        debug_log(f"Traceback completo: {traceback.format_exc()}")
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()