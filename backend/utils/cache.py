"""In-memory TTL cache for API responses."""

import time


class TTLCache:
    """Simple TTL cache with per-key expiration."""

    def __init__(self, default_ttl: int = 600):
        self._store: dict[str, tuple[float, object]] = {}
        self._default_ttl = default_ttl

    def get(self, key: str) -> object | None:
        if key not in self._store:
            return None
        expires, value = self._store[key]
        if time.time() > expires:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: object, ttl: int | None = None):
        self._store[key] = (time.time() + (ttl or self._default_ttl), value)

    def clear(self):
        self._store.clear()


cache = TTLCache()
