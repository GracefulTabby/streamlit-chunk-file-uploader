# Dockerfile

FROM python:3.8-slim

# Streamlit specific
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8

# Install necessary packages
RUN apt-get update && \
    apt-get install -y libgl1-mesa-glx && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Install additional wheel file
RUN pip install streamlit-chunk-file-uploader

# Copy the Streamlit app
COPY app /app

# Expose the Streamlit port
EXPOSE 8501

# Run Streamlit
CMD ["streamlit", "run", "/app/main.py"]