# Kubernetes Deployment Guide

Deploy OpsGuard to Kubernetes for production-grade orchestration.

## Prerequisites

- **Kubernetes cluster** (v1.24+)
  - Minikube, kind, or cloud provider (GKE, EKS, AKS)
- **kubectl** installed and configured
- **Docker** for building images
- **Container registry** access (Docker Hub, ECR, GCR, etc.)

## Quick Start

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t opsguard:v1.0.0 .

# Tag for your registry
docker tag opsguard:v1.0.0 your-registry.com/opsguard:v1.0.0

# Push to registry
docker push your-registry.com/opsguard:v1.0.0
```

### 2. Update Image Reference

Edit `k8s/opsguard-deployment.yaml` and replace:
```yaml
image: your-registry/opsguard:latest
```

With your actual image:
```yaml
image: your-registry.com/opsguard:v1.0.0
```

### 3. Update Configuration

**Update ConfigMap** (`k8s/configmap.yaml`):
```yaml
data:
  NEXTAUTH_URL: "https://your-actual-domain.com"
```

**Update Secrets** (`k8s/secret.yaml`):

Generate new secrets:
```bash
# Generate base64 encoded values
echo -n 'your-db-username' | base64
echo -n 'your-secure-password' | base64
echo -n 'your-nextauth-secret' | base64
```

Or create secrets via kubectl:
```bash
kubectl create secret generic opsguard-secrets \
  --from-literal=POSTGRES_USER=opsguard \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  --from-literal=NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -n opsguard --dry-run=client -o yaml > k8s/secret.yaml
```

### 4. Deploy to Kubernetes

```bash
# Apply all manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/opsguard-deployment.yaml
kubectl apply -f k8s/opsguard-service.yaml

# Optional: Deploy Ingress
kubectl apply -f k8s/ingress.yaml
```

Or apply all at once:
```bash
kubectl apply -f k8s/
```

### 5. Verify Deployment

```bash
# Check namespace
kubectl get namespaces

# Check all resources
kubectl get all -n opsguard

# Check pods status
kubectl get pods -n opsguard

# Check services
kubectl get services -n opsguard
```

Wait for pods to be in `Running` state:
```bash
kubectl wait --for=condition=ready pod -l app=opsguard-app -n opsguard --timeout=300s
```

### 6. Create Admin User

```bash
# Get pod name
POD_NAME=$(kubectl get pod -n opsguard -l app=opsguard-app -o jsonpath='{.items[0].metadata.name}')

# Create admin user
kubectl exec -it -n opsguard $POD_NAME -- \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password admin \
  --role admin
```

### 7. Access the Application

**If using LoadBalancer:**
```bash
kubectl get service opsguard-service -n opsguard
# Note the EXTERNAL-IP
```

Access at: `http://<EXTERNAL-IP>`

**If using Port Forward (for testing):**
```bash
kubectl port-forward -n opsguard service/opsguard-service 3000:80
```

Access at: `http://localhost:3000`

**If using Ingress:**
Configure your DNS to point to the Ingress controller's IP, then access via your domain.

## Detailed Configuration

### Storage

The PostgreSQL deployment uses a PersistentVolumeClaim (PVC) for data storage.

**Customize storage:**
Edit `k8s/postgres-pvc.yaml`:
```yaml
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi  # Increase as needed
  storageClassName: fast-ssd  # Use your storage class
```

### Resource Limits

**PostgreSQL resources** (`k8s/postgres-deployment.yaml`):
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

**Application resources** (`k8s/opsguard-deployment.yaml`):
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

### Scaling

Scale the application horizontally:
```bash
kubectl scale deployment -n opsguard opsguard-app --replicas=3
```

Or edit the deployment:
```yaml
spec:
  replicas: 3
```

**Note:** Database is single replica. For HA database, consider managed services (AWS RDS, Google Cloud SQL, Azure Database).

### Ingress Configuration

For production, configure Ingress with TLS:

**Prerequisites:**
- Ingress controller installed (nginx, traefik, etc.)
- cert-manager for automatic SSL (optional)

**Update** `k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opsguard-ingress
  namespace: opsguard
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - opsguard.yourdomain.com
    secretName: opsguard-tls
  rules:
  - host: opsguard.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: opsguard-service
            port:
              number: 80
```

## Management

### View Logs

```bash
# Application logs
kubectl logs -f -n opsguard deployment/opsguard-app

# Database logs
kubectl logs -f -n opsguard deployment/opsguard-postgres

# Specific pod
kubectl logs -f -n opsguard <pod-name>

# Previous pod logs (after crash)
kubectl logs -n opsguard <pod-name> --previous
```

### Exec into Pods

```bash
# Application pod
kubectl exec -it -n opsguard <app-pod-name> -- sh

# Database pod
kubectl exec -it -n opsguard <postgres-pod-name> -- sh

# Run psql
kubectl exec -it -n opsguard <postgres-pod-name> -- psql -U opsguard -d opsguard_db
```

### Update Deployment

**Update image version:**
```bash
kubectl set image -n opsguard deployment/opsguard-app \
  opsguard=your-registry.com/opsguard:v1.1.0

# Watch rollout
kubectl rollout status -n opsguard deployment/opsguard-app
```

**Rollback deployment:**
```bash
kubectl rollout undo -n opsguard deployment/opsguard-app

# Rollback to specific revision
kubectl rollout undo -n opsguard deployment/opsguard-app --to-revision=2
```

### Restart Deployment

```bash
kubectl rollout restart -n opsguard deployment/opsguard-app
kubectl rollout restart -n opsguard deployment/opsguard-postgres
```

## Backup and Recovery

### Database Backup

**Manual backup:**
```bash
POD_NAME=$(kubectl get pod -n opsguard -l app=opsguard-postgres -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n opsguard $POD_NAME -- \
  pg_dump -U opsguard opsguard_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from backup:**
```bash
cat backup_20250121_120000.sql | \
kubectl exec -i -n opsguard $POD_NAME -- \
  psql -U opsguard opsguard_db
```

**Automated backups with CronJob:**

Create `k8s/backup-cronjob.yaml`:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: opsguard
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - pg_dump -h opsguard-postgres-service -U opsguard opsguard_db > /backup/backup_$(date +%Y%m%d).sql
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: opsguard-secrets
                  key: POSTGRES_PASSWORD
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

## Monitoring

### Health Checks

The deployment includes liveness and readiness probes:

**Application:**
- Liveness: `GET /api/health`
- Readiness: `GET /api/health`

**Database:**
- Liveness: `pg_isready -U opsguard`
- Readiness: `pg_isready -U opsguard`

### Metrics

For production monitoring, integrate:

**Prometheus + Grafana:**
```bash
# Add Prometheus annotations to deployments
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n opsguard

# Describe pod for events
kubectl describe pod -n opsguard <pod-name>

# Check logs
kubectl logs -n opsguard <pod-name>
```

Common issues:
- **ImagePullBackOff**: Wrong image or registry credentials
- **CrashLoopBackOff**: Application error, check logs
- **Pending**: Resource constraints or PVC issues

### Database Connection Issues

```bash
# Test database connectivity from app pod
kubectl exec -it -n opsguard <app-pod-name> -- \
  sh -c 'apk add postgresql-client && psql $DATABASE_URL'
```

### Service Not Accessible

```bash
# Check service
kubectl get service -n opsguard opsguard-service

# Check endpoints
kubectl get endpoints -n opsguard opsguard-service

# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl -n opsguard -- \
  curl http://opsguard-service/api/health
```

### View Events

```bash
kubectl get events -n opsguard --sort-by='.lastTimestamp'
```

## Cleanup

### Delete Deployment

```bash
# Delete all resources
kubectl delete -f k8s/

# Or delete namespace (removes everything)
kubectl delete namespace opsguard
```

**Note:** This will delete the PVC and all data. Backup first!

## Production Best Practices

- [ ] Use managed database service (RDS, Cloud SQL, etc.)
- [ ] Enable pod autoscaling (HPA)
- [ ] Configure resource quotas and limits
- [ ] Use network policies for isolation
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Use GitOps (ArgoCD, Flux)
- [ ] Implement backup strategy
- [ ] Use secrets management (External Secrets, Sealed Secrets)
- [ ] Configure pod disruption budgets
- [ ] Use multiple availability zones
- [ ] Enable RBAC appropriately

## Next Steps

- Configure monitoring with Prometheus
- Set up centralized logging with Loki/ELK
- Implement CI/CD pipeline
- Configure horizontal pod autoscaling
- Set up disaster recovery plan

## Resources

- [Main Setup Guide](../SETUP.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
