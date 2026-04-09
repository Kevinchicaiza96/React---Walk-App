from django.urls import path
from . import views

urlpatterns = [
    path('top-5/',                views.api_top_5_ranking,        name='api_top_5'),
    path('estadisticas-usuario/', views.api_estadisticas_usuario, name='api_stats_usuario'),
    path('estadisticas-globales/', views.api_estadisticas_globales, name='api_stats_globales'),
    path('recorridos-top5/',      views.api_recorridos_top5,      name='api_recorridos_top5'),
    path('ranking-completo/',     views.api_ranking_completo,     name='api_ranking_completo'),
    path('actualizar-posicion/',  views.api_actualizar_posicion,  name='api_actualizar_posicion'),
]