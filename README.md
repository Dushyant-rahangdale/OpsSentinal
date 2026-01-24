<div align="center">

<img src="https://raw.githubusercontent.com/dushyant-rahangdale/opsknight/main/public/banner.png" alt="OpsKnight banner" width="100%">

# 🛡️ OpsKnight

**Open-source incident & on-call platform with status pages and a mobile PWA.**

[![Website](https://img.shields.io/badge/Website-opsknight.com-10b981?style=for-the-badge&logo=google-chrome&logoColor=white)](https://opsknight.com)
[![Docs](https://img.shields.io/badge/Docs-opsknight.com%2Fdocs-2563eb?style=for-the-badge&logo=mdbook&logoColor=white)](https://opsknight.com/docs)
[![Live Demo](https://img.shields.io/badge/Live_Demo-try_now-f97316?style=for-the-badge&logo=vercel&logoColor=white)](https://opsknight.com)
[![License](https://img.shields.io/badge/License-Apache_2.0-111827?style=for-the-badge)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docs/v1/deployment/docker.md)
[![Helm](https://img.shields.io/badge/Helm-ready-0f62fe?style=for-the-badge&logo=helm&logoColor=white)](docs/v1/deployment/helm.md)

> **Beta:** rapid releases until stable v1 in **February 2026**.

<p>
  <a href="https://opsknight.com">🌐 Website</a> •
  <a href="https://opsknight.com/docs">📚 Docs (hosted)</a> •
  <a href="https://github.com/dushyant-rahangdale/opsknight/discussions">🧭 Discussions</a>
</p>

</div>

---

## Quick Links

- 🌐 Website: <https://opsknight.com>
- 📚 Hosted Docs: <https://opsknight.com/docs>
- ▶️ Live Demo: <https://opsknight.com>
- 🚀 One-command start: see **Run It Your Way** below

---

## TL;DR

- One stack: incident command center, on-call rotations, public status pages.
- Mobile-first: installable PWA with rich push for iOS/Android/desktop.
- Deploy anywhere: Docker Compose, Helm chart, or Kustomize overlays (GitOps-ready).
- Deep integrations: Slack, Email/SMS/Voice, Prometheus, Datadog, CloudWatch, Sentry, Grafana, webhooks.
- Open-source = predictable costs and no data captivity.

---

## See It

<div align="center">
  <img src="https://raw.githubusercontent.com/dushyant-rahangdale/opsknight/main/docs/v1/assets/dashboard-command-center-1200.jpg" alt="OpsKnight command center dashboard" width="90%">
  <br><em>Command Center: incidents, service health, and responder status.</em>
  <br><br>
  <img src="https://raw.githubusercontent.com/dushyant-rahangdale/opsknight/main/docs/v1/assets/mobile-dashboard.png" alt="OpsKnight mobile PWA dashboard" width="35%">
  <img src="https://raw.githubusercontent.com/dushyant-rahangdale/opsknight/main/docs/v1/assets/push-notification.png" alt="OpsKnight push notification example" width="35%">
  <br><em>Installable PWA + actionable push notifications.</em>
</div>

---

## Highlights

- **Incident lifecycle** — timelines, assignments, runbooks, postmortems, SLA (MTTA/MTTR).
- **On-call** — rotations, overrides, time zones, fair distribution to avoid burnout.
- **Escalations** — retry, fan-out, auto-ack, failover across channels.
- **Alerts** — Slack, Email, SMS, Voice, Push, Webhooks (per-step/per-policy).
- **Status pages** — subscriber emails, component health, planned maintenance windows.
- **Security** — RBAC, audit logs, SSO/OIDC, secrets isolation (see docs/security).

---

## Who It's For

- SRE and Platform teams needing affordable, self-hosted incident management.
- SaaS & API providers who must publish status pages and keep customers informed.
- Managed service providers supporting multiple tenants with strict SLAs.
- Startups that want PagerDuty-class capabilities without per-seat pricing.

---

## Common Use Cases

- Replace PagerDuty/OpsGenie with an open-source, self-hosted stack.
- Run on-call for microservices across time zones with fair, automated rotations.
- Automate escalations from monitoring/observability tools (Prometheus, Datadog, CloudWatch, Sentry, Grafana).
- Publish public status pages with subscriber notifications during incidents and maintenance.
- Handle incidents from mobile: receive push, ack, reassign, and run playbooks from the PWA.

---

## Integrations (native)

- Alerting/Observability: Prometheus, Alertmanager, Datadog, CloudWatch, Sentry, Grafana, Webhooks.
- Communications: Slack, Email, SMS, Voice, Push (PWA).
- Platform: Kubernetes/Helm/Kustomize deploys, REST API for automation.

See more in [docs/v1/integrations](docs/v1/integrations/README.md).

---

## Supported Deployments (pick your path)

- **Docker Compose** — fastest local eval; ships with sensible defaults.
- **Helm chart** — production-ready; includes HPA/PDB/ingress knobs.
- **Kustomize** — GitOps-friendly overlays; drop into ArgoCD/Flux.
- **BYO Postgres** — point to managed databases via env vars.

Docs: [Deployment guides](docs/v1/deployment/README.md) • [Docker](docs/v1/deployment/docker.md) • [Helm](docs/v1/deployment/helm.md) • [Kustomize](docs/v1/deployment/kubernetes.md)

## Run It Your Way

```bash
git clone https://github.com/dushyant-rahangdale/opsknight.git
cd opsknight
cp env.example .env
docker compose up -d
```

- Helm (prod): `helm repo add opsknight https://charts.opsknight.com && helm install opsknight opsknight/opsknight -n opsknight --create-namespace`
- Kustomize (GitOps): `kubectl apply -k k8s/`
- More: [Deployment guides](docs/v1/deployment/README.md)

**Deployment at a glance**

- Local eval: Docker Compose (fastest path).
- Production single-cluster: Helm chart with HPA, PDB, and ingress examples.
- GitOps: Kustomize overlays; works with ArgoCD/Flux.
- Cloud DBs: Bring your own Postgres via env vars (see deployment docs).

---

## Mobile PWA

- One-tap install (Safari/Chrome) — no app-store wait.
- Push notifications with incident context and quick actions.
- Works the same on desktop for unified responder experience.
- Guides: [Mobile setup](docs/v1/mobile/setup.md) · [Push notifications](docs/v1/mobile/README.md)

---

## Docs & Links

- Hosted docs (latest): https://opsknight.com/docs
- In-repo entry points: [Getting started](docs/v1/getting-started/README.md) · [Core concepts](docs/v1/core-concepts/README.md) · [Integrations](docs/v1/integrations/README.md) · [API](docs/v1/api/README.md) · [Security](docs/v1/security/README.md)

---

## Community & Support

- Q&A: [GitHub Discussions](https://github.com/dushyant-rahangdale/opsknight/discussions)
- Issues: [Bug reports](https://github.com/dushyant-rahangdale/opsknight/issues)
- Updates: [Twitter/X](https://twitter.com/opsknight)

---

## License

OpsKnight is licensed under the [Apache License 2.0](LICENSE).

<div align="center">
  <sub>Built with ❤️ for incident responders and SRE teams everywhere.</sub>
</div>
