from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.db.models import QuerySet, Count
from django.core.paginator import Paginator
from django.db.models.functions import TruncDate
from datetime import datetime

# Create your views here.

def index(request):
    return HttpResponse("Hello, world! This is the API root.")

from .models import ActivityEvent, Person


# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------

def activity_events(request):
    """Return paginated ActivityEvent records for the given customer and account.
    
    Query parameters:
    - customer_org_id (required)
    - account_id (required)
    - page (optional, default=1)
    - page_size (optional, default=50)
    - start_date (optional, ISO format)
    - end_date (optional, ISO format)
    """
    customer_org_id = request.GET.get("customer_org_id")
    account_id = request.GET.get("account_id")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 50))
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    if not customer_org_id or not account_id:
        return JsonResponse(
            {
                "error": "Both 'customer_org_id' and 'account_id' query parameters are required."
            },
            status=400,
        )

    # Start with base queryset
    events_qs = ActivityEvent.objects.filter(
        customer_org_id=customer_org_id, 
        account_id=account_id
    ).order_by("timestamp")
    
    # Apply date filters if provided
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            events_qs = events_qs.filter(timestamp__gte=start_dt)
        except ValueError:
            return JsonResponse({"error": "Invalid start_date format"}, status=400)
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            events_qs = events_qs.filter(timestamp__lte=end_dt)
        except ValueError:
            return JsonResponse({"error": "Invalid end_date format"}, status=400)

    # Paginate results
    paginator = Paginator(events_qs, page_size)
    page_obj = paginator.get_page(page)
    
    # Convert to list of dictionaries
    events = []
    for event in page_obj:
        # Enrich people data with Person model details
        enriched_people = []
        if event.people:
            for person_ref in event.people:
                person_id = person_ref.get('id') or person_ref.get('person_id')
                if person_id:
                    try:
                        person = Person.objects.get(id=person_id)
                        enriched_people.append({
                            'id': person.id,
                            'first_name': person.first_name,
                            'last_name': person.last_name,
                            'email_address': person.email_address,
                            'role_in_touchpoint': person_ref.get('role_in_touchpoint')
                        })
                    except Person.DoesNotExist:
                        # Keep original data if person not found
                        enriched_people.append(person_ref)
                else:
                    enriched_people.append(person_ref)
        
        event_dict = {
            'id': event.id,
            'timestamp': event.timestamp.isoformat(),
            'activity': event.activity,
            'channel': event.channel,
            'status': event.status,
            'people': enriched_people,
            'involved_team_ids': event.involved_team_ids,
            'direction': event.direction,
            'customer_org_id': event.customer_org_id,
            'account_id': event.account_id,
        }
        events.append(event_dict)

    return JsonResponse({
        'events': events,
        'pagination': {
            'current_page': page,
            'total_pages': paginator.num_pages,
            'total_count': paginator.count,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        }
    })

def activity_counts(request):
    """Return daily activity counts for minimap visualization.
    
    Query parameters:
    - customer_org_id (required)
    - account_id (required)
    - direction (optional, default="IN")
    """
    customer_org_id = request.GET.get("customer_org_id")
    account_id = request.GET.get("account_id")
    direction = request.GET.get("direction", "IN")

    if not customer_org_id or not account_id:
        return JsonResponse(
            {
                "error": "Both 'customer_org_id' and 'account_id' query parameters are required."
            },
            status=400,
        )

    # Get daily counts of activities with specified direction
    daily_counts = (
        ActivityEvent.objects
        .filter(
            customer_org_id=customer_org_id,
            account_id=account_id,
            direction=direction
        )
        .annotate(date=TruncDate('timestamp'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    # Convert to list format
    counts = [
        {
            'date': item['date'].isoformat(),
            'count': item['count']
        }
        for item in daily_counts
    ]

    return JsonResponse({
        'daily_counts': counts,
        'direction': direction
    })

def first_touchpoints(request):
    """Return first touchpoint per person for minimap markers.
    
    Query parameters:
    - customer_org_id (required)
    - account_id (required)
    """
    customer_org_id = request.GET.get("customer_org_id")
    account_id = request.GET.get("account_id")

    if not customer_org_id or not account_id:
        return JsonResponse(
            {
                "error": "Both 'customer_org_id' and 'account_id' query parameters are required."
            },
            status=400,
        )

    # Get all events to find first touchpoint per person
    events = ActivityEvent.objects.filter(
        customer_org_id=customer_org_id,
        account_id=account_id
    ).order_by('timestamp')

    # Track first touchpoint per person
    first_touchpoints = {}
    
    for event in events:
        if event.people:  # people is a JSON field
            for person_ref in event.people:
                person_id = person_ref.get('id') or person_ref.get('person_id')
                if person_id and person_id not in first_touchpoints:
                    try:
                        person = Person.objects.get(id=person_id)
                        person_name = f"{person.first_name} {person.last_name}".strip()
                        person_email = person.email_address
                    except Person.DoesNotExist:
                        person_name = f"{person_ref.get('first_name', '')} {person_ref.get('last_name', '')}".strip() or 'Unknown'
                        person_email = person_ref.get('email_address', '')
                    
                    first_touchpoints[person_id] = {
                        'person_id': person_id,
                        'person_name': person_name,
                        'email': person_email,
                        'timestamp': event.timestamp.isoformat(),
                        'activity': event.activity,
                        'channel': event.channel
                    }

    # Sort first touchpoints by timestamp
    sorted_touchpoints = sorted(
        first_touchpoints.values(), 
        key=lambda x: x['timestamp']
    )
    
    return JsonResponse({
        'first_touchpoints': sorted_touchpoints
    })

def random_activity_events(request):
    """Return up to 10 random ActivityEvent records for the given customer.

    Query parameters:
    - customer_org_id (required)
    - account_id (required)
    """
    customer_org_id = request.GET.get("customer_org_id")
    account_id = request.GET.get("account_id")

    if not customer_org_id or not account_id:
        return JsonResponse(
            {
                "error": "Both 'customer_org_id' and 'account_id' query parameters are required."
            },
            status=400,
        )

    events_qs: QuerySet = (
        ActivityEvent.objects.filter(
            customer_org_id=customer_org_id, account_id=account_id
        )
        .order_by("?")[:10]
    )

    # Use .values() to get dictionaries of all model fields.
    events = list(events_qs.values())
    return JsonResponse(events, safe=False)

def customers(request):
    """Return available customer organizations and their accounts."""
    
    # Get distinct customer_org_id and account_id combinations
    customers_data = (
        ActivityEvent.objects
        .values('customer_org_id', 'account_id')
        .distinct()
        .order_by('customer_org_id', 'account_id')
    )
    
    # Group by customer_org_id
    customers = {}
    for item in customers_data:
        org_id = item['customer_org_id']
        account_id = item['account_id']
        
        if org_id not in customers:
            customers[org_id] = {
                'customer_org_id': org_id,
                'accounts': []
            }
        
        customers[org_id]['accounts'].append({
            'account_id': account_id,
            'display_name': account_id  # Could be enhanced with actual account names
        })
    
    return JsonResponse({
        'customers': list(customers.values())
    })

def random_persons(request):
    """Return up to 5 random Person records for the given customer.

    Query parameters:
    - customer_org_id (required)
    """

    customer_org_id = request.GET.get("customer_org_id")

    if not customer_org_id:
        return JsonResponse(
            {"error": "'customer_org_id' query parameter is required."},
            status=400,
        )

    persons_qs: QuerySet = (
        Person.objects.filter(customer_org_id=customer_org_id).order_by("?")[:5]
    )

    persons = list(persons_qs.values())
    return JsonResponse(persons, safe=False)
