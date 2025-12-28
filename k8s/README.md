# Kubernetes Deployment Guide

Deploy opssentinal to Kubernetes for production-grade orchestration.

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
docker build -t opssentinal:v1.0.0 .

# Tag for your registry
docker tag opssentinal:v1.0.0 your-registry.com/opssentinal:v1.0.0

# Push to registry
docker push your-registry.com/opssentinal:v1.0.0
```

### 2. Update Image Reference

Edit `k8s/opssentinal-deployment.yaml` and replace:
```yaml
image: your-registry/opssentinal:latest
```

With your actual image:
```yaml
image: your-registry.com/opssentinal:v1.0.0
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

# Optional: Twilio SMS/WhatsApp secrets (if using Twilio)
echo -n 'your-twilio-account-sid' | base64
echo -n 'your-twilio-auth-token' | base64
echo -n '+1234567890' | base64  # For TWILIO_FROM_NUMBER
echo -n 'whatsapp:+1234567890' | base64  # For TWILIO_WHATSAPP_NUMBER (optional)
```

Or create secrets via kubectl:
```bash
kubectl create secret generic opssentinal-secrets \
  --from-literal=POSTGRES_USER=opssentinal \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  --from-literal=NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  --from-literal=TWILIO_ACCOUNT_SID=your-twilio-account-sid \
  --from-literal=TWILIO_AUTH_TOKEN=your-twilio-auth-token \
  --from-literal=TWILIO_FROM_NUMBER=+1234567890 \
  --from-literal=TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890 \
  -n opssentinal --dry-run=client -o yaml > k8s/secret.yaml
```

**Note:** Twilio secrets are optional. Only include them if you want to enable SMS/WhatsApp notifications.

### 4. Deploy to Kubernetes

```bash
# Apply all manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/opssentinal-deployment.yaml
kubectl apply -f k8s/opssentinal-service.yaml

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
kubectl get all -n opssentinal

# Check pods status
kubectl get pods -n opssentinal

# Check services
kubectl get services -n opssentinal
```

Wait for pods to be in `Running` state:
```bash
kubectl wait --for=condition=ready pod -l app=opssentinal-app -n opssentinal --timeout=300s
```

### 6. Create Admin User

```bash
# Get pod name
POD_NAME=$(kubectl get pod -n opssentinal -l app=opssentinal-app -o jsonpath='{.items[0].metadata.name}')

# Create admin user
kubectl exec -it -n opssentinal $POD_NAME -- \
  node scripts/opssentinal.mjs \
  --user admin \
  --email admin@example.com \
  --password admin \
  --role admin
```

**📖 For detailed CLI usage in production, see [CLI Production Guide](../CLI_PRODUCTION_GUIDE.md)**

### 7. Access the Application

**If using LoadBalancer:**
```bash
kubectl get service opssentinal-service -n opssentinal
# Note the EXTERNAL-IP
```

Access at: `http://<EXTERNAL-IP>`

**If using Port Forward (for testing):**
```bash
kubectl port-forward -n opssentinal service/opssentinal-service 3000:80
```

Access at: `http://localhost:3000`

**If using Ingress:**
Configure your DNS to point to the Ingress controller's IP, then access via your domain.

## Detailed Configuration

### Optional: Twilio SMS/WhatsApp Configuration

If you want to enable SMS and WhatsApp notifications via Twilio:

1. **Install Twilio package** (optional - will be installed automatically if in package.json):
   ```bash
   npm install twilio
   ```

2. **Add Twilio secrets** to `k8s/secret.yaml`:
   ```yaml
   data:
     TWILIO_ACCOUNT_SID: <base64-encoded-account-sid>
     TWILIO_AUTH_TOKEN: <base64-encoded-auth-token>
     TWILIO_FROM_NUMBER: <base64-encoded-from-number>  # E.g., +1234567890
     TWILIO_WHATSAPP_NUMBER: <base64-encoded-whatsapp-number>  # Optional: whatsapp:+1234567890
   ```

3. **Uncomment Twilio environment variables** in `k8s/opssentinal-deployment.yaml`:
   ```yaml
   - name: TWILIO_ACCOUNT_SID
     valueFrom:
       secretKeyRef:
         name: opssentinal-secrets
         key: TWILIO_ACCOUNT_SID
         optional: true
   # ... (repeat for other Twilio vars)
   ```

4. **Configure in UI**: After deployment, go to Settings → Notification Providers and configure Twilio.

**Note:** The application will work without Twilio. SMS/WhatsApp features will be disabled if Twilio is not configured.

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

**Application resources** (`k8s/opssentinal-deployment.yaml`):
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
kubectl scale deployment -n opssentinal opssentinal-app --replicas=3
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
  name: opssentinal-ingress
  namespace: opssentinal
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - opssentinal.yourdomain.com
    secretName: opssentinal-tls
  rules:
  - host: opssentinal.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: opssentinal-service
            port:
              number: 80
```

## Management

### View Logs

```bash
# Application logs
kubectl logs -f -n opssentinal deployment/opssentinal-app

# Database logs
kubectl logs -f -n opssentinal deployment/opssentinal-postgres

# Specific pod
kubectl logs -f -n opssentinal <pod-name>

# Previous pod logs (after crash)
kubectl logs -n opssentinal <pod-name> --previous
```

### Exec into Pods

```bash
# Application pod
kubectl exec -it -n opssentinal <app-pod-name> -- sh

# Database pod
kubectl exec -it -n opssentinal <postgres-pod-name> -- sh

# Run psql
kubectl exec -it -n opssentinal <postgres-pod-name> -- psql -U opssentinal -d opssentinal_db
```

### Update Deployment

**Update image version:**
```bash
kubectl set image -n opssentinal deployment/opssentinal-app \
  opssentinal=your-registry.com/opssentinal:v1.1.0

# Watch rollout
kubectl rollout status -n opssentinal deployment/opssentinal-app
```

**Rollback deployment:**
```bash
kubectl rollout undo -n opssentinal deployment/opssentinal-app

# Rollback to specific revision
kubectl rollout undo -n opssentinal deployment/opssentinal-app --to-revision=2
```

### Restart Deployment

```bash
kubectl rollout restart -n opssentinal deployment/opssentinal-app
kubectl rollout restart -n opssentinal deployment/opssentinal-postgres
```

## Backup and Recovery

### Database Backup

**Manual backup:**
```bash
POD_NAME=$(kubectl get pod -n opssentinal -l app=opssentinal-postgres -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n opssentinal $POD_NAME -- \
  pg_dump -U opssentinal opssentinal_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from backup:**
```bash
cat backup_20250121_120000.sql | \
kubectl exec -i -n opssentinal $POD_NAME -- \
  psql -U opssentinal opssentinal_db
```

**Automated backups with CronJob:**

Create `k8s/backup-cronjob.yaml`:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: opssentinal
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
            - pg_dump -h opssentinal-postgres-service -U opssentinal opssentinal_db > /backup/backup_$(date +%Y%m%d).sql
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: opssentinal-secrets
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
- Liveness: `pg_isready -U opssentinal`
- Readiness: `pg_isready -U opssentinal`

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
kubectl get pods -n opssentinal

# Describe pod for events
kubectl describe pod -n opssentinal <pod-name>

# Check logs
kubectl logs -n opssentinal <pod-name>
```

Common issues:
- **ImagePullBackOff**: Wrong image or registry credentials
- **CrashLoopBackOff**: Application error, check logs
- **Pending**: Resource constraints or PVC issues

### Database Connection Issues

```bash
# Test database connectivity from app pod
kubectl exec -it -n opssentinal <app-pod-name> -- \
  sh -c 'apk add postgresql-client && psql $DATABASE_URL'
```

### Service Not Accessible

```bash
# Check service
kubectl get service -n opssentinal opssentinal-service

# Check endpoints
kubectl get endpoints -n opssentinal opssentinal-service

# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl -n opssentinal -- \
  curl http://opssentinal-service/api/health
```

### View Events

```bash
kubectl get events -n opssentinal --sort-by='.lastTimestamp'
```

## Cleanup

### Delete Deployment

```bash
# Delete all resources
kubectl delete -f k8s/

# Or delete namespace (removes everything)
kubectl delete namespace opssentinal
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


