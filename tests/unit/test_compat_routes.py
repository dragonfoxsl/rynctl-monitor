def test_metrics_routes_exist(client):
    assert client.get("/metrics").status_code == 200
    assert client.get("/api/metrics").status_code == 200


def test_backup_routes_exist(client, auth_headers):
    assert client.get("/api/backup").status_code == 200
    assert client.get("/api/backup/download").status_code == 200
