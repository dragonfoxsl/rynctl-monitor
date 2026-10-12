def test_final_admin_cannot_be_demoted(client, auth_headers):
    res = client.put("/api/users/1", json={"role": "readonly"}, headers=auth_headers)
    assert res.status_code == 409
    assert "final admin" in res.json()["detail"].lower()


def test_admin_cannot_delete_own_account(client, auth_headers):
    res = client.delete("/api/users/1", headers=auth_headers)
    assert res.status_code == 409
    assert "own account" in res.json()["detail"].lower()
