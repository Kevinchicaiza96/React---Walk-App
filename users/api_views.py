from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import authenticate
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from .models import UsuarioPersonalizado
from .utils import account_activation_token


def _user_data(user, request=None):
    """Helper: dict estándar del usuario para todas las respuestas."""
    foto = None
    if user.foto_perfil:
        foto = request.build_absolute_uri(user.foto_perfil.url) if request else user.foto_perfil.url
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'rol': user.rol,                  # 'usuario' | 'admin'
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'es_admin': user.es_admin,
        'foto_perfil': foto,
        'bio': user.bio,
        'date_joined': user.date_joined,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def api_registro(request):
    """
    Registra un nuevo usuario y envía correo de activación.
    POST /api/auth/registro/
    Body: { username, email, password1, password2 }
    """
    data = request.data
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip()
    password1 = data.get('password1', '')
    password2 = data.get('password2', '')

    if not username or not email or not password1 or not password2:
        return Response({'error': 'Todos los campos son obligatorios.'}, status=400)
    if password1 != password2:
        return Response({'error': 'Las contraseñas no coinciden.'}, status=400)
    if UsuarioPersonalizado.objects.filter(username=username).exists():
        return Response({'error': 'El nombre de usuario ya está en uso.'}, status=400)
    if UsuarioPersonalizado.objects.filter(email=email).exists():
        return Response({'error': 'El correo ya está registrado.'}, status=400)

    try:
        validate_password(password1)
    except ValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=400)

    user = UsuarioPersonalizado.objects.create_user(
        username=username,
        email=email,
        password=password1,
        is_active=False,
        rol='usuario',  # Todos los registros nuevos son usuarios normales
    )

    uid   = urlsafe_base64_encode(force_bytes(user.pk))
    token = account_activation_token.make_token(user)
    activation_link = f"http://localhost:8000/activar/{uid}/{token}/"

    try:
        message = render_to_string('auth/correo_activacion.html', {
            'user': user,
            'activation_link': activation_link,
        })
        email_message = EmailMessage(
            subject='Activa tu cuenta en Walk App',
            body=message,
            to=[email],
        )
        email_message.content_subtype = "html"
        email_message.encoding = "utf-8"
        email_message.send()
    except Exception as e:
        user.delete()
        return Response({'error': f'Error al enviar el correo: {str(e)}'}, status=500)

    return Response({'message': 'Cuenta creada. Revisa tu correo para activarla.'}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    """
    Autentica al usuario y devuelve tokens JWT + datos completos.
    POST /api/auth/login/
    Body: { username, password }
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response({'error': 'Usuario y contraseña son obligatorios.'}, status=400)

    user = authenticate(request, username=username, password=password)

    if user is None:
        return Response({'error': 'Usuario o contraseña incorrectos.'}, status=401)
    if not user.is_active:
        return Response({'error': 'Tu cuenta no está activada. Revisa tu correo.'}, status=403)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user':    _user_data(user, request),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def api_logout(request):
    """
    Invalida el refresh token.
    POST /api/auth/logout/
    Body: { refresh }
    """
    try:
        token = RefreshToken(request.data.get('refresh'))
        token.blacklist()
        return Response({'message': 'Sesión cerrada correctamente.'})
    except Exception:
        return Response({'error': 'Token inválido.'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_perfil(request):
    """
    Devuelve los datos completos del usuario autenticado.
    GET /api/auth/perfil/
    """
    return Response(_user_data(request.user, request))


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def api_actualizar_perfil(request):
    """
    Actualiza datos del perfil.
    PATCH /api/auth/perfil/actualizar/
    Body: { first_name?, last_name?, bio?, foto_perfil? }
    """
    user = request.user
    user.first_name = request.data.get('first_name', user.first_name)
    user.last_name  = request.data.get('last_name',  user.last_name)
    user.bio        = request.data.get('bio',         user.bio)
    if 'foto_perfil' in request.FILES:
        user.foto_perfil = request.FILES['foto_perfil']
    user.save()
    return Response(_user_data(user, request))


# ─── ENDPOINTS DE ADMIN ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_lista_usuarios(request):
    """
    Lista todos los usuarios. Solo admins.
    GET /api/auth/usuarios/
    """
    if not request.user.es_admin:
        return Response({'error': 'No tienes permisos.'}, status=403)

    usuarios = UsuarioPersonalizado.objects.all().order_by('-date_joined')
    data = [{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'rol': u.rol,
        'is_active': u.is_active,
        'is_staff': u.is_staff,
        'date_joined': u.date_joined,
    } for u in usuarios]
    return Response({'usuarios': data, 'total': len(data)})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def api_cambiar_rol(request, user_id):
    """
    Cambia el rol de un usuario. Solo admins.
    PATCH /api/auth/usuarios/<id>/rol/
    Body: { rol: 'usuario' | 'admin' }
    """
    if not request.user.es_admin:
        return Response({'error': 'No tienes permisos.'}, status=403)

    nuevo_rol = request.data.get('rol')
    roles_validos = [r[0] for r in UsuarioPersonalizado.ROL_CHOICES]
    if nuevo_rol not in roles_validos:
        return Response({'error': f'Rol inválido. Opciones: {roles_validos}'}, status=400)

    try:
        usuario = UsuarioPersonalizado.objects.get(id=user_id)
        usuario.rol      = nuevo_rol
        usuario.is_staff = (nuevo_rol == 'admin')
        usuario.save()
        return Response({'mensaje': f'Rol actualizado a {nuevo_rol}.', 'usuario': _user_data(usuario)})
    except UsuarioPersonalizado.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=404)