package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/rs/cors"
)

type PreSignedURLRequest struct {
	FileName string `json:"fileName"`
	FileType string `json:"fileType"`
}

type PreSignedURLResponse struct {
	UploadURL string `json:"uploadUrl"`
	FileURL   string `json:"fileUrl"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type PreSignedDownloadRequest struct {
	FileName string `json:"fileName"`
}

type PreSignedDownloadResponse struct {
	DownloadURL string `json:"downloadUrl"`
}

var (
	s3Client        *s3.Client
	bucketName      string
	region          string
	minioEndpoint   string  
	minioPublicURL  string 
	usePathStyle    bool
)

func main() {
	bucketName = getEnv("S3_BUCKET_NAME", "xlsforms")
	region = getEnv("AWS_REGION", "us-east-1")
	minioEndpoint = os.Getenv("MINIO_ENDPOINT")      
	minioPublicURL = os.Getenv("MINIO_PUBLIC_URL")   
	usePathStyle = getEnv("USE_PATH_STYLE", "false") == "true"
	port := getEnv("PORT", "3000")

	if err := initS3Client(); err != nil {
		log.Fatalf("Failed to initialize S3 client: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthCheckHandler)
	mux.HandleFunc("/api/presigned-url", presignedUploadURLHandler)
	mux.HandleFunc("/api/presigned-download-url", presignedDownloadURLHandler)

	// TODO: Restrict origins in production via ALLOWED_ORIGINS env var
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"*"},
		AllowCredentials: false,
		MaxAge:           3600,
	})

	handler := c.Handler(mux)

	log.Printf("Starting server on port %s", port)
	log.Printf("Bucket: %s", bucketName)
	log.Printf("Region: %s", region)
	if minioEndpoint != "" {
		log.Printf("Using MinIO at: %s", minioEndpoint)
	} else {
		log.Printf("Using AWS S3")
	}

	if err := http.ListenAndServe(":" + port, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func initS3Client() error {
	ctx := context.Background()
	accessKeyID := os.Getenv("AWS_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	var cfg aws.Config
	var err error

	if accessKeyID != "" && secretAccessKey != "" {
		cfg, err = config.LoadDefaultConfig(ctx,
			config.WithRegion(region),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				accessKeyID,
				secretAccessKey,
				"",
			)),
		)
	} else {
		cfg, err = config.LoadDefaultConfig(ctx,
			config.WithRegion(region),
		)
	}

	if err != nil {
		return fmt.Errorf("unable to load SDK config: %w", err)
	}

	s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		if minioEndpoint != "" {
			o.BaseEndpoint = aws.String(minioEndpoint)
		}
		o.UsePathStyle = usePathStyle
	})

	return nil
}


func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"bucket": bucketName,
		"region": region,
	})
}

func presignedUploadURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req PreSignedURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.FileName == "" {
		respondWithError(w, http.StatusBadRequest, "fileName is required")
		return
	}

	fileName := filepath.Base(req.FileName)
	s3Key := fileName

	presignClient := s3.NewPresignClient(s3Client, func(po *s3.PresignOptions) {
		if minioPublicURL != "" {
			po.ClientOptions = append(po.ClientOptions, func(o *s3.Options) {
				o.BaseEndpoint = aws.String(minioPublicURL)
			})
		}
	})

	presignedRequest, err := presignClient.PresignPutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(s3Key),
		ContentType: aws.String(req.FileType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(15 * time.Minute)
	})

	if err != nil {
		log.Printf("Failed to generate presigned URL: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate presigned URL")
		return
	}

	var fileURL string
	if minioPublicURL != "" {
		fileURL = fmt.Sprintf("%s/%s/%s", minioPublicURL, bucketName, s3Key)
	} else {
		fileURL = fmt.Sprintf("https://%s.s3.amazonaws.com/%s", bucketName, s3Key)
	}

	response := PreSignedURLResponse{
		UploadURL: presignedRequest.URL,
		FileURL:   fileURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func presignedDownloadURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req PreSignedDownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.FileName == "" {
		respondWithError(w, http.StatusBadRequest, "fileName is required")
		return
	}

	fileName := filepath.Base(req.FileName)
	s3Key := fileName

	presignClient := s3.NewPresignClient(s3Client, func(po *s3.PresignOptions) {
		if s3Endpoint != "" {
			externalEndpoint := getEnv("S3_EXTERNAL_ENDPOINT", s3Endpoint)
			po.ClientOptions = append(po.ClientOptions, func(o *s3.Options) {
				o.BaseEndpoint = aws.String(externalEndpoint)
			})
		}
	})

	presignedRequest, err := presignClient.PresignGetObject(context.Background(), &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(s3Key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(1 * time.Hour)
	})

	if err != nil {
		log.Printf("Failed to generate presigned download URL: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate presigned download URL")
		return
	}

	response := PreSignedDownloadResponse{
		DownloadURL: presignedRequest.URL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
