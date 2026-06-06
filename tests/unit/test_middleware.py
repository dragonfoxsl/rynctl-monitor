import asyncio
import types

from starlette.responses import Response

from backend.middleware import RateLimitMiddleware


def _fake_request(ip: str):
    return types.SimpleNamespace(
        url=types.SimpleNamespace(path="/api/jobs"),
        client=types.SimpleNamespace(host=ip),
    )


async def _ok(_request):
    return Response("ok")


def test_rate_limiter_evicts_idle_ip_entries():
    mw = RateLimitMiddleware(app=None, rpm=100)

    asyncio.run(mw.dispatch(_fake_request("1.2.3.4"), _ok))
    assert "1.2.3.4" in mw._hits

    # Age the recorded hit beyond the window, then a request from another IP
    # should prune the now-idle entry instead of leaking it forever.
    mw._hits["1.2.3.4"] = [0.0]
    asyncio.run(mw.dispatch(_fake_request("5.6.7.8"), _ok))

    assert "1.2.3.4" not in mw._hits
    assert "5.6.7.8" in mw._hits
