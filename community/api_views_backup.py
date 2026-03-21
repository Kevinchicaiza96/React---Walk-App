from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Publicacion
from .serializers import PublicacionSerializer

class PublicacionViewSet(viewsets.ModelViewSet):
    queryset = Publicacion.objects.all().order_by('-fecha')
    serializer_class = PublicacionSerializer
    permission_classes = [IsAuthenticated]