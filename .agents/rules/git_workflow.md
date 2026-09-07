---
trigger: always_on
description: Mandatory Git and Pull Request workflow rules for OpsKnight
---

# Git Workflow & Pull Request Rules

1. **Feature Branches Only**:
   - Every modification, feature, or bugfix must be executed on a dedicated feature branch (`feat/...`, `fix/...`, `perf/...`, `docs/...`).
   - Never commit directly to `main` or `master`.

2. **NEVER Direct Merge**:
   - Under no circumstances execute `git merge`, `gh pr merge`, or configure direct auto-merges into `main` or `master`.

3. **User Review Requirement**:
   - Once work is complete and verified, push the feature branch to `origin` and open a Pull Request.
   - Provide the PR link directly to the user and **stop**.
   - Always wait for explicit user review and approval before any merge activity.
