# OpsKnight v1.4.0 Hotfix

This hotfix supersedes the original `ghcr.io/opsknight-labs/opsknight:1.4.0` container image for affected v1.4 deployments.

The patched image is:

```text
ghcr.io/opsknight-labs/opsknight:1.4.0-hotfix
```

It preserves the v1.4 runtime contract and fixes the PostgreSQL advisory-lock query that caused Prisma to report:

```text
Failed to deserialize column of type 'void'
```

No new database migration is introduced by this hotfix.

## Docker / Compose

If you are using the updated `release/v1.4` Compose files:

```bash
git fetch origin
git switch release/v1.4
git pull

docker compose pull opsknight-app
docker compose up -d opsknight-app
docker compose ps
docker compose logs --tail=200 opsknight-app
curl --fail 'http://localhost:3000/api/health?mode=readiness'
```

The v1.4 Compose file defaults to `ghcr.io/opsknight-labs/opsknight:1.4.0-hotfix` unless `OPSKNIGHT_IMAGE` is explicitly overridden in `.env`.

For an existing Compose checkout that still pins the old image, set:

```dotenv
OPSKNIGHT_IMAGE=ghcr.io/opsknight-labs/opsknight:1.4.0-hotfix
```

Then run:

```bash
docker compose pull opsknight-app
docker compose up -d opsknight-app
```

## Direct Docker

```bash
docker pull ghcr.io/opsknight-labs/opsknight:1.4.0-hotfix
```

Use the hotfix tag anywhere the original `1.4.0` image was previously referenced.

## Kubernetes / Kustomize

```bash
kubectl -n opsknight set image deployment/opsknight-app \
  opsknight-app=ghcr.io/opsknight-labs/opsknight:1.4.0-hotfix

kubectl -n opsknight rollout status deployment/opsknight-app --timeout=10m
kubectl -n opsknight logs deployment/opsknight-app --tail=200
```

The checked-in `release/v1.4` Kubernetes deployment already points to the hotfix image.

## Helm

For the in-repository v1.4 Helm chart:

```bash
helm upgrade opsknight helm/opsknight \
  --namespace opsknight \
  --set-string image.tag='1.4.0-hotfix' \
  --wait --timeout 10m
```

The v1.4 chart keeps chart version `1.4.0` but defaults its application image version to `1.4.0-hotfix`.

## Verify the running image

Compose:

```bash
docker compose images opsknight-app
```

Kubernetes:

```bash
kubectl -n opsknight get deployment opsknight-app \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

Expected image:

```text
ghcr.io/opsknight-labs/opsknight:1.4.0-hotfix
```

After startup, confirm the logs do not contain the Prisma `void` deserialization error or the corresponding advisory-lock warning.

## Original v1.4.0 GitHub Release

The original GitHub `v1.4.0` Release is immutable, so its published release body and original commands cannot be edited in place. This file and the maintained v1.4 deployment documentation contain the corrected hotfix commands.
