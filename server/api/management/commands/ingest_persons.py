import json
import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Person

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Ingest Person objects from a JSON Lines (.jsonl) file.

    Each line in the input file must be a valid JSON object whose keys map 1-to-1
    with the fields on the ``Person`` model. See ``server/data/persons.jsonl`` for
    an example fixture.
    """

    help = __doc__.strip().split("\n")[0]

    def add_arguments(self, parser):
        parser.add_argument(
            "jsonl_path",
            type=str,
            help="Path to the .jsonl file containing Person records",
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
            help=(
                "Skip lines that cannot be parsed instead of aborting the entire import.",
            ),
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
                    objs.append(Person(**data))
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

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully imported {lines_processed} Person records."
            )
        )

    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------

    @staticmethod
    def _bulk_insert(objects):
        """Insert objects inside a transaction to ensure atomicity."""
        with transaction.atomic():
            # We do *not* ignore conflicts here so that the caller is notified
            # about duplicate primary keys or unique constraint violations.
            Person.objects.bulk_create(objects, ignore_conflicts=False) 