# -*- coding: utf-8 -*-
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import HistorialJuegoTrivia, EstadisticasUsuarioTrivia, HistorialMapaRoto
from .serializers import HistoriaSerializer, EstadisticasSerializer, MapaRotoSerializer

PUNTOS_MAPA_ROTO = {
    'facil':   50,
    'normal':  100,
    'dificil': 200,
}

def sumar_puntos_ranking(usuario, puntos):
    """Suma puntos al UserProfile del ranking."""
    try:
        from ranking.models import UserProfile
        perfil, _ = UserProfile.objects.get_or_create(user=usuario)
        perfil.actualizar_estadisticas(puntos, 0)
    except Exception:
        pass


class HistoriaViewSet(viewsets.ModelViewSet):
    serializer_class = HistoriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HistorialJuegoTrivia.objects.filter(
            usuario=self.request.user
        ).order_by('-fecha_juego')

    def perform_create(self, serializer):
        instancia = serializer.save(usuario=self.request.user)
        # Sumar puntos de trivia al ranking
        if instancia.puntos > 0:
            sumar_puntos_ranking(self.request.user, instancia.puntos)


class EstadisticasViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EstadisticasSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EstadisticasUsuarioTrivia.objects.filter(
            usuario=self.request.user
        )

    @action(detail=False, methods=['get'])
    def mias(self, request):
        estadisticas, _ = EstadisticasUsuarioTrivia.objects.get_or_create(
            usuario=request.user
        )
        serializer = self.get_serializer(estadisticas)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        estadisticas, _ = EstadisticasUsuarioTrivia.objects.get_or_create(
            usuario=request.user
        )
        ultimos = HistorialJuegoTrivia.objects.filter(
            usuario=request.user
        ).order_by('-fecha_juego')[:10]

        ultimos_data = [
            {
                'id':            j.id,
                'categoria':     j.get_categoria_display(),
                'categoria_key': j.categoria,
                'puntos':        j.puntos,
                'fecha':         j.fecha_juego.strftime('%d/%m/%Y'),
            }
            for j in ultimos
        ]

        return Response({
            'estadisticas': {
                'total_juegos':  estadisticas.total_juegos,
                'mejor_puntaje': estadisticas.mejor_puntaje,
                'tasa_acierto':  estadisticas.tasa_acierto_global,
            },
            'ultimos_juegos': ultimos_data,
        })


class MapaRotoViewSet(viewsets.ModelViewSet):
    serializer_class = MapaRotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HistorialMapaRoto.objects.filter(
            usuario=self.request.user
        ).order_by('-fecha_juego')

    def perform_create(self, serializer):
        instancia = serializer.save(usuario=self.request.user)
        # Sumar puntos de mapa roto al ranking según dificultad
        puntos = PUNTOS_MAPA_ROTO.get(instancia.dificultad, 50)
        sumar_puntos_ranking(self.request.user, puntos)