with open('games/models.py', 'rb') as f:
    raw = f.read()

# Intentar fix doble latin-1
try:
    content = raw.decode('utf-8')
    if 'Ã' in content:
        fixed = content.encode('latin-1').decode('utf-8')
        with open('games/models.py', 'w', encoding='utf-8') as f:
            f.write(fixed)
        print('Fix aplicado')
    else:
        print('Ya está limpio')
except Exception as e:
    print('Error:', e)
