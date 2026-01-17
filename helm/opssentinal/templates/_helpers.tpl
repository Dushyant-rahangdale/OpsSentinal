{{/*
Expand the name of the chart.
*/}}
{{- define "opssentinal.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "opssentinal.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "opssentinal.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "opssentinal.labels" -}}
helm.sh/chart: {{ include "opssentinal.chart" . }}
{{ include "opssentinal.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "opssentinal.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opssentinal.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "opssentinal.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "opssentinal.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL fullname
*/}}
{{- define "opssentinal.postgresql.fullname" -}}
{{- printf "%s-postgresql" (include "opssentinal.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
PostgreSQL service name
*/}}
{{- define "opssentinal.postgresql.serviceName" -}}
{{- printf "%s-postgresql" (include "opssentinal.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "opssentinal.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql://%s:%s@%s:%s/%s?schema=public" .Values.postgresql.username .Values.postgresql.password (include "opssentinal.postgresql.serviceName" .) .Values.postgresql.port .Values.postgresql.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:%s/%s?schema=public" .Values.postgresql.username .Values.postgresql.password .Values.postgresql.host .Values.postgresql.port .Values.postgresql.database }}
{{- end }}
{{- end }}
