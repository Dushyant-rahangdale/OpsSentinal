{{/*
Expand the name of the chart.
*/}}
{{- define "opsknight.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "opsknight.fullname" -}}
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
{{- define "opsknight.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "opsknight.labels" -}}
helm.sh/chart: {{ include "opsknight.chart" . }}
{{ include "opsknight.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "opsknight.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opsknight.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "opsknight.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "opsknight.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL fullname
*/}}
{{- define "opsknight.postgresql.fullname" -}}
{{- printf "%s-postgresql" (include "opsknight.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
PostgreSQL service name
*/}}
{{- define "opsknight.postgresql.serviceName" -}}
{{- printf "%s-postgresql" (include "opsknight.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "opsknight.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql://%s:%s@%s:%s/%s?schema=public" .Values.postgresql.username .Values.postgresql.password (include "opsknight.postgresql.serviceName" .) .Values.postgresql.port .Values.postgresql.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:%s/%s?schema=public" .Values.postgresql.username .Values.postgresql.password .Values.postgresql.host .Values.postgresql.port .Values.postgresql.database }}
{{- end }}
{{- end }}
