import os
import subprocess
import shutil

# Lista degli script Python da compilare
scripts = [
    'app/raccolta.py',
    'app/calcola_metalli.py',
    'app/echa/convert_echa.py',
    'app/echa/aggiornamento_echa.py',
    'app/classificatore.py'
    # Aggiungi altri script se necessario
]

# Directory di output
output_dir = 'python_binaries'

# Crea la directory se non esiste
if os.path.exists(output_dir):
    shutil.rmtree(output_dir)
os.makedirs(output_dir)

# Compila ogni script
for script in scripts:
    script_name = os.path.basename(script).replace('.py', '')
    print(f"Compilando {script}...")
    
    subprocess.run([
        'pyinstaller',
        '--onefile',
        '--distpath', output_dir,
        '--workpath', 'build_temp',
        '--specpath', 'build_temp',
        '--name', script_name,
        script
    ])

print("Compilazione completata!")