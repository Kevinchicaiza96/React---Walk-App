# -*- coding: utf-8 -*-
from django.urls import path
from . import views

urlpatterns = [
    path('ranking/', views.mostrarRanking, name='ranking'),
    path('admin-rutas/', views.admin_rutas, name='admin_rutas'),
]