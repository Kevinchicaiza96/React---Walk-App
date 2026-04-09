from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

# ===================================
# MODELO DE JUEGOS 
#====================================

class HistorialJuegoTrivia(models.Model):
    
    # Opciones de categorías
    CATEGORIAS_CHOICES = [
        ('rutas', 'Rutas'),
        ('equipo', 'Equipo'),
        ('seguridad', 'Seguridad'),
        ('flora-fauna', 'Flora y Fauna'),
        ('tecnicas', 'Técnicas'),
        ('lugares', 'Lugares Icónicos'),
    ]
    
    # Relación con el usuario (puede ser null para usuarios no autenticados)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='juegos_trivia',
        verbose_name='Usuario',
        help_text='Usuario que jugó la trivia'
    )
    
    # Información del juego
    categoria = models.CharField(
        max_length=20,
        choices=CATEGORIAS_CHOICES,
        verbose_name='Categoría/Nivel',
        help_text='Categoría de preguntas jugada'
    )
    
    puntos = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
        verbose_name='Puntos Obtenidos',
        help_text='Total de puntos (máximo 500 - 5 preguntas x 100 pts)'
    )
    
    respuestas_correctas = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name='Respuestas Correctas',
        help_text='Número de respuestas correctas'
    )
    
    respuestas_incorrectas = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name='Respuestas Incorrectas',
        help_text='Número de respuestas incorrectas'
    )
    
    # Información temporal
    fecha_juego = models.DateTimeField(
        default=timezone.now,
        verbose_name='Fecha y Hora del Juego',
        help_text='Fecha y hora en que se completó el juego'
    )
    
    # Metadatos adicionales (opcional)
    duracion_segundos = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Duración (segundos)',
        help_text='Tiempo que tardó en completar el juego'
    )
    
    class Meta:
        verbose_name = 'Historial de Juego'
        verbose_name_plural = 'Historial de Juegos'
        ordering = ['-fecha_juego']  # Más recientes primero
        indexes = [
            models.Index(fields=['-fecha_juego']),
            models.Index(fields=['usuario', '-fecha_juego']),
            models.Index(fields=['categoria']),
        ]
    
    def __str__(self):
        return f"{self.usuario.username if self.usuario else 'Anónimo'} - {self.get_categoria_display()} - {self.puntos} pts"
    
    @property
    def porcentaje_acierto(self):
        """Calcula el porcentaje de respuestas correctas"""
        total = self.respuestas_correctas + self.respuestas_incorrectas
        if total == 0:
            return 0
        return round((self.respuestas_correctas / total) * 100, 2)
    
    @property
    def calificacion(self):
        """Retorna una calificación textual basada en el desempeño"""
        porcentaje = self.porcentaje_acierto
        if porcentaje >= 90:
            return "Excelente"
        elif porcentaje >= 70:
            return "Muy Bien"
        elif porcentaje >= 50:
            return "Bien"
        else:
            return "Necesita Mejorar"
    
    def save(self, *args, **kwargs):
        """Validación antes de guardar"""
        # Validar que la suma de correctas e incorrectas no exceda 5
        total_respuestas = self.respuestas_correctas + self.respuestas_incorrectas
        if total_respuestas > 5:
            raise ValueError("El total de respuestas no puede exceder 5")
        
        # Validar que los puntos correspondan a las respuestas correctas
        puntos_esperados = self.respuestas_correctas * 100
        if self.puntos != puntos_esperados:
            self.puntos = puntos_esperados
        
        super().save(*args, **kwargs)


# ------------------------------
    # Modelo para almacenar estadísticas generales del usuario en la trivia
    # Se actualiza automáticamente con cada juego
#------------------------------
class EstadisticasUsuarioTrivia(models.Model):
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='estadisticas_trivia',
        verbose_name='Usuario'
    )
    
    # Estadísticas generales
    total_juegos = models.IntegerField(
        default=0,
        verbose_name='Total de Juegos'
    )
    
    total_puntos = models.IntegerField(
        default=0,
        verbose_name='Puntos Totales Acumulados'
    )
    
    mejor_puntaje = models.IntegerField(
        default=0,
        verbose_name='Mejor Puntaje'
    )
    
    categoria_favorita = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Categoría Favorita',
        help_text='Categoría más jugada'
    )
    
    total_correctas = models.IntegerField(
        default=0,
        verbose_name='Total Respuestas Correctas'
    )
    
    total_incorrectas = models.IntegerField(
        default=0,
        verbose_name='Total Respuestas Incorrectas'
    )
    
    ultima_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )
    
    class Meta:
        verbose_name = 'Estadística de Usuario'
        verbose_name_plural = 'Estadísticas de Usuarios'
    
    def __str__(self):
        return f"Estadísticas de {self.usuario.username}"
    
    @property
    def promedio_puntos(self):
        """Calcula el promedio de puntos por juego"""
        if self.total_juegos == 0:
            return 0
        return round(self.total_puntos / self.total_juegos, 2)
    
    @property
    def tasa_acierto_global(self):
        """Calcula la tasa de acierto global"""
        total = self.total_correctas + self.total_incorrectas
        if total == 0:
            return 0
        return round((self.total_correctas / total) * 100, 2)
    
    def actualizar_estadisticas(self, juego):
        """
        Actualiza las estadísticas con un nuevo juego
        Args:
            juego: Instancia de HistorialJuegoTrivia
        """
        self.total_juegos += 1
        self.total_puntos += juego.puntos
        self.total_correctas += juego.respuestas_correctas
        self.total_incorrectas += juego.respuestas_incorrectas
        
        if juego.puntos > self.mejor_puntaje:
            self.mejor_puntaje = juego.puntos
        
        # Actualizar categoría favorita
        from django.db.models import Count
        categoria_mas_jugada = HistorialJuegoTrivia.objects.filter(
            usuario=self.usuario
        ).values('categoria').annotate(
            count=Count('categoria')
        ).order_by('-count').first()
        
        if categoria_mas_jugada:
            self.categoria_favorita = categoria_mas_jugada['categoria']
        
        self.save()


# Señales para actualizar automáticamente las estadísticas
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=HistorialJuegoTrivia)
def actualizar_estadisticas_usuario(sender, instance, created, **kwargs):
    """
    Actualiza las estadísticas del usuario cuando se guarda un nuevo juego
    """
    if created and instance.usuario:  # Solo para usuarios autenticados
        estadisticas, created = EstadisticasUsuarioTrivia.objects.get_or_create(
            usuario=instance.usuario
        )
        estadisticas.actualizar_estadisticas(instance)

# ===================================
# MODELO MAPA ROTO
# ===================================

class HistorialMapaRoto(models.Model):

    DIFICULTAD_CHOICES = [
        ('facil',   'Fácil'),
        ('normal',  'Normal'),
        ('dificil', 'Difícil'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='juegos_mapa_roto',
        verbose_name='Usuario'
    )

    dificultad = models.CharField(
        max_length=10,
        choices=DIFICULTAD_CHOICES,
        verbose_name='Dificultad'
    )

    imagen_mapa = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Imagen del mapa',
        help_text='Nombre del archivo de imagen resuelto'
    )

    duracion_segundos = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Duración (segundos)'
    )

    pistas_usadas = models.IntegerField(
        default=0,
        verbose_name='Pistas usadas'
    )

    fecha_juego = models.DateTimeField(
        default=timezone.now,
        verbose_name='Fecha del juego'
    )

    class Meta:
        verbose_name = 'Historial Mapa Roto'
        verbose_name_plural = 'Historial Mapa Roto'
        ordering = ['-fecha_juego']

    def __str__(self):
        return f"{self.usuario.username} - Mapa Roto {self.get_dificultad_display()} - {self.duracion_segundos}s"

    @property
    def pistas_restantes(self):
        return max(0, 3 - self.pistas_usadas)