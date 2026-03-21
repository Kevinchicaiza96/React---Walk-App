from django.shortcuts import render

def mostrarComunidad(request):
    return render(request, 'comunidad.html')
