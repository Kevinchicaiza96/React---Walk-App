from django.db import models
from django.conf import settings

class Publicacion(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='publicaciones')
    ruta = models.ForeignKey('routes.Ruta', on_delete=models.SET_NULL, null=True, blank=True, related_name='publicaciones')
    contenido = models.TextField(max_length=1000)
    imagen = models.ImageField(upload_to='publicaciones/', blank=True, null=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.usuario.username} - {self.fecha.strftime('%d/%m/%Y')}"

class LikePublicacion(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='likes')

    class Meta:
        unique_together = ('usuario', 'publicacion')

class ComentarioPublicacion(models.Model):
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='comentarios')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    texto = models.TextField(max_length=500)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha']