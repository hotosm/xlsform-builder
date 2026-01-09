{{- define "xlsform-builder.name" -}}
{{- default .Chart.Name .Values.nameOverride -}}
{{- end -}}

{{- define "xlsform-builder.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "xlsform-builder.backendFullname" -}}
{{- printf "%s-backend" (include "xlsform-builder.fullname" .) -}}
{{- end -}}

{{- define "xlsform-builder.frontendFullname" -}}
{{- printf "%s-frontend" (include "xlsform-builder.fullname" .) -}}
{{- end -}}
