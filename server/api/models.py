from django.db import models

# Create your models here.

class ActivityEvent(models.Model):
    """Represents a single customer-facing activity/touchpoint event."""

    # Core identifiers
    customer_org_id = models.CharField(max_length=60)
    account_id = models.CharField(max_length=50)
    touchpoint_id = models.CharField(max_length=64)

    # Timing
    # The raw JSON source stores Unix epoch milliseconds.  
    # Persist as a timezone-aware DateTime for easier querying in Django.
    timestamp = models.DateTimeField()

    # Descriptive data
    activity = models.TextField(null=True)
    channel = models.CharField(max_length=100)
    status = models.CharField(max_length=100)
    record_type = models.CharField(max_length=100)

    # Source system information
    source_record_type = models.CharField(max_length=100, null=True)
    source_record_id = models.CharField(max_length=255, null=True)

    # Campaign linkage (optional)
    campaign_id = models.CharField(max_length=255, null=True, blank=True)
    campaign_name = models.CharField(max_length=255, null=True, blank=True)

    # Direction (IN / OUT, etc.)
    direction = models.CharField(max_length=10)

    # Complex structures – leverage JSONField for flexibility
    people = models.JSONField()
    involved_team_ids = models.JSONField()
    related_opportunity_ids = models.JSONField()

    # Grouping
    activity_grouping_id = models.CharField(max_length=255, null=True)

    # Meta / dunder helpers
    class Meta:
        ordering = ["-timestamp"]
        unique_together = (
            "customer_org_id",
            "account_id",
            "touchpoint_id",
        )

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.channel} | {self.activity[:50]}... @ {self.timestamp.isoformat()}"

class Person(models.Model):
    """Represents a single person/contact belonging to a customer organisation.

    The field names match the keys present in the persons.jsonl fixture so that
    the ingestion command can simply unpack the JSON objects into the model
    constructor (e.g. ``Person(**data)``).
    """

    # Identifiers
    customer_org_id = models.CharField(max_length=60)
    id = models.CharField(max_length=64, primary_key=True)

    # Descriptive data
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email_address = models.EmailField(max_length=255)
    job_title = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        # No extra uniqueness constraints needed: `id` is the primary key.

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.first_name} {self.last_name} <{self.email_address}>"
