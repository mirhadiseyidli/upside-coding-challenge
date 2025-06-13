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




# Take Home Assesment results:

1.  A Dropdown to select Customer and Account
2.  Minimap that shows Inbound Activities, First Touchpoints. 
      a. Scroll to clicked date
3.  Activity timeline shows all
      a. hover over name for email

# Bugs
1.  Times sometimes don't match (off by hours, assuming utc to local conversion issue)
2.  Background highlight based on the date range on Timeline doens't work. Mostly issue is I've never used Recharts library, didn't have enough time to debug

# Trade offs
1.  Trade-off: Used Bar component instead of ReferenceArea for highlighting
    Benefit: More reliable with categorical X-axis, better cross-browser support
    Cost: Less semantically correct (bars represent data, not ranges)
2.  Trade-off: Changed from "fully contained" to "any overlap" row detection
    Benefit: More responsive to user scrolling, catches edge cases
    Cost: May include partially hidden rows in calculations

# TODO
1.  Precise range highlighting - Replace all-or-nothing approach with exact date boundary highlighting using proper ReferenceArea or custom SVG overlay
2.  Debounced scroll handling - Add proper debouncing (300ms) to scroll events to reduce CPU usage and improve performance
3.  Memoize expensive calculations - Cache date parsing, aggregation, and highlight calculations with proper dependency tracking
4.  Optimize re-renders - Split chartDataWithHighlight into separate useMemo hooks to prevent unnecessary recalculations
5.  Background processing - Move heavy date calculations to Web Workers for large datasets
6.  Loading states - Add skeleton loading for minimap while data is being processed
8.  Remove debug logging - Clean up console.log statements for production build
9.  Type safety improvements - Add stricter TypeScript types for date ranges and chart data
10. Extract custom hooks - Move visibility detection logic to useVisibleDateRange hook
11. Error boundaries - Add error handling for chart rendering failures
12. Zoom controls - Add minimap zoom in/out functionality for different time scales
13. Export functionality - Allow users to export date range data
14. Make axios into api utility to handle calls necessary way and reuse

# Summary

1.  Architecture: Component-Based React with Custom Hooks
2.  Core Structure:
      ActivityTimeline (main container) → ActivityMinimap + ActivityTable + CustomerSelector
      Custom hooks (useActivityData, useCustomers) handle all data fetching and state management
      Utility functions (dateUtils) for consistent date parsing across components
3.  Data Flow:
      Customer selection triggers data fetching via useActivityData hook
      ActivityTable detects visible rows → reports date range to parent
      ActivityMinimap receives visible range → highlights background accordingly
      Click navigation flows: Minimap → Timeline → Table scroll
4.  Key Implementation Decisions:
      Data Layer:
      Axios-based API client with pagination, infinite scroll, and date range fetching
      Aggressive caching and deduplication to prevent duplicate events
      Fallback strategies for missing data and failed requests
5.  UI Components:
      Recharts ComposedChart for minimap (line + bars + markers)
      Intersection Observer for infinite scroll and visibility detection
      forwardRef pattern for parent-child communication (scroll commands)
      State Management:
        Local component state with useState for UI interactions
      Custom hooks encapsulate complex data logic and API calls
      Callback-based communication between sibling components via parent
6.  Performance Optimizations:
      useMemo for expensive chart data calculations and aggregations
      useCallback for stable function references and preventing re-renders
      Debounced scroll handlers and request cancellation via AbortController
7.  Real-time Sync Implementation:
      Scroll events → visibility detection → date range calculation → minimap highlighting (BUG)
      Simplified highlighting (all-or-nothing) for reliability over precision (BUG)
      Bidirectional navigation (minimap ↔ table) with smooth scrolling and visual feedback
8.  Trade-off: 
      Chose reliability and immediate feedback over pixel-perfect accuracy to ensure the feature always works across different data scenarios.