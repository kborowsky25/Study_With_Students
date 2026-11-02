"""JSON encoding: ISO-8601 datetimes and numeric decimals across every endpoint."""
from datetime import date, datetime
from decimal import Decimal

from flask.json.provider import DefaultJSONProvider


class ApiJSONProvider(DefaultJSONProvider):
    sort_keys = False

    @staticmethod
    def default(o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        return DefaultJSONProvider.default(o)
