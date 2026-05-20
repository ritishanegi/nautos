from app.services.privacy import PrivacyService


def test_strip_vessel_name():
    svc = PrivacyService()
    text = "Maintenance report for M/V Pacific Star engine room"
    result = svc.strip_master_metadata(text)
    assert "Pacific Star" not in result
    assert "[VESSEL]" in result


def test_strip_imo_number():
    svc = PrivacyService()
    text = "Vessel IMO 9274848 scheduled for inspection"
    result = svc.strip_master_metadata(text)
    assert "9274848" not in result
    assert "[IMO]" in result


def test_strip_company_name():
    svc = PrivacyService()
    text = "Report prepared by Ocean Shipping Ltd for annual audit"
    result = svc.strip_master_metadata(text, tenant_name="Ocean Shipping Ltd")
    assert "Ocean Shipping Ltd" not in result
    assert "[COMPANY]" in result
