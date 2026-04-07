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

{{- define "xlsform-builder.pyxformFullname" -}}
{{- printf "%s-pyxform" (include "xlsform-builder.fullname" .) -}}
{{- end -}}

{{- define "xlsform-builder.llamaFullname" -}}
{{- printf "%s-llama" (include "xlsform-builder.fullname" .) -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "xlsform-builder.labels" -}}
helm.sh/chart: {{ include "xlsform-builder.name" . }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "xlsform-builder.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "xlsform-builder.selectorLabels" -}}
app.kubernetes.io/name: {{ include "xlsform-builder.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
