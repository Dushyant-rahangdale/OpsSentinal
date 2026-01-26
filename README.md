<div align="center">

<img src="public/OpsKnight.png" alt="OpsKnight Banner" width="100%">

# OpsKnight

**The Open Source Incident Command Center.**<br>
_Your entire incident lifecycle, on-call schedules, and status pages in one powerful platform._

[**opsknight.com**](https://opsknight.com)

[![Website](https://img.shields.io/badge/Website-opsknight.com-10b981?style=flat&logo=google-chrome&logoColor=white)](https://opsknight.com)
[![Docs](https://img.shields.io/badge/Docs-Read-2563eb?style=flat&logo=book&logoColor=white)](https://opsknight.com/docs)
[![License](https://img.shields.io/badge/License-Apache_2.0-111827?style=flat)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](docs/v1/deployment/docker.md)
[![Status](https://img.shields.io/badge/Status-Beta-orange?style=flat)](ROADMAP.md)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=flat&logo=github&logoColor=white)](https://github.com/sponsors/dushyant-rahangdale)
[![Tests](https://github.com/dushyant-rahangdale/opsknight/actions/workflows/tests.yml/badge.svg)](https://github.com/dushyant-rahangdale/opsknight/actions/workflows/tests.yml)
[![Security](https://github.com/dushyant-rahangdale/opsknight/actions/workflows/security.yml/badge.svg)](https://github.com/dushyant-rahangdale/opsknight/actions/workflows/security.yml)

<br>

</div>

---

</div>

---

## 📑 Table of Contents

- [Why OpsKnight?](#-why-opsknight)
- [Key Features](#-key-features)
- [Mobile Command Center](#-mobile-command-center)
- [Built With](#-built-with)
- [Quick Start](#-quick-start)
- [Deployment Options](#-deployment-options)
- [Architecture](#-architecture)
- [Documentation](#-documentation)
- [Roadmap](#-roadmap)
- [Community & Support](#-community--support)

---

## ⚡ Why OpsKnight?

**Stop paying per-seat for reliability.**

OpsKnight is the open-source alternative to PagerDuty and OpsGenie, designed for teams that want full control over their incident management stack without the massive SaaS bill. From the first alert to the final post-mortem, OpsKnight unifies your entire reliability workflow into a single, cohesive developer experience.

Whether you are an SRE team at a startup maintaining 99.99% uptime or a Platform Engineer at a large enterprise, OpsKnight gives you the tools to **detect, respond, and resolve** faster.

| Feature             |        OpsKnight 🛡️         |   Proprietary SaaS 💸    |
| :------------------ | :-------------------------: | :----------------------: |
| **Hosting**         | Self-Hosted / Private Cloud |    Public Cloud Only     |
| **Cost**            |     Free (Open Source)      | $20-$100 / user / month  |
| **Users**           |        **Unlimited**        |     Per-Seat Pricing     |
| **Status Pages**    |  **Included (Unlimited)**   |        Extra Cost        |
| **Custom Branding** |       ✅ Full Control       |        ❌ Limited        |
| **Data Privacy**    |    ✅ 100% Owned by You     | ❌ Third-Party Processed |


---

## 🎥 Demo

<div align="center">
  <img src="public/demo.gif" alt="OpsKnight demo" width="100%">
</div>

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>🚨 Unified Command Center</h3>
      <p>Manage incidents, responders, and runbooks from a single real-time dashboard. Track SLAs (MTTA/MTTR) and automate assignments.</p>
    </td>
    <td width="50%">
      <h3>📅 Fair On-Call Rotations</h3>
      <p>Flexible scheduling with daily, weekly, or custom rotations. Handle time zones, overrides, and escalation policies with ease.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>📢 Global Escalations</h3>
      <p>Never miss a critical alert. Multi-channel notifications via <strong>Slack, SMS, Voice, Email, and Push</strong> ensure the right person is woken up.</p>
    </td>
    <td>
      <h3>📱 Mobile PWA</h3>
      <p>Full incident management in your pocket. Installable on iOS/Android with <strong>Push Notifications</strong> and biometric security.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>📊 Public Status Pages</h3>
      <p>Keep your users informed with beautiful public status pages. Automate updates and subscriber notifications during incidents.</p>
    </td>
    <td>
      <h3>🔌 Deep Integrations</h3>
      <p>Native support for Prometheus, Datadog, Sentry, CloudWatch, and Grafana. Seamless two-way sync with Slack.</p>
    </td>
  </tr>
</table>



</div>

---

## 📱 Mobile Command Center

**Respond to incidents from anywhere.** OpsKnight includes a fully installable Progressive Web App (PWA) for iOS and Android.

- **🔔 Push Notifications**: Get critical alerts instantly on your device.
- **👆 One-Tap Install**: No App Store required. Just "Add to Home Screen".
- **🔒 Secure**: Supports biometric authentication (FaceID/TouchID).

<div align="center">
  <img src="docs/v1/assets/mobile.png" alt="Mobile Dashboard" width="100%">
</div>

<div align="center">
  <a href="docs/v1/mobile/setup.md"><strong>Explore Mobile Setup Guide →</strong></a>
</div>

---

## 🔌 Integrations

OpsKnight plays nicely with your existing stack.

<div align="center">
  <img src="https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white" alt="Slack" />
  <img src="https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white" alt="Prometheus" />
  <img src="https://img.shields.io/badge/Datadog-632CA6?style=for-the-badge&logo=datadog&logoColor=white" alt="Datadog" />
  <img src="https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white" alt="Grafana" />
  <img src="https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white" alt="Sentry" />
  <img src="https://img.shields.io/badge/AWS_CloudWatch-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="CloudWatch" />
  <img src="https://img.shields.io/badge/Teams-6264A7?style=for-the-badge&logo=microsoft-teams&logoColor=white" alt="Microsoft Teams" />
  <img src="https://img.shields.io/badge/Webhooks-000000?style=for-the-badge&logo=webhook&logoColor=white" alt="Webhooks" />
</div>

[**View All Integrations →**](docs/v1/integrations/README.md)

---

## 🛠️ Built With

OpsKnight is built on a modern, type-safe stack designed for performance and developer experience.

<div align="center">
  <img src="https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-20232a?style=for-the-badge&logo=react&logoColor=61dafb" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</div>

---

## 🚀 Quick Start

Get OpsKnight up and running locally in under 60 seconds.

### Prerequisites

- Docker & Docker Compose
- Git

### Run it

```bash
# 1. Clone the repository
git clone https://github.com/dushyant-rahangdale/opsknight.git
cd opsknight

# 2. Setup Environment
cp env.example .env

# 3. Start the stack
docker compose up -d
```

Visit `http://localhost:3000` and start managing incidents.

---

## 📦 Deployment Options

We support multiple deployment strategies to fit your infrastructure needs.

| Method             | Best For                            | Guide                                          |
| :----------------- | :---------------------------------- | :--------------------------------------------- |
| ![](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white) **Docker Compose** | Local Development, small teams      | [Read Guide](docs/v1/deployment/docker.md)     |
| ![](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white) **Helm Chart**     | Production Kubernetes (Recommended) | [Read Guide](docs/v1/deployment/helm.md)       |
| ![](https://img.shields.io/badge/-GitOps-black?style=flat&logo=git&logoColor=white) **Kustomize**      | GitOps (ArgoCD/Flux)                | [Read Guide](docs/v1/deployment/kubernetes.md) |

> **Note:** For production, we recommend using an external managed PostgreSQL database.

---

## 🏗️ Architecture

OpsKnight runs as a single Next.js application (UI + API routes + server actions) with an internal DB-backed scheduler and a Postgres-backed job queue.

<div align="center">
  <img src="docs/v1/assets/images/opsknight-architecture.svg" alt="OpsKnight architecture diagram" width="100%">
  <sub><em>High-level architecture: clients → app (Next.js) → PostgreSQL (Prisma) → outbound channels.</em></sub>
</div>

- Full details: [Architecture docs](docs/v1/architecture/README.md)

---

## 📚 Documentation

Everything you need to configure and extend OpsKnight.

- **[Hosted Documentation](https://opsknight.com/docs)** (Recommended)
- **In-Repo Guides**:
  - [⚡ Getting Started](docs/v1/getting-started/README.md)
  - [🧩 Core Concepts](docs/v1/core-concepts/README.md)
  - [🔌 Integrations](docs/v1/integrations/README.md)
  - [🛡️ Security](docs/v1/security/README.md)
  - [📡 API Reference](docs/v1/api/README.md)

---

## 🗺️ Roadmap

We are actively building towards **Version 1.0 (February 2026)**.

- [x] Core Incident Management & On-Call
- [x] Slack Integration & Webhooks
- [x] Basic Status Pages
- [ ] **Voice/Call Escalations** (In Progress)
- [ ] **Advanced Analytics & Reports**
- [ ] **Jira/ServiceNow Integrations**

See the full [ROADMAP.md](ROADMAP.md) for details.

---

## 🤝 Community & Support

Join the OpsKnight community to get help, suggest features, or contribute.

<div align="center">
  <a href="mailto:help@opsknight.com">
    <img src="https://img.shields.io/badge/Email-help%40opsknight.com-blue?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
  <a href="https://github.com/dushyant-rahangdale/opsknight/discussions">
    <img src="https://img.shields.io/badge/GitHub-Discussions-24292e?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Discussions" />
  </a>
  <a href="https://github.com/dushyant-rahangdale/opsknight/issues">
    <img src="https://img.shields.io/badge/Issues-Report%20Bug-d73a49?style=for-the-badge&logo=github&logoColor=white" alt="Report Bug" />
  </a>
  <a href="CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge&logo=git&logoColor=white" alt="PRs Welcome" />
  </a>
</div>

We love contributors! Please check our [Contributing Guide](CONTRIBUTING.md) to get started.

---

## ❤️ Support the Project

OpsKnight is an independent open-source project. If it helps you sleep better at night, consider supporting its development.

- **🌟 Star the repo**: It helps others find us.
- **💝 Sponsor**: [Become a Sponsor](https://github.com/sponsors/dushyant-rahangdale)

Built with ❤️ by [Dushyant Rahangdale](https://github.com/dushyant-rahangdale) and these amazing contributors:

### ✨ Contributors

<a href="https://github.com/dushyant-rahangdale/opsknight/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dushyant-rahangdale/opsknight" />
</a>

<br>

[![Star History Chart](https://api.star-history.com/svg?repos=dushyant-rahangdale/opsknight&type=Date)](https://star-history.com/#dushyant-rahangdale/opsknight&Date)
