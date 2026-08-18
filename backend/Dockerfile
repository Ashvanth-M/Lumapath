FROM python:3.11-slim

# libGL and libglib are needed by opencv-python-headless once ML deps are on.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# Single worker by default — raise it once model loading is per-process cheap.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
