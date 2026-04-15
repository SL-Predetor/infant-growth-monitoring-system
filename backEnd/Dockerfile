# Use the official Python 3.9 slim image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Install system dependencies required for OpenCV and other ML libraries
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY backEnd/requirements.txt ./backEnd/

# Install Python dependencies
# Using --no-cache-dir to keep the image size smaller
RUN pip install --no-cache-dir -r backEnd/requirements.txt

# Copy the backend code and models into the container
COPY backEnd/ ./backEnd/
COPY mlModels/ ./mlModels/

# Change working directory so uvicorn can find app:app easily
WORKDIR /app/backEnd

# Expose the API port
EXPOSE 8000

# Command to run the FastAPI application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
