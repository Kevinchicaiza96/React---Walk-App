from django.db import models
from django.contrib.auth.models import AbstractUser


class UsuarioPersonalizado(AbstractUser):
    """
    Modelo de usuario personalizado que extiende AbstractUser.
    """

    ROL_CHOICES = [
        ('usuario', 'Usuario'),
        ('admin', 'Administrador'),
    ]

    email = models.EmailField(unique=True)

    rol = models.CharField(
        max_length=20,
        choices=ROL_CHOICES,
        default='usuario',
        verbose_name='Rol',
        help_text='Rol del usuario en la aplicación'
    )

    foto_perfil = models.ImageField(
        upload_to='perfiles/',
        null=True,
        blank=True,
        verbose_name='Foto de perfil'
    )

    bio = models.TextField(
        max_length=300,
        blank=True,
        null=True,
        verbose_name='Biografía',
        help_text='Descripción corta del usuario'
    )

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"

    @property
    def es_admin(self):
        return self.rol == 'admin' or self.is_staff or self.is_superuser

    @property
    def es_usuario(self):
        return self.rol == 'usuario'