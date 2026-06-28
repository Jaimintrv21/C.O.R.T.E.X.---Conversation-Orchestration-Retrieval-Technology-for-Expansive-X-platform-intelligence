import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.connectors import CONNECTOR_REGISTRY
from app.services.connector_import_service import ConnectorImportService
from app.services.connector_export_service import ConnectorExportService
from fastapi import HTTPException


@pytest.fixture
def mock_storage():
    with patch("app.services.connector_import_service.StorageService") as mock:
        yield mock


@pytest.fixture
def mock_firestore():
    with patch("app.services.connector_import_service.FirestoreStore") as mock_fs:
        yield mock_fs


@pytest.fixture
def mock_celery_import():
    with patch("app.services.connector_import_service.run_connector_import.delay") as mock:
        yield mock


@pytest.fixture
def mock_celery_export():
    with patch("app.services.connector_export_service.run_connector_export.delay") as mock:
        yield mock


@pytest.mark.asyncio
@pytest.mark.parametrize("connector_id", ["chatgpt", "claude", "gemini"])
async def test_connector_import_service_success(
    connector_id, mock_storage, mock_firestore, mock_celery_import
):
    service = ConnectorImportService()
    
    # Mock firestore create_import_record
    mock_store_inst = mock_firestore.return_value
    mock_store_inst.create_import_record.return_value = {"id": "test_import_id"}
    
    # Mock parser detect_format to return True (we patch detect_provider)
    with patch("app.services.connector_import_service.detect_provider") as mock_detect:
        mock_parser = MagicMock()
        mock_parser.slug = CONNECTOR_REGISTRY[connector_id].file_import_parser
        mock_parser.detect_format.return_value = True
        mock_detect.return_value = mock_parser
        
        result = await service.import_file(
            user_id="user123",
            connector_id=connector_id,
            filename="test.zip",
            file_content=b"dummy_data"
        )
        
    assert result == {"import_id": "test_import_id"}
    
    mock_store_inst.create_import_record.assert_called_once_with(
        user_id="user123",
        connector_id=connector_id,
        filename="test.zip",
        file_size_bytes=10
    )
    
    mock_storage_inst = mock_storage.return_value
    mock_storage_inst.store_bytes.assert_called_once()
    
    mock_celery_import.assert_called_once_with(
        import_id="test_import_id",
        user_id="user123",
        connector_id=connector_id,
        parser_slug=mock_parser.slug,
        file_key=f"imports/user123/{connector_id}/test_import_id/test.zip"
    )


@pytest.mark.asyncio
async def test_connector_import_service_invalid_connector():
    service = ConnectorImportService()
    with pytest.raises(HTTPException) as exc_info:
        await service.import_file(
            user_id="user123",
            connector_id="invalid_connector",
            filename="test.zip",
            file_content=b"dummy_data"
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_connector_import_service_unsupported_method():
    service = ConnectorImportService()
    # grok does not support file_import
    with pytest.raises(HTTPException) as exc_info:
        await service.import_file(
            user_id="user123",
            connector_id="grok",
            filename="test.zip",
            file_content=b"dummy_data"
        )
    assert exc_info.value.status_code == 400
    assert "does not support file import" in exc_info.value.detail


@pytest.mark.asyncio
@pytest.mark.parametrize("connector_id", ["chatgpt", "claude", "gemini"])
async def test_connector_export_service_success(connector_id, mock_celery_export):
    with patch("app.services.connector_export_service.FirestoreStore") as mock_fs:
        mock_store_inst = mock_fs.return_value
        mock_store_inst.create_job.return_value = {"id": "test_job_id"}
        
        service = ConnectorExportService()
        result = await service.export_connector_data(
            user_id="user123",
            connector_id=connector_id,
            format="markdown_zip"
        )
        
    assert result == {"job_id": "test_job_id"}
    
    mock_store_inst.create_job.assert_called_once_with(
        user_id="user123",
        workspace_id=None,
        job_type="connector_export",
        payload={"connector_id": connector_id, "format": "markdown_zip"}
    )
    
    mock_celery_export.assert_called_once_with(
        job_id="test_job_id",
        user_id="user123",
        connector_id=connector_id,
        format="markdown_zip"
    )
