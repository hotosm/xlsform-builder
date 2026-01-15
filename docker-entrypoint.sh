#!/bin/sh
set -e

# Generate runtime config.js from environment variables
cat > /usr/share/nginx/html/config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-https://api.xlsforms.field.hotosm.org}",
  VITE_METADATA_URL: "${VITE_METADATA_URL:-https://xlsforms.s3.amazonaws.com/metadata.json}"
};
EOF

# Start nginx
exec nginx -g "daemon off;"
