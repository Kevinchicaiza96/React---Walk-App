with open('ranking/views.py', encoding='utf-8') as f:
    content = f.read()

fixed = content.replace("'Puntos_mensuales': 0", "'puntos_mensuales': 0")

with open('ranking/views.py', 'w', encoding='utf-8') as f:
    f.write(fixed)

print(content.count("'Puntos_mensuales': 0"), 'ocurrencias corregidas')
