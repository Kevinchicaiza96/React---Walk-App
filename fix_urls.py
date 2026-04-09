with open('walkApp/routes/urls.py', encoding='utf-8') as f:
    lines = f.readlines()

fixed = [l for l in lines if 'api_comentarios_ruta' not in l]

with open('walkApp/routes/urls.py', 'w', encoding='utf-8') as f:
    f.writelines(fixed)

print('Listo')
