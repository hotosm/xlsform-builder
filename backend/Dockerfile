FROM golang:1.27 AS build
WORKDIR /code
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /code/backend .

FROM gcr.io/distroless/static-debian13:nonroot AS release
WORKDIR /code
COPY --from=build /code/backend /code/backend
ENTRYPOINT ["/code/backend"]
