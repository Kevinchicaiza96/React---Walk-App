from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Publicacion, LikePublicacion, ComentarioPublicacion


@api_view(['GET'])
@permission_classes([AllowAny])
def api_listar_publicaciones(request):
    pagina = int(request.GET.get('pagina', 1))
    por_pagina = 10
    offset = (pagina - 1) * por_pagina
    publicaciones = Publicacion.objects.select_related('usuario').prefetch_related('likes', 'comentarios').all()
    total = publicaciones.count()
    publicaciones = publicaciones[offset:offset + por_pagina]
    data = []
    for p in publicaciones:
        foto_url = None
        if p.usuario.foto_perfil:
            foto_url = request.build_absolute_uri(p.usuario.foto_perfil.url)
        imagen_url = None
        if p.imagen:
            imagen_url = request.build_absolute_uri(p.imagen.url)
        me_gusta = False
        if request.user.is_authenticated:
            me_gusta = LikePublicacion.objects.filter(usuario=request.user, publicacion=p).exists()
        data.append({
            'id': p.id,
            'usuario': p.usuario.username,
            'nombre_completo': f"{p.usuario.first_name} {p.usuario.last_name}".strip() or p.usuario.username,
            'foto_usuario': foto_url,
            'contenido': p.contenido,
            'imagen': imagen_url,
            'ruta': {'id': p.ruta.id, 'nombre': p.ruta.nombre_ruta} if p.ruta else None,
            'likes': p.likes.count(),
            'me_gusta': me_gusta,
            'comentarios': p.comentarios.count(),
            'fecha': p.fecha.strftime('%d de %B de %Y'),
            'fecha_iso': p.fecha.isoformat(),
        })
    return Response({'publicaciones': data, 'total': total, 'pagina': pagina, 'paginas': (total + por_pagina - 1) // por_pagina})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def api_crear_publicacion(request):
    contenido = request.data.get('contenido', '').strip()
    if not contenido:
        return Response({'error': 'El contenido es obligatorio.'}, status=400)
    ruta_id = request.data.get('ruta_id')
    ruta = None
    if ruta_id:
        from routes.models import Ruta
        try:
            ruta = Ruta.objects.get(id=ruta_id)
        except Ruta.DoesNotExist:
            pass
    pub = Publicacion(usuario=request.user, contenido=contenido, ruta=ruta)
    if 'imagen' in request.FILES:
        pub.imagen = request.FILES['imagen']
    pub.save()
    foto_url = None
    if request.user.foto_perfil:
        foto_url = request.build_absolute_uri(request.user.foto_perfil.url)
    imagen_url = None
    if pub.imagen:
        imagen_url = request.build_absolute_uri(pub.imagen.url)
    return Response({'mensaje': 'Publicación creada.', 'publicacion': {
        'id': pub.id, 'usuario': pub.usuario.username,
        'nombre_completo': f"{pub.usuario.first_name} {pub.usuario.last_name}".strip() or pub.usuario.username,
        'foto_usuario': foto_url, 'contenido': pub.contenido, 'imagen': imagen_url,
        'ruta': {'id': ruta.id, 'nombre': ruta.nombre_ruta} if ruta else None,
        'likes': 0, 'me_gusta': False, 'comentarios': 0,
        'fecha': pub.fecha.strftime('%d de %B de %Y'), 'fecha_iso': pub.fecha.isoformat(),
    }}, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def api_eliminar_publicacion(request, pub_id):
    try:
        pub = Publicacion.objects.get(id=pub_id)
    except Publicacion.DoesNotExist:
        return Response({'error': 'No encontrada.'}, status=404)
    es_admin = request.user.is_staff or getattr(request.user, 'rol', '') == 'admin'
    if pub.usuario != request.user and not es_admin:
        return Response({'error': 'Sin permisos.'}, status=403)
    pub.delete()
    return Response({'mensaje': 'Publicación eliminada.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_toggle_like(request, pub_id):
    try:
        pub = Publicacion.objects.get(id=pub_id)
    except Publicacion.DoesNotExist:
        return Response({'error': 'No encontrada.'}, status=404)
    like, created = LikePublicacion.objects.get_or_create(usuario=request.user, publicacion=pub)
    if not created:
        like.delete()
        me_gusta = False
    else:
        me_gusta = True
    return Response({'me_gusta': me_gusta, 'likes': pub.likes.count()})


@api_view(['GET'])
@permission_classes([AllowAny])
def api_comentarios_publicacion(request, pub_id):
    try:
        pub = Publicacion.objects.get(id=pub_id)
    except Publicacion.DoesNotExist:
        return Response({'error': 'No encontrada.'}, status=404)
    comentarios = pub.comentarios.select_related('usuario').all()
    data = []
    for c in comentarios:
        foto_url = None
        if c.usuario.foto_perfil:
            foto_url = request.build_absolute_uri(c.usuario.foto_perfil.url)
        data.append({'id': c.id, 'usuario': c.usuario.username,
            'nombre_completo': f"{c.usuario.first_name} {c.usuario.last_name}".strip() or c.usuario.username,
            'foto_usuario': foto_url, 'texto': c.texto, 'fecha': c.fecha.strftime('%d/%m/%Y %H:%M')})
    return Response({'comentarios': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_crear_comentario_pub(request, pub_id):
    try:
        pub = Publicacion.objects.get(id=pub_id)
    except Publicacion.DoesNotExist:
        return Response({'error': 'No encontrada.'}, status=404)
    texto = request.data.get('texto', '').strip()
    if not texto:
        return Response({'error': 'El comentario no puede estar vacío.'}, status=400)
    c = ComentarioPublicacion.objects.create(publicacion=pub, usuario=request.user, texto=texto)
    foto_url = None
    if request.user.foto_perfil:
        foto_url = request.build_absolute_uri(request.user.foto_perfil.url)
    return Response({'comentario': {'id': c.id, 'usuario': c.usuario.username,
        'nombre_completo': f"{c.usuario.first_name} {c.usuario.last_name}".strip() or c.usuario.username,
        'foto_usuario': foto_url, 'texto': c.texto, 'fecha': c.fecha.strftime('%d/%m/%Y %H:%M')}}, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def api_eliminar_comentario_pub(request, pub_id, comentario_id):
    try:
        c = ComentarioPublicacion.objects.get(id=comentario_id, publicacion_id=pub_id)
    except ComentarioPublicacion.DoesNotExist:
        return Response({'error': 'No encontrado.'}, status=404)
    es_admin = request.user.is_staff or getattr(request.user, 'rol', '') == 'admin'
    if c.usuario != request.user and not es_admin:
        return Response({'error': 'Sin permisos.'}, status=403)
    c.delete()
    return Response({'mensaje': 'Comentario eliminado.'})