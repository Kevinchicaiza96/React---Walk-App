from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    path('comunidad/', views.mostrarComunidad, name='comunidad'),
    path('api/comunidad/', api_views.api_listar_publicaciones),
    path('api/comunidad/crear/', api_views.api_crear_publicacion),
    path('api/comunidad/<int:pub_id>/eliminar/', api_views.api_eliminar_publicacion),
    path('api/comunidad/<int:pub_id>/like/', api_views.api_toggle_like),
    path('api/comunidad/<int:pub_id>/comentarios/', api_views.api_comentarios_publicacion),
    path('api/comunidad/<int:pub_id>/comentarios/crear/', api_views.api_crear_comentario_pub),
    path('api/comunidad/<int:pub_id>/comentarios/<int:comentario_id>/eliminar/', api_views.api_eliminar_comentario_pub),
]
