# Recreate Database Pod Script
# This script provides options to recreate the database pod in Kubernetes

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("restart", "delete", "fresh")]
    [string]$Mode = "restart"
)

$Namespace = "opsguard"
$DeploymentName = "opsguard-postgres"
$LabelSelector = "app=opsguard-postgres"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Recreate Database Pod Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if kubectl is available
try {
    $kubectlVersion = kubectl version --client --short 2>&1
    Write-Host "✓ kubectl found" -ForegroundColor Green
} catch {
    Write-Host "✗ kubectl not found. Please install kubectl first." -ForegroundColor Red
    exit 1
}

# Check if namespace exists
$namespaceExists = kubectl get namespace $Namespace 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Namespace '$Namespace' not found. Please create it first:" -ForegroundColor Red
    Write-Host "  kubectl apply -f k8s/namespace.yaml" -ForegroundColor Yellow
    exit 1
}

Write-Host "Current pod status:" -ForegroundColor Yellow
kubectl get pods -n $Namespace -l $LabelSelector
Write-Host ""

switch ($Mode) {
    "restart" {
        Write-Host "Mode: Restart Pod (Auto-Recreated)" -ForegroundColor Yellow
        Write-Host "Deleting pod... (it will be automatically recreated)" -ForegroundColor Yellow
        
        kubectl delete pod -n $Namespace -l $LabelSelector
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Pod deleted. Waiting for recreation..." -ForegroundColor Green
            Write-Host ""
            Write-Host "Watching pod status (Ctrl+C to stop):" -ForegroundColor Yellow
            kubectl get pods -n $Namespace -l $LabelSelector -w
        } else {
            Write-Host "✗ Failed to delete pod" -ForegroundColor Red
            exit 1
        }
    }
    
    "delete" {
        Write-Host "Mode: Delete and Recreate Deployment" -ForegroundColor Yellow
        Write-Host "⚠️  This will delete the deployment and recreate it" -ForegroundColor Yellow
        
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "Cancelled." -ForegroundColor Yellow
            exit 0
        }
        
        Write-Host "Deleting deployment..." -ForegroundColor Yellow
        kubectl delete deployment $DeploymentName -n $Namespace
        
        Write-Host "Recreating deployment..." -ForegroundColor Yellow
        kubectl apply -f k8s/postgres-deployment.yaml
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Deployment recreated. Watching pod status..." -ForegroundColor Green
            kubectl get pods -n $Namespace -l $LabelSelector -w
        } else {
            Write-Host "✗ Failed to recreate deployment" -ForegroundColor Red
            exit 1
        }
    }
    
    "fresh" {
        Write-Host "Mode: Complete Fresh Database" -ForegroundColor Yellow
        Write-Host "⚠️  WARNING: This will delete ALL database data!" -ForegroundColor Red
        Write-Host "⚠️  This includes:" -ForegroundColor Red
        Write-Host "   - Deployment" -ForegroundColor Red
        Write-Host "   - Persistent Volume Claim (ALL DATA)" -ForegroundColor Red
        
        $confirm = Read-Host "Are you absolutely sure? Type 'DELETE ALL DATA' to confirm"
        if ($confirm -ne "DELETE ALL DATA") {
            Write-Host "Cancelled." -ForegroundColor Yellow
            exit 0
        }
        
        Write-Host "Deleting deployment..." -ForegroundColor Yellow
        kubectl delete deployment $DeploymentName -n $Namespace
        
        Write-Host "Deleting PVC (this deletes all data)..." -ForegroundColor Yellow
        kubectl delete pvc opsguard-postgres-pvc -n $Namespace
        
        Write-Host "Recreating PVC..." -ForegroundColor Yellow
        kubectl apply -f k8s/postgres-pvc.yaml
        
        Write-Host "Recreating deployment..." -ForegroundColor Yellow
        kubectl apply -f k8s/postgres-deployment.yaml
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Fresh database created. Watching pod status..." -ForegroundColor Green
            Write-Host ""
            Write-Host "⚠️  IMPORTANT: You need to run Prisma migrations now!" -ForegroundColor Yellow
            Write-Host "   kubectl exec -it -n $Namespace <app-pod> -- npx prisma migrate deploy" -ForegroundColor Cyan
            kubectl get pods -n $Namespace -l $LabelSelector -w
        } else {
            Write-Host "✗ Failed to recreate deployment" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan


