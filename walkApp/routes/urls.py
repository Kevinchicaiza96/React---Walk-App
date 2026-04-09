from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import api_views

# Router para viewsets
router = DefaultRouter()
router.register(r'api/rutas/viewset', api_views.RutaViewset, basename='ruta-viewset')

urlpatterns = [

    # ============================
    # VISTAS DJANGO (templates)
    # ============================
    path('rutas/', views.mostrarRutas, name='rutas'),
    path('rutas/crear/', views.crear_ruta, name='crear_ruta'),
    path('buscar-rutas/', views.buscar_rutas, name='buscar_rutas'),
    path('<int:ruta_id>/', views.detalle_ruta, name='detalle_ruta'),
    path('rutas/eliminar/<int:pk>/', views.eliminar_ruta, name='eliminar_ruta'),
    path('rutas/<int:ruta_id>/qr/', views.generar_qr_ruta, name='generar_qr_ruta'),
    path('rutas/<int:ruta_id>/marcar-favorita/', views.marcar_favorita, name='marcar_favorita'),
    path('rutas/<int:ruta_id>/quitar-favorita/', views.quitar_favorita, name='quitar_favorita'),
    path('rutas/<int:ruta_id>/iniciar/', views.iniciar_ruta, name='iniciar_ruta'),
    path('rutas/<int:ruta_id>/terminar/', views.terminar_ruta, name='terminar_ruta'),
    path('api/guardar-posicion/', views.guardar_posicion, name='guardar_posicion'),

    # ============================
    # API REST (para React)
    # ============================
    path('api/rutas/', api_views.api_listar_rutas, name='api_listar_rutas'),
    path('api/rutas/crear/', api_views.api_crear_ruta, name='api_crear_ruta'),
    path('api/rutas/favoritas/', api_views.api_mis_favoritas, name='api_mis_favoritas'),
    path('api/rutas/mis-rutas/', api_views.api_mis_rutas, name='api_mis_rutas'),
    path('api/rutas/<int:ruta_id>/', api_views.api_detalle_ruta, name='api_detalle_ruta'),
    path('api/rutas/<int:ruta_id>/eliminar/', api_views.api_eliminar_ruta, name='api_eliminar_ruta'),
    path('api/rutas/<int:ruta_id>/favorita/', api_views.api_marcar_favorita, name='api_marcar_favorita'),

    # Viewsets
    path('', include(router.urls)),
]