import cloudinary.uploader

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOC_TYPES = {"application/pdf", "application/msword",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def upload_file(file, folder="dpms"):
    """Upload a file to Cloudinary. Returns dict with url, type, name."""
    if not file:
        return None

    content_type = file.content_type
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        raise ValueError("File too large. Max 50MB.")

    if content_type in ALLOWED_IMAGE_TYPES:
        resource_type = "image"
        file_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        resource_type = "video"
        file_type = "video"
    elif content_type in ALLOWED_DOC_TYPES:
        resource_type = "raw"
        file_type = "document"
    else:
        raise ValueError(f"File type {content_type} not allowed.")

    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type=resource_type,
    )
    return {
        "url": result["secure_url"],
        "type": file_type,
        "name": file.filename,
        "public_id": result["public_id"],
    }


def delete_file(public_id, resource_type="image"):
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
