import json
import logging
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from api.models import ActivityEvent

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------------
# Python 3.11 introduced `datetime.UTC`; fall back to `datetime.timezone.utc`.
# ----------------------------------------------------------------------------
try:
    UTC = datetime.UTC  # type: ignore[attr-defined]
except AttributeError:  # pragma: no cover -- <3.11 fallback
    UTC = dt_timezone.utc

class Command(BaseCommand):
    """Ingest ActivityEvent objects from a JSON Lines (.jsonl) file.

    Each line in the input file must be a valid JSON object whose keys map 1-to-1
    with the fields on the `ActivityEvent` model. The expected timestamp format
    is Unix epoch *milliseconds* (e.g. 1704051887123). ISO-8601 strings are also
    accepted and will be coerced into timezone-aware datetimes.
    """

    help = __doc__.strip().split("\n")[0]

    def add_arguments(self, parser):
        parser.add_argument(
            "jsonl_path",
            type=str,
            help="Path to the .jsonl file containing ActivityEvent records",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Number of rows to insert per bulk_create batch (default: 1000)",
        )
        parser.add_argument(
            "--ignore-errors",
            action="store_true",
            help="Skip lines that cannot be parsed instead of aborting the entire import.",
        )

    def handle(self, *args, **options):
        jsonl_path = Path(options["jsonl_path"])
        batch_size: int = options["batch_size"]
        ignore_errors: bool = options["ignore_errors"]

        if not jsonl_path.exists():
            raise CommandError(f"File not found: {jsonl_path}")

        self.stdout.write(
            f"Starting import from {jsonl_path} (batch size {batch_size})"
        )

        objs = []
        lines_processed = 0
        with jsonl_path.open("r", encoding="utf-8") as handle:
            for line_no, raw_line in enumerate(handle, start=1):
                raw_line = raw_line.strip()
                if not raw_line:
                    continue  # skip empty lines
                try:
                    data = json.loads(raw_line)
                    data["timestamp"] = self._parse_timestamp(data.get("timestamp"))
                    objs.append(ActivityEvent(**data))
                except Exception as exc:  # pylint: disable=broad-except
                    msg = f"Line {line_no}: {exc}"
                    if ignore_errors:
                        logger.warning(msg)
                        continue
                    raise CommandError(msg) from exc

                if len(objs) >= batch_size:
                    self._bulk_insert(objs)
                    lines_processed += len(objs)
                    objs.clear()

        if objs:
            self._bulk_insert(objs)
            lines_processed += len(objs)

        self.stdout.write(self.style.SUCCESS(f"Successfully imported {lines_processed} ActivityEvent records."))

    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------

    @staticmethod
    def _bulk_insert(objects):
        """Insert objects inside a transaction to ensure atomicity."""
        with transaction.atomic():
            ActivityEvent.objects.bulk_create(objects, ignore_conflicts=False)

    @staticmethod
    def _parse_timestamp(raw):
        """Convert timestamp from various formats into an aware datetime."""
        if raw is None:
            raise ValueError("'timestamp' field is required")

        # Epoch milliseconds -> datetime
        if isinstance(raw, (int, float)):
            return datetime.fromtimestamp(raw / 1000.0, tz=UTC)

        # ISO-8601 string -> datetime
        if isinstance(raw, str):
            try:
                # Python 3.11: fromisoformat handles offsets; we rely on that.
                dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValueError(
                    "Unable to parse timestamp string; expected ISO-8601 or epoch ms"
                ) from exc

            # Ensure timezone aware
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, UTC)
            return dt

        raise TypeError(f"Unsupported timestamp type: {type(raw)}") 