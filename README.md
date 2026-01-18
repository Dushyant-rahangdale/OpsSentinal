<div align="center">

<img src="public/banner.png" alt="OpsKnight Banner" width="100%">

# 🛡️ OpsKnight

**Open-Source Incidents, On-Call, and Status Pages.**

[![Website](https://img.shields.io/badge/Website-opsknight.com-10b981?style=for-the-badge&logo=google-chrome&logoColor=white)](https://opsknight.com)
[![License](https://img.shields.io/badge/License-AGPL--3.0-green?style=for-the-badge)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docs/deployment/docker-compose.md)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](docs/deployment/helm.md)

<div align="center">
  <h3>
    <a href="https://opsknight.com" target="_blank">
      🌐 Visit Website: opsknight.com
    </a>
  </h3>
</div>

[**Documentation**](docs/) • [**Live Demo**](https://opsknight.com) • [**Join Community**](https://discord.gg/opsknight)

</div>

---

## 🚀 Overview

**OpsKnight** is the open-source alternative to PagerDuty and OpsGenie. We help engineering teams manage on-call rotations, escalate alerts, and communicate incidents effectively—without the enterprise price tag.

### ✨ Key Features

- **🚨 Incident Management** - Full lifecycle tracking, severity levels, and automated timelines.
- **📅 On-Call Scheduling** - Flexible rotations, layers, overrides, and fair-scheduling algorithms.
- **📈 Escalation Policies** - Ensure no alert is missed with multi-step escalation rules.
- **🌐 Status Pages** - Beautiful public-facing status pages with subscriber notifications.
- **🔔 Omni-Channel Alerts** - Native integrations for Slack, SMS, Phone, Email, and Push.
- **📱 Mobile App** - Full-featured PWA for iOS and Android.

---

## 📦 Deployment

OpsKnight is designed to run anywhere. Choose your preferred deployment method:

### 🐳 Docker Compose (Fastest)

Ideal for testing and small deployments.

```bash
git clone https://github.com/dushyant-rahangdale/opsknight.git
cd opsknight
cp env.example .env
docker compose up -d
```

### ☸️ Helm Charts

Production-ready Kubernetes deployment.

```bash
helm repo add opsknight https://charts.opsknight.com
helm install opsknight opsknight/opsknight -n opsknight --create-namespace
```

### ⛵ Kustomize

For declarative Kubernetes management.

```bash
kubectl apply -k deploy/kustomize/overlays/production
```

> See [**Deployment Documentation**](docs/deployment/) for detailed configuration guides.

---

## 📚 Documentation

| Section                                      | Description                                            |
| :------------------------------------------- | :----------------------------------------------------- |
| [**Getting Started**](docs/getting-started/) | Installation guides, initial setup, and configuration. |
| [**Core Concepts**](docs/core-concepts/)     | Learn about Services, Incidents, Teams, and Schedules. |
| [**Administration**](docs/administration/)   | SSO/OIDC setup, RBAC, and data retention policies.     |
| [**API Reference**](docs/api/)               | Full REST API documentation for automation.            |
| [**Security**](docs/security/)               | Encryption, audit logs, and compliance.                |

---

## 🔌 Integrations

Native support for your favorite observability tools:

<p align="center">
  <img src="https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white" alt="Slack">
  <img src="https://img.shields.io/badge/Datadog-632CA6?style=for-the-badge&logo=datadog&logoColor=white" alt="Datadog">
  <img src="https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white" alt="Prometheus">
  <img src="https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white" alt="Grafana">
  <img src="https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white" alt="Sentry">
  <img src="https://img.shields.io/badge/AWS_CloudWatch-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS">
</p>

---

## 🤝 Contributing

We love contributions! OpsKnight is built by the community, for the community.

1.  Read our [**Contributing Guide**](CONTRIBUTING.md).
2.  Join our [Discord](https://discord.gg/opsknight) to discuss ideas.
3.  Open a Pull Request!

## 📄 License

Licensed under the [Apache License 2.0](LICENSE).

<div align="center">
  <sub>Built with ❤️ for SREs and DevOps Teams</sub>
</div>
