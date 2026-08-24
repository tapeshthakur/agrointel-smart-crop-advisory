from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Tuple

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError


ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG"}
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_SIZE: Tuple[int, int] = (224, 224)


class LeafDiseaseUploadError(ValueError):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class PreparedLeafImage:
    image_bytes: bytes
    original_format: str
    width: int
    height: int
    batch: np.ndarray


def extension_for(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def validate_uploaded_image(filename: str | None, image_bytes: bytes) -> None:
    if not image_bytes:
        raise LeafDiseaseUploadError(
            "empty_file",
            "Uploaded file is empty.",
            400,
        )

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise LeafDiseaseUploadError(
            "file_too_large",
            "Leaf image must be 5 MB or smaller.",
            413,
        )

    if extension_for(filename) not in ALLOWED_EXTENSIONS:
        raise LeafDiseaseUploadError(
            "wrong_format",
            "Only JPG, JPEG, and PNG leaf images are supported.",
            415,
        )


def _open_verified_image(image_bytes: bytes) -> Image.Image:
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            image_format = probe.format
            probe.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise LeafDiseaseUploadError(
            "corrupt_image",
            "Uploaded file is not a readable image.",
            400,
        ) from exc

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise LeafDiseaseUploadError(
            "wrong_format",
            "Image content must be a real JPG or PNG file.",
            415,
        )

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.format = image_format
        return ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise LeafDiseaseUploadError(
            "corrupt_image",
            "Uploaded image could not be decoded.",
            400,
        ) from exc


def prepare_leaf_image(filename: str | None, image_bytes: bytes) -> PreparedLeafImage:
    validate_uploaded_image(filename, image_bytes)
    image = _open_verified_image(image_bytes)

    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA")

    if image.mode == "RGBA":
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        image = Image.alpha_composite(background, image).convert("RGB")
    else:
        image = image.convert("RGB")

    width, height = image.size
    resized = image.resize(IMAGE_SIZE)
    # MobileNetV2 preprocessing is built into the training graph by default.
    # Keep the request-time tensor in the same 0..255 float32 scale.
    batch = np.expand_dims(np.asarray(resized, dtype=np.float32), axis=0)
    return PreparedLeafImage(
        image_bytes=image_bytes,
        original_format=str(image.format or ""),
        width=width,
        height=height,
        batch=batch,
    )

