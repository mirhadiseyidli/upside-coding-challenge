# Django API Quick-Start

---

## 1. Setup
This guide assumes you have Python 3 installed on your system.

```bash
# (Recommended) Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 2. Running the development server

```bash
python manage.py runserver 8000
```

Django will be available at `http://localhost:8000/`.

---

## 4. Sample API Endpoints

These API endpoints are provided as reference examples.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/` | Simple health/index page |
| GET | `/api/events/random/` | Return up to 10 random `ActivityEvent` objects for a customer/account |
| GET | `/api/people/random/` | Return up to 5 random `Person` objects for a customer |

### Query parameters (required)

* `customer_org_id` – the customer organisation ID
* `account_id` – the account identifier (only for `/api/events/random/`)

If any required parameter is missing, the endpoint returns **400 Bad Request**.

#### Example cURL request
**ActivityEvents:**
```bash
curl "http://localhost:8000/api/events/random/?customer_org_id=org_4m6zyrass98vvtk3xh5kcwcmaf&account_id=account_31crr1tcp2bmcv1fk6pcm0k6ag"
```

**Persons:**
```bash
curl "http://localhost:8000/api/people/random/?customer_org_id=org_4m6zyrass98vvtk3xh5kcwcmaf"
```

Example response (truncated):

**ActivityEvents:**
```json
[
  {
    "id": 17,
    "customer_org_id": "ORG123",
    "account_id": "ACC456",
    "touchpoint_id": "abcd1234",
    "timestamp": "2025-01-15T14:22:33.456Z",
    "activity": "Email sent to customer …",
    "channel": "EMAIL",
    "status": "SENT",
    "record_type": "COMMUNICATION",
    …
  }
]
```

**Persons:**
```json
[
  {
    "customer_org_id": "org_4m6zyrass98vvtk3xh5kcwcmaf",
    "id": "person_030f5n5539bznv84q4v69360rh",
    "first_name": "Erin",
    "last_name": "Poole",
    "email_address": "ashley56@chang-lewis.biz",
    "job_title": "Engineer, maintenance (IT)"
  }
  // ... more person objects
]
```

---

Happy hacking! :)


## Appendix: Importing data from JSON Lines

If you're a candidate, you should not need to do this, as the `db.sqlite3` file has already been populated with sample data for you.

### Database migrations
Apply migrations before first use:

```bash
python manage.py migrate --no-input
```

---

A custom management command ingests records that match the `ActivityEvent` model schema. Each line in the file must be a valid JSON object.
```bash
python manage.py ingest_activityevents data/account_31crr1tcp2bmcv1fk6pcm0k6ag.jsonl
```

The command converts epoch-millisecond or ISO-8601 `timestamp` values to timezone-aware datetimes and bulk-inserts the data.

Similarly, `Person` records can be ingested using the `ingest_persons` command:
```bash
python manage.py ingest_persons data/persons.jsonl
```