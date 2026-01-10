# XLSForm Builder Helm Chart

This Helm chart deploys the XLSForm Builder application,
consisting of a backend API service and a frontend web application.

## Prerequisites

- Kubernetes cluster (1.24+)
- Helm 3.x
- `cert-manager` installed with a `letsencrypt-prod` ClusterIssuer
- `external-dns` installed and configured

## Secret Configuration

### Create Kubernetes Secret for S3 Credentials

The backend requires AWS S3 credentials to access the storage bucket.
Create a secret with your S3 credentials:

```bash
kubectl create secret generic xlsforms-s3-creds \
  --from-literal=AWS_ACCESS_KEY_ID=your-access-key-id \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret-access-key \
  --namespace=field
```

Or a sealed secret:

```bash
Create sealed-secret:

```bash
kubectl create secret generic xlsforms-s3-creds \
  --from-literal=AWS_ACCESS_KEY_ID=your-access-key-id \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret-access-key \
  --namespace=field \
  --dry-run=client -o yaml > secret.yaml

kubeseal -f secret.yaml -w sealed-secret.yaml
```

**Note:** If using AWS IAM roles (IRSA) or instance profiles,
you may not need this secret. The backend will use the default
AWS credential chain if credentials are not provided.

### Configure Backend to Use Secret

In your `values.yaml` or custom values file:

```yaml
backend:
  secrets:
    enabled: true
    secretName: xlsforms-s3-creds
  env:
    s3BucketName: xlsforms
    awsRegion: us-east-1
    s3Endpoint: ""  # Leave empty for AWS S3
    s3ExternalEndpoint: ""  # Public URL for S3 bucket
    usePathStyle: "false"  # Set to "true" for S3-compatible storage
```

## Installation

```bash
# Create namespace
kubectl create namespace field

# Install chart
helm install xlsform-builder ./chart \
  --namespace field \
  --values values-custom.yaml
```

## Configuration

Key configuration values:

- `ingress.frontend.hostname`: Frontend hostname (default: `xlsforms.field.hotosm.org`)
- `ingress.backend.hostname`: Backend API hostname (default: `api.xlsforms.field.hotosm.org`)
- `image.backend.tag`: Backend image tag
- `image.frontend.tag`: Frontend image tag

See `values.yaml` for all available options.
