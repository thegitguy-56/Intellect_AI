import boto3
from botocore.config import Config

from app.core.config import get_settings

settings = get_settings()

_client = None


def get_r2_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    return _client


def download_file(key: str) -> bytes:
    client = get_r2_client()
    obj = client.get_object(Bucket=settings.r2_bucket_name, Key=key)
    return obj["Body"].read()


def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    client = get_r2_client()
    client.put_object(Bucket=settings.r2_bucket_name, Key=key, Body=data, ContentType=content_type)


def generate_presigned_get_url(key: str, expires_in: int = 3600) -> str:
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )
