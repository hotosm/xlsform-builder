FROM golang:1.21 AS build
WORKDIR /code
COPY go.mod ./
RUN go mod download
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /code/backend .

FROM gcr.io/distroless/static-debian13:nonroot
WORKDIR /code
COPY --from=build /code/backend /code/backend
ENTRYPOINT ["/code/backend"]
