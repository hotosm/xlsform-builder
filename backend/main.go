package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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

type ConvertRequest struct {
	FormURL string `json:"formUrl"`
}

type ConvertResponse struct {
	XFormURL string `json:"xformUrl"`
}

type PyxformResponse struct {
	Result   string      `json:"result"`
	Error    interface{} `json:"error"`
	Itemsets interface{} `json:"itemsets"`
}

var (
	s3Client           *s3.Client
	prodS3Client       *s3.Client
	bucketName         string
	region             string
	s3Endpoint         string
	s3ExternalEndpoint string
	usePathStyle       bool
)

func main() {
	bucketName = getEnv("S3_BUCKET_NAME", "xlsforms")
	region = getEnv("AWS_REGION", "us-east-1")
	s3Endpoint = os.Getenv("S3_ENDPOINT")
	s3ExternalEndpoint = getEnv("S3_EXTERNAL_ENDPOINT", s3Endpoint)
	usePathStyle = getEnv("USE_PATH_STYLE", "false") == "true"
	port := getEnv("PORT", "3001")

	if err := initS3Client(); err != nil {
		log.Fatalf("Failed to initialize S3 client: %v", err)
	}

	if err := initProdS3Client(); err != nil {
		log.Fatalf("Failed to initialize production S3 client: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthCheckHandler)
	mux.HandleFunc("/api/presigned-url", presignedUploadURLHandler)
	mux.HandleFunc("/api/presigned-download-url", presignedDownloadURLHandler)
	mux.HandleFunc("/api/convert", convertXLSFormHandler)

	c := cors.New(cors.Options{
		AllowedOrigins:   strings.Split(getEnv("ALLOWED_ORIGINS", "*"), ","),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"*"},
		AllowCredentials: false,
		MaxAge:           3600,
	})

	handler := c.Handler(mux)

	log.Printf("Starting server on port %s", port)
	log.Printf("S3 Bucket: %s", bucketName)
	log.Printf("S3 Region: %s", region)
	if s3Endpoint != "" {
		log.Printf("Local uploads: S3-compatible storage at %s", s3Endpoint)
		if s3ExternalEndpoint != s3Endpoint {
			log.Printf("S3 external endpoint: %s", s3ExternalEndpoint)
		}
	}
	log.Printf("Converted XML files: Production AWS S3")

	if err := http.ListenAndServe(":"+port, handler); err != nil {
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
		if s3Endpoint != "" {
			o.BaseEndpoint = aws.String(s3Endpoint)
		}
		o.UsePathStyle = usePathStyle
	})

	return nil
}

func initProdS3Client() error {
	ctx := context.Background()
	prodAccessKeyID := os.Getenv("PROD_AWS_ACCESS_KEY_ID")
	prodSecretAccessKey := os.Getenv("PROD_AWS_SECRET_ACCESS_KEY")

	if prodAccessKeyID == "" || prodSecretAccessKey == "" {
		return fmt.Errorf("PROD_AWS_ACCESS_KEY_ID and PROD_AWS_SECRET_ACCESS_KEY are required")
	}

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			prodAccessKeyID,
			prodSecretAccessKey,
			"",
		)),
	)

	if err != nil {
		return fmt.Errorf("unable to load production SDK config: %w", err)
	}

	prodS3Client = s3.NewFromConfig(cfg)

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
		if s3ExternalEndpoint != "" {
			po.ClientOptions = append(po.ClientOptions, func(o *s3.Options) {
				o.BaseEndpoint = aws.String(s3ExternalEndpoint)
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
	if s3ExternalEndpoint != "" {
		fileURL = fmt.Sprintf("%s/%s/%s", s3ExternalEndpoint, bucketName, s3Key)
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
		if s3ExternalEndpoint != "" {
			po.ClientOptions = append(po.ClientOptions, func(o *s3.Options) {
				o.BaseEndpoint = aws.String(s3ExternalEndpoint)
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

func convertXLSFormHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req ConvertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.FormURL == "" {
		respondWithError(w, http.StatusBadRequest, "formUrl is required")
		return
	}

	xlsformData, filename, err := downloadFile(req.FormURL)
	if err != nil {
		log.Printf("Failed to download XLSForm: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to download form")
		return
	}

	xformXML, err := convertToXForm(xlsformData, filename)
	if err != nil {
		log.Printf("Failed to convert XLSForm: %v", err)
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Conversion failed: %v", err))
		return
	}

	xmlFilename := strings.TrimSuffix(filename, filepath.Ext(filename)) + ".xml"
	xmlURL, err := uploadXFormToS3([]byte(xformXML), xmlFilename)
	if err != nil {
		log.Printf("Failed to upload XForm to S3: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to upload converted form")
		return
	}

	response := ConvertResponse{
		XFormURL: xmlURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func downloadFile(url string) ([]byte, string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	filename := filepath.Base(url)
	if idx := strings.Index(filename, "?"); idx != -1 {
		filename = filename[:idx]
	}

	ext := filepath.Ext(filename)
	if ext == "" {
		filename = filename + ".xlsx"
	} else if ext != ".xlsx" && ext != ".xls" && ext != ".xlsm" {
		filename = strings.TrimSuffix(filename, ext) + ".xlsx"
	}

	log.Printf("Downloaded file: %s (%d bytes)", filename, len(data))

	return data, filename, nil
}

func convertToXForm(xlsformData []byte, filename string) (string, error) {
	log.Printf("Converting XLSForm: %s (%d bytes)", filename, len(xlsformData))

	if len(xlsformData) < 4 {
		return "", fmt.Errorf("file too small: %d bytes", len(xlsformData))
	}
	if xlsformData[0] != 0x50 || xlsformData[1] != 0x4B {
		log.Printf("Warning: File doesn't appear to be a ZIP/XLSX (first bytes: %x %x)", xlsformData[0], xlsformData[1])
	}

	converterURL := getEnv("PYXFORM_URL", "http://pyxform:80/api/v1/convert")
	log.Printf("Calling converter at: %s with filename: %s", converterURL, filename)

	req, err := http.NewRequest("POST", converterURL, bytes.NewReader(xlsformData))
	if err != nil {
		return "", err
	}

	ext := strings.ToLower(filepath.Ext(filename))
	var contentType string
	switch ext {
	case ".xlsx":
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case ".xls":
		contentType = "application/vnd.ms-excel"
	default:
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	}

	req.Header.Set("Content-Type", contentType)
	req.Header.Set("X-XlsForm-FormId-Fallback", strings.TrimSuffix(filename, filepath.Ext(filename)))

	log.Printf("Request Content-Type: %s", contentType)
	log.Printf("Request size: %d bytes", len(xlsformData))

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("conversion failed (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var pyxformResp PyxformResponse
	if err := json.Unmarshal(body, &pyxformResp); err != nil {
		return "", fmt.Errorf("failed to parse pyxform response: %w", err)
	}

	if pyxformResp.Error != nil {
		return "", fmt.Errorf("pyxform error: %v", pyxformResp.Error)
	}

	if pyxformResp.Result == "" {
		return "", fmt.Errorf("empty result from pyxform")
	}

	return pyxformResp.Result, nil
}

func uploadXFormToS3(xmlData []byte, filename string) (string, error) {
	ctx := context.Background()

	// Default to production folder (xforms/) unless explicitly set to development
	env := getEnv("ENVIRONMENT", "production")
	var s3Key string
	if env == "development" {
		s3Key = fmt.Sprintf("xforms/staging/%s", filename)
	} else {
		s3Key = fmt.Sprintf("xforms/%s", filename)
	}

	_, err := prodS3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(s3Key),
		Body:        bytes.NewReader(xmlData),
		ContentType: aws.String("application/xml"),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to production S3: %w", err)
	}

	fileURL := fmt.Sprintf("https://%s.s3.amazonaws.com/%s", bucketName, s3Key)

	log.Printf("Uploaded XForm to production S3 (%s): %s", env, fileURL)
	return fileURL, nil
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
