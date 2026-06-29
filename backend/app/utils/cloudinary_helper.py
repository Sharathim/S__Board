import io
import logging
import cloudinary.uploader

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOC_TYPES = {"application/pdf", "application/msword",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def upload_file(file, folder="dpms"):
    """Upload a file to Cloudinary. Returns dict with url, type, name."""
    if not file:
        return None

    content_type = file.content_type
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        raise ValueError("File too large. Max 10MB.")

    if content_type in ALLOWED_IMAGE_TYPES:
        file_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        file_type = "video"
    else:
        file_type = "document"

    # Read file into bytes then wrap in BytesIO for reliable Cloudinary upload
    file_bytes = file.read()
    file_obj = io.BytesIO(file_bytes)

    logger.info("Uploading to Cloudinary: name=%s, size=%d, type=%s, folder=%s",
                file.filename, size, content_type, folder)

    try:
        result = cloudinary.uploader.upload(
            file_obj,
            folder=folder,
            resource_type="auto",
        )
    except Exception as e:
        logger.error("Cloudinary upload failed: %s", str(e))
        raise

    logger.info("Cloudinary upload success: public_id=%s", result.get("public_id"))

    return {
        "url": result["secure_url"],
        "type": file_type,
        "name": file.filename,
        "public_id": result["public_id"],
    }


def delete_file(public_id, resource_type="image"):
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
