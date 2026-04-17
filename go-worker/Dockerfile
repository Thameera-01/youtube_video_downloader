FROM golang:alpine
RUN pip3 install yt-dlp --break-system-packages
# get the cord insard
WORKDIR /app
COPY . .
RUN go build -o worker .
CMD ["./worker"]