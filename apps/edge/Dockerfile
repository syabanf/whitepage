# Build context = repo root (the Go module spans the whole repo).
#   docker build -f apps/edge/Dockerfile -t cms-edge .
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/edge ./apps/edge/cmd/edge

FROM alpine:3.20
RUN apk add --no-cache ca-certificates && mkdir -p /certs
COPY --from=build /out/edge /usr/local/bin/edge
# 80 = ACME HTTP-01 challenge + HTTP→HTTPS redirect; 443 = TLS.
EXPOSE 80 443
ENV TLS_MODE=acme \
    HTTPS_ADDR=:443 \
    HTTP_ADDR=:80 \
    CERT_CACHE_DIR=/certs
ENTRYPOINT ["edge"]
