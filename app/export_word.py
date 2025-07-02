#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from datetime import datetime
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.shared import OxmlElement, qn
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

def add_table_border(table):
    """Aggiunge bordi alla tabella"""
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

def create_word_report(report_data, file_path):
    """Crea il documento Word con i dati del report"""
    
    # Crea nuovo documento
    doc = Document()
    
    # Estrai dati
    risultati = report_data.get('risultati_classificazione', [])
    metadata = report_data.get('_metadata', {})
    
    # Informazioni base
    committente = metadata.get('committente', 'Non specificato')
    codice_eer = metadata.get('infoCertificato', {}).get('codiceEER') or metadata.get('codiceEER', 'N/A')
    numero_campionamento = metadata.get('infoCertificato', {}).get('numeroCampionamento') or metadata.get('numeroCampionamento', 'N/A')
    data_generazione = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    
    # === HEADER DEL DOCUMENTO ===
    
    # Titolo principale
    title = doc.add_heading('Report di Classificazione Rifiuti', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Sottotitolo con data
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run(f'Generato il {data_generazione}')
    run.font.size = Pt(12)
    run.italic = True
    
    # Spazio
    doc.add_paragraph()
    
    # === INFORMAZIONI GENERALI ===
    
    doc.add_heading('Informazioni Generali', level=1)
    
    # Tabella informazioni
    info_table = doc.add_table(rows=0, cols=2)
    info_table.style = 'Table Grid'
    
    # Dati informativi
    info_data = [
        ('Committente', committente),
        ('Codice EER', codice_eer),
        ('Data Generazione', data_generazione),
        ('Numero Record', str(len(risultati)))
    ]
    
    if numero_campionamento != 'N/A':
        info_data.insert(2, ('N° Campionamento', numero_campionamento))
    
    for label, value in info_data:
        row = info_table.add_row()
        row.cells[0].text = label
        row.cells[1].text = value
        
        # Formatta prima colonna (etichette)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.size = Pt(11)
        
        # Formatta seconda colonna (valori)
        row.cells[1].paragraphs[0].runs[0].font.size = Pt(11)
    
    # Applica bordi alla tabella info
    add_table_border(info_table)
    
    # Spazio
    doc.add_paragraph()
    
    # === DATI DI CLASSIFICAZIONE ===
    
    if risultati:
        doc.add_heading('Risultati di Classificazione', level=1)
        
        # Ottieni headers dai dati
        headers = list(risultati[0].keys()) if risultati else []
        
        if headers:
            # Crea tabella principale
            main_table = doc.add_table(rows=1, cols=len(headers))
            main_table.style = 'Table Grid'
            main_table.autofit = False
            
            # Imposta larghezza colonne
            for i, col in enumerate(main_table.columns):
                col.width = Inches(1.2)
            
            # Headers
            header_cells = main_table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header
                # Formatta header
                for paragraph in header_cells[i].paragraphs:
                    for run in paragraph.runs:
                        run.font.bold = True
                        run.font.size = Pt(10)
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                
                # Colore di sfondo header
                shading_elm = parse_xml(r'<w:shd {} w:fill="2E7D32"/>'.format(nsdecls('w')))
                header_cells[i]._tc.get_or_add_tcPr().append(shading_elm)
            
            # Dati
            for row_data in risultati:
                row = main_table.add_row()
                for i, header in enumerate(headers):
                    cell_value = str(row_data.get(header, ''))
                    
                    # Formattazione speciale per concentrazioni
                    if 'concentrazione' in header.lower() and cell_value.replace('.', '').isdigit():
                        try:
                            cell_value = f"{float(cell_value):.3f}"
                        except:
                            pass
                    
                    # Tronca testo lungo
                    if len(cell_value) > 50:
                        cell_value = cell_value[:50] + '...'
                    
                    row.cells[i].text = cell_value
                    
                    # Formatta celle dati
                    for paragraph in row.cells[i].paragraphs:
                        for run in paragraph.runs:
                            run.font.size = Pt(9)
            
            # Applica bordi alla tabella principale
            add_table_border(main_table)
        
        # Riepilogo
        doc.add_paragraph()
        summary = doc.add_paragraph()
        summary.add_run('Riepilogo: ').font.bold = True
        summary.add_run(f'Il report contiene {len(risultati)} sostanze classificate.')
        
    else:
        doc.add_heading('Nessun Dato Disponibile', level=1)
        doc.add_paragraph('Il report non contiene dati di classificazione.')
    
    # === FOOTER ===
    
    doc.add_page_break()
    
    # Informazioni tecniche
    doc.add_heading('Informazioni Tecniche', level=1)
    
    tech_info = doc.add_paragraph()
    tech_info.add_run('Documento generato automaticamente dal sistema di classificazione rifiuti.\n')
    tech_info.add_run(f'Data e ora di generazione: {data_generazione}\n')
    tech_info.add_run('Per maggiori informazioni contattare il responsabile del sistema.')
    
    # Salva il documento
    doc.save(file_path)
    
    return True

def main():
    """Funzione principale"""
    try:
        # Leggi dati da stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        report_data = data['reportData']
        file_path = data['filePath']
        
        # Crea il report
        success = create_word_report(report_data, file_path)
        
        if success:
            print("SUCCESS: Report Word creato con successo")
        else:
            print("ERROR: Errore nella creazione del report")
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()