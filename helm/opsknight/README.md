# OpsKnight Helm Chart

[Helm](https://helm.sh) chart for deploying [OpsKnight](https://github.com/dushyant-rahangdale/opsknight).

## Installation

### 1. Add Repository

```bash
helm repo add opsknight https://dushyant-rahangdale.github.io/opsknight
helm repo update
```

### 2. Configure Ingress (Optional)

The chart supports any ingress controller. We provide ready-to-use examples in `examples/`:

```bash
# NGINX
cp helm/opsknight/examples/values-nginx.yaml my-values.yaml

# AWS ALB
cp helm/opsknight/examples/values-aws-alb.yaml my-values.yaml

# Azure AGIC
cp helm/opsknight/examples/values-azure-agic.yaml my-values.yaml
```

Edit `my-values.yaml` to set your domain name.

### 3. Install

```bash
helm install opsknight ./helm/opsknight \
  -n opsknight --create-namespace \
  -f my-values.yaml \
  --set secrets.nextauthSecret="$(openssl rand -base64 32)"
```

## Configuration

| Parameter             | Description        | Default                                 |
| --------------------- | ------------------ | --------------------------------------- |
| `replicaCount`        | Number of replicas | `2`                                     |
| `image.repository`    | Image repository   | `ghcr.io/dushyant-rahangdale/opsknight` |
| `postgresql.enabled`  | Deploy PostgreSQL  | `true`                                  |
| `persistence.enabled` | Enable persistence | `true`                                  |

See [values.yaml](./values.yaml) for full defaults.
