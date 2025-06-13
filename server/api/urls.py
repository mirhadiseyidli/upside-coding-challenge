from django.urls import path
from . import views

app_name = "api"

urlpatterns = [
    # placeholder root view
    path("", views.index, name="index"),
    # New activity timeline endpoints
    path("api/customers/", views.customers, name="customers"),
    path("api/events/", views.activity_events, name="activity-events"),
    path("api/events/counts/", views.activity_counts, name="activity-counts"),
    path("api/events/first-touchpoints/", views.first_touchpoints, name="first-touchpoints"),
    # Legacy random endpoints
    path("api/events/random/", views.random_activity_events, name="random-activity-events"),
    path("api/people/random/", views.random_persons, name="random-people"),
] 