# Build context = repo root.
#   docker build -f apps/api/Dockerfile -t cms-api .
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/api ./apps/api/cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/api /api
EXPOSE 8080
ENV API_HOST=0.0.0.0 API_PORT=8080 API_ENV=production
ENTRYPOINT ["/api"]
