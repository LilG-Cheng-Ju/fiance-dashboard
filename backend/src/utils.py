from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class TTLCache:
    def __init__(self, ttl_seconds: int = 60, max_size: int = 1000):
        self.ttl = timedelta(seconds=ttl_seconds)
        self.max_size = max_size
        self._cache: Dict[str, tuple] = {}

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None

        data, expire_time = self._cache[key]

        if datetime.now() > expire_time:
            del self._cache[key]
            return None
        
        return data

    def set(self, key: str, value: Any):
        if len(self._cache) >= self.max_size and key not in self._cache:
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]

        expire_time = datetime.now() + self.ttl
        self._cache[key] = (value, expire_time)

    def clear(self):
        self._cache.clear()