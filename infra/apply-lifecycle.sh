aws --profile admin s3api put-bucket-lifecycle-configuration \
  --bucket xlsforms \
  --lifecycle-configuration file://lifecycle.json
