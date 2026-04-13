from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
import json
from .models import EstadisticasUsuarioTrivia, HistorialJuegoTrivia, HistorialMapaRoto


""" ==========| SITIO DE LOS JUEGOS |=========="""

def mostrarJuegos(request):
    return render(request, 'Juegos-Principal/juegos.html')


""" ==========| JUEGO MAPA ROTO |=========="""

def mostrarMapaRoto(request):
    return render(request, 'mapa_roto/mapa_roto.html')


""" ==========| JUEGO TRIVIA POPAYAN |=========="""

def trivia_inicio(request):
    context = {}
    if request.user.is_authenticated:
        context['usuario_nombre'] = request.user.username
    return render(request, 'trivia_popayan/index.html', context)


def trivia_menu(request):
    context = {}
    if request.user.is_authenticated:
        context['usuario_nombre'] = request.user.username
        try:
            estadisticas = EstadisticasUsuarioTrivia.objects.get(usuario=request.user)
            context['total_puntos'] = estadisticas.total_puntos
        except EstadisticasUsuarioTrivia.DoesNotExist:
            context['total_puntos'] = 0
    else:
        context['usuario_nombre'] = 'Invitado'
        context['total_puntos'] = 0
    return render(request, 'trivia_popayan/menu.html', context)


def trivia_juego(request):
    categoria = request.GET.get('categoria', 'rutas')
    context = {'categoria': categoria}
    if request.user.is_authenticated:
        context['usuario_nombre'] = request.user.username
    return render(request, 'trivia_popayan/juego.html', context)


def trivia_final(request):
    return render(request, 'trivia_popayan/final.html')


@require_http_methods(["POST"])
def guardar_resultado(request):
    try:
        data = json.loads(request.body)
        categoria = data.get('categoria')
        puntos = int(data.get('puntos', 0))
        respuestas_correctas = int(data.get('respuestas_correctas', 0))
        respuestas_incorrectas = int(data.get('respuestas_incorrectas', 0))
        duracion_segundos = data.get('duracion_segundos')

        if not categoria or categoria not in dict(HistorialJuegoTrivia.CATEGORIAS_CHOICES):
            return JsonResponse({'success': False, 'error': 'Categoría inválida'}, status=400)

        if request.user.is_authenticated:
            juego = HistorialJuegoTrivia.objects.create(
                usuario=request.user,
                categoria=categoria,
                puntos=puntos,
                respuestas_correctas=respuestas_correctas,
                respuestas_incorrectas=respuestas_incorrectas,
                duracion_segundos=duracion_segundos,
                fecha_juego=timezone.now()
            )
            return JsonResponse({
                'success': True,
                'message': 'Resultados guardados exitosamente',
                'juego_id': juego.id,
                'calificacion': juego.calificacion,
                'porcentaje': juego.porcentaje_acierto
            })
        else:
            return JsonResponse({'success': True, 'message': 'Juego completado (usuario invitado)', 'guest': True})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Datos JSON inválidos'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
def obtener_estadisticas(request):
    try:
        estadisticas = EstadisticasUsuarioTrivia.objects.get(usuario=request.user)
        ultimos_juegos = HistorialJuegoTrivia.objects.filter(
            usuario=request.user
        ).order_by('-fecha_juego')[:10]
        juegos_data = [{
            'categoria': juego.get_categoria_display(),
            'puntos': juego.puntos,
            'fecha': juego.fecha_juego.strftime('%d/%m/%Y %H:%M'),
            'calificacion': juego.calificacion
        } for juego in ultimos_juegos]
        return JsonResponse({
            'success': True,
            'estadisticas': {
                'total_juegos': estadisticas.total_juegos,
                'total_puntos': estadisticas.total_puntos,
                'mejor_puntaje': estadisticas.mejor_puntaje,
                'promedio_puntos': estadisticas.promedio_puntos,
                'tasa_acierto': estadisticas.tasa_acierto_global,
                'categoria_favorita': estadisticas.get_categoria_favorita_display() if estadisticas.categoria_favorita else 'N/A'
            },
            'ultimos_juegos': juegos_data
        })
    except EstadisticasUsuarioTrivia.DoesNotExist:
        return JsonResponse({'success': True, 'estadisticas': {'total_juegos': 0, 'total_puntos': 0, 'mejor_puntaje': 0, 'promedio_puntos': 0, 'tasa_acierto': 0, 'categoria_favorita': 'N/A'}, 'ultimos_juegos': []})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
def historial_completo(request):
    juegos = HistorialJuegoTrivia.objects.filter(usuario=request.user).order_by('-fecha_juego')
    try:
        estadisticas = EstadisticasUsuarioTrivia.objects.get(usuario=request.user)
    except EstadisticasUsuarioTrivia.DoesNotExist:
        estadisticas = None
    return render(request, 'trivia_popayan/historial.html', {'juegos': juegos, 'estadisticas': estadisticas})


@require_http_methods(["POST"])
def guardar_resultado_mapa(request):
    try:
        data = json.loads(request.body)
        dificultad    = data.get('dificultad')
        duracion      = data.get('duracion_segundos')
        pistas_usadas = int(data.get('pistas_usadas', 0))
        imagen_mapa   = data.get('imagen_mapa', '')

        if not dificultad or dificultad not in ['facil', 'normal', 'dificil']:
            return JsonResponse({'success': False, 'error': 'Dificultad inválida'}, status=400)

        if request.user.is_authenticated:
            juego = HistorialMapaRoto.objects.create(
                usuario=request.user,
                dificultad=dificultad,
                duracion_segundos=duracion,
                pistas_usadas=pistas_usadas,
                imagen_mapa=imagen_mapa,
            )
            return JsonResponse({'success': True, 'message': 'Mapa Roto guardado', 'juego_id': juego.id})
        else:
            return JsonResponse({'success': True, 'guest': True, 'message': 'No guardado — usuario invitado'})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)