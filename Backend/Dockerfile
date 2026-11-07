# Sử dụng base image chính thức của Microsoft Playwright Python
# Đã cài sẵn Python, Chromium và các thư viện hệ thống cần thiết cho Playwright
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    HOST=0.0.0.0

# Cài đặt dependencies Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Cài đặt Chromium browser cho Playwright
RUN playwright install chromium

# Copy toàn bộ mã nguồn backend
COPY . .

# Tạo các thư mục lưu trữ dữ liệu
RUN mkdir -p /app/data /app/exports /app/uploads

EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
