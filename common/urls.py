from django.contrib.auth.views import LoginView, LogoutView
from django.urls import path

app_name = 'notes'

urlpatterns = [
    path("accounts/login/", LoginView.as_view(template_name="registration/login.html"), name="login"),
    path("accounts/logout/", LogoutView.as_view(next_page="common:login"), name="logout"), ]
