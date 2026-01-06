# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY engine/go.mod engine/go.sum ./
RUN go mod download

# Copy the source code
COPY engine/ .

# Build the engine
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/veil ./cmd/main.go

# Final stage
FROM alpine:latest

WORKDIR /root/

# Copy the binary from the builder
COPY --from=builder /app/bin/veil .

# Run the engine (Wait for JSON-RPC over stdin)
ENTRYPOINT ["./veil"]
