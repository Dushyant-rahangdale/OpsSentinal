# deploy.ps1
Write-Host "Deploying OpsSentinal to Kubernetes..." -ForegroundColor Cyan

# Check for kubectl
if (-not (Get-Command "kubectl" -ErrorAction SilentlyContinue)) {
    Write-Error "[ERROR] kubectl is not installed or not in your PATH."
    exit 1
}

# Apply manifests using Kustomize
Write-Host "Applying manifests from k8s/..." -ForegroundColor Yellow
kubectl apply -k k8s/

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment applied successfully!" -ForegroundColor Green
    Write-Host "Wait for pods to be ready: kubectl get pods -n opssentinal -w" -ForegroundColor Gray
}
else {
    Write-Error "[ERROR] Deployment failed."
    exit 1
}
