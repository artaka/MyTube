FROM python:3.11-slim

# Настройки окружения
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Устанавливаем зависимости для скачивания FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends wget xz-utils && \
    rm -rf /var/lib/apt/lists/*

# Скачиваем и устанавливаем статический билд FFmpeg
RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xf ffmpeg-release-amd64-static.tar.xz && \
    mv ffmpeg-*-static/ffmpeg /usr/local/bin/ && \
    mv ffmpeg-*-static/ffprobe /usr/local/bin/ && \
    rm -rf ffmpeg-*-static*

WORKDIR /app

# Сначала копируем зависимости (чтобы докер кэшировал этот шаг и не переустанавливал библиотеки при изменении кода)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем всё содержимое папки video_service в /app контейнера
COPY . .