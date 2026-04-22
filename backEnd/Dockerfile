# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

WORKDIR /app

# System libs required for OpenCV / TF / video processing
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY backEnd/requirements.txt ./backEnd/

# Install all Python deps from PyPI
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
      --timeout 600 \
      --retries 10 \
      -r backEnd/requirements.txt

COPY backEnd/ ./backEnd/
COPY mlModels/ ./mlModels/

WORKDIR /app/backEnd
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
