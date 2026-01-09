{{- define "xlsform-builder.name" -}}
{{- default .Chart.name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "xlsform-builder.backendFullname" -}}
{{- printf "%s-backend" (include "xlsform-builder.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "xlsform-builder.frontendFullname" -}}
{{- printf "%s-frontend" (include "xlsform-builder.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
