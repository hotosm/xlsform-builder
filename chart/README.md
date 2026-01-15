# XLSForm Builder Helm Chart

This Helm chart deploys the XLSForm Builder application,
consisting of a backend API service, a frontend web application, and
a pyxform-http service for XLSForm to XForm conversion.

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

**Note:** In production deployments, the same credentials are used for both
regular sets of S3 credentials (XLSForm upload and staging XForms). The separation
between these variables is only used during development alongside MinIO.

Or a sealed secret:

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
AWS credential chain if credentials are not provided. However, the backend
requires `PROD_AWS_ACCESS_KEY_ID` and `PROD_AWS_SECRET_ACCESS_KEY` environment
variables to be set. In production deployments, these are automatically set
to the same values as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from
the secret. The separation is only needed for local development.

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
- `image.pyxform.tag`: Pyxform-http image tag (default: `latest`)
- `frontend.env.apiUrl`: Backend API URL for frontend to use (default: `https://api.xlsforms.field.hotosm.org`)
- `frontend.env.metadataUrl`: S3 metadata.json URL (default: `https://xlsforms.s3.amazonaws.com/metadata.json`)
- `pyxform.healthCheck.enabled`: Enable health checks for pyxform service (default: `false`)
- `pyxform.healthCheck.path`: Health check path (default: `/`)

**Note:** The frontend uses runtime configuration injected via environment variables.
These are used to generate a `config.js` file at container startup, allowing the
frontend to work with different API URLs without rebuilding the image.

**Note:** The backend automatically connects to the pyxform service via the
`PYXFORM_URL` environment variable, which is set to the pyxform service URL
based on the Helm release name.

See `values.yaml` for all available options.
