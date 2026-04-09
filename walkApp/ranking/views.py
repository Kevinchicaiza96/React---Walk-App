from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.utils import timezone
from datetime import timedelta
import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from routes.models import Ruta
from .models import UserProfile, Walk


# ---------------------------------
# VISTA PRINCIPAL DE RANKING (HTML)
# ---------------------------------
def mostrarRanking(request):
    top_5 = obtener_top_5_semanal()
    user_profile = None
    user_walks = []
    chart_data = {'Semana Actual': [0, 0, 0]}

    if request.user.is_authenticated:
        try:
            user_profile, created = UserProfile.objects.get_or_create(
                user=request.user,
                defaults={
                    'total_puntos': 0, 'puntos_mensuales': 0,
                    'puntos_semanales': 0, 'distancia_total_km': 0, 'dias_activos': 0
                }
            )
            user_walks = Walk.objects.filter(usuario=request.user).order_by('-fecha')[:3]
            chart_data = {
                'Semana Actual': [
                    user_profile.puntos_semanales,
                    round(user_profile.distancia_total_km, 2),
                    user_profile.dias_activos
                ]
            }
        except Exception as e:
            print(f"Error al obtener datos del usuario: {e}")

    context = {
        'monthly_ranking': top_5,
        'chart_data': json.dumps(chart_data),
        'user_walks': user_walks,
        'user_profile': user_profile,
        'user_authenticated': request.user.is_authenticated,
    }
    return render(request, 'ranking-Principal/ranking.html', context)


# ---------------------------------
# HELPER
# ---------------------------------
def obtener_top_5_semanal():
    try:
        return UserProfile.objects.all().order_by('-puntos_semanales')[:5]
    except Exception as e:
        print(f"Error al obtener top 5: {e}")
        return []


# ---------------------------------
# API: RANKING COMPLETO — público
# ---------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def api_ranking_completo(request):
    ranking = UserProfile.objects.all().order_by('-puntos_semanales')
    now = timezone.now()
    start_of_week = now - timedelta(days=now.weekday())

    data = []
    for idx, profile in enumerate(ranking, 1):
        total_caminatas = Walk.objects.filter(
            usuario=profile.user,
            fecha__gte=start_of_week.date()
        ).count()
        data.append({
            'posicion': idx,
            'username': profile.user.username,
            'nombre_completo': f"{profile.user.first_name} {profile.user.last_name}".strip(),
            'puntos_semanales': profile.puntos_semanales,
            'distancia_km': round(profile.distancia_total_km, 2),
            'dias_activos': profile.dias_activos,
            'total_caminatas': total_caminatas,
        })
    return Response(data)


# ---------------------------------
# API: ESTADÍSTICAS USUARIO — requiere JWT
# ---------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_estadisticas_usuario(request):
    user_profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={
            'total_puntos': 0, 'puntos_mensuales': 0,
            'puntos_semanales': 0, 'distancia_total_km': 0, 'dias_activos': 0
        }
    )
    return Response({
        'puntos_semanales': user_profile.puntos_semanales,
        'distancia_total_km': round(user_profile.distancia_total_km, 2),
        'dias_activos': user_profile.dias_activos,
        'total_puntos': user_profile.total_puntos,
    })


# ---------------------------------
# API: TOP 5 — público
# ---------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def api_top_5_ranking(request):
    top_5 = obtener_top_5_semanal()
    data = []
    for idx, profile in enumerate(top_5, 1):
        data.append({
            'posicion': idx,
            'username': profile.user.username,
            'nombre_completo': f"{profile.user.first_name} {profile.user.last_name}".strip(),
            'puntos': profile.puntos_semanales,
            'distancia_km': round(profile.distancia_total_km, 2),
        })
    return Response(data)


# ---------------------------------
# API: RECORRIDOS TOP 5 — público
# ---------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def api_recorridos_top5(request):
    try:
        top_5_profiles = obtener_top_5_semanal()
        top_5_user_ids = [p.user.id for p in top_5_profiles]
        now = timezone.now()
        start_of_week = now - timedelta(days=now.weekday())

        recorridos = Walk.objects.filter(
            usuario_id__in=top_5_user_ids,
            fecha__gte=start_of_week.date(),
            coordenadas_recorrido__isnull=False
        ).values('usuario__username', 'coordenadas_recorrido', 'titulo', 'puntos_caminata')

        data = []
        for r in recorridos:
            coords = r['coordenadas_recorrido'] or []
            if coords:
                coords_formatted = [[c[0], c[1]] for c in coords if len(c) >= 2]
                if coords_formatted:
                    data.append({
                        'user': r['usuario__username'],
                        'coords': coords_formatted,
                        'titulo': r['titulo'],
                        'puntos': r['puntos_caminata']
                    })
        return Response(data)
    except Exception as e:
        print(f"Error en api_recorridos_top5: {e}")
        return Response([])


# ---------------------------------
# API: ACTUALIZAR POSICIÓN — requiere JWT
# ---------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_actualizar_posicion(request):
    try:
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        distancia_metros = request.data.get('distancia_metros', 0)
        walk_id = request.data.get('walk_id')

        user_profile = UserProfile.objects.get(user=request.user)
        puntos_ganados = int((distancia_metros / 5) * 10)
        distancia_km = distancia_metros / 1000

        user_profile.actualizar_estadisticas(puntos_ganados, distancia_km)

        if walk_id:
            walk = Walk.objects.get(id=walk_id, usuario=request.user)
            if not walk.coordenadas_recorrido:
                walk.coordenadas_recorrido = []
            walk.coordenadas_recorrido.append([lat, lng, timezone.now().isoformat()])
            walk.distancia_km += distancia_km
            walk.puntos_caminata += puntos_ganados
            walk.save()

        return Response({
            'success': True,
            'puntos_totales': user_profile.puntos_semanales,
            'distancia_total_km': round(user_profile.distancia_total_km, 2),
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=400)


# ---------------------------------
# API: ESTADÍSTICAS GLOBALES — público
# ---------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def api_estadisticas_globales(request):
    try:
        now = timezone.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_last_week = start_of_week - timedelta(days=7)

        # Usuario más activo: mayor días activos esta semana
        mas_activo_profile = UserProfile.objects.order_by('-dias_activos').first()
        mas_activo = None
        if mas_activo_profile:
            mas_activo = {
                'username': mas_activo_profile.user.username,
                'dias_activos': mas_activo_profile.dias_activos,
                'distancia_km': round(mas_activo_profile.distancia_total_km, 2),
            }

        # Puntos totales esta semana (suma de todos los usuarios)
        puntos_esta_semana = sum(
            p.puntos_semanales for p in UserProfile.objects.all()
        )

        # Puntos semana anterior: suma de walks de la semana pasada
        walks_semana_anterior = Walk.objects.filter(
            fecha__gte=start_of_last_week.date(),
            fecha__lt=start_of_week.date()
        )
        puntos_semana_anterior = sum(w.puntos_caminata for w in walks_semana_anterior)

        diferencia = puntos_esta_semana - puntos_semana_anterior

        return Response({
            'mas_activo': mas_activo,
            'comparativa': {
                'puntos_esta_semana': puntos_esta_semana,
                'puntos_semana_anterior': puntos_semana_anterior,
                'diferencia': diferencia,
            }
        })
    except Exception as e:
        print(f"Error en api_estadisticas_globales: {e}")
        return Response({}, status=500)


@staff_member_required
def admin_rutas(request):
    rutas = Ruta.objects.all().order_by('-fecha_creacion')
    return render(request, 'admin/admin_rutas.html', {'rutas': rutas})