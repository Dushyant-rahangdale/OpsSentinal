# Security Scanning Setup

This document explains how to enable security scanning features in GitHub.

## Code Scanning Setup

The workflows use CodeQL and Trivy for security scanning. To enable full functionality:

### Enable Code Scanning

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Security** > **Code scanning**
3. Click **Set up** or **Configure code scanning**
4. Choose **Set up with GitHub Actions**
5. The workflows will automatically use code scanning once enabled

### Alternative: Manual Setup

If you prefer not to enable code scanning, the workflows will still:
- ✅ Run security scans (Trivy, npm audit)
- ✅ Show results in workflow logs
- ⚠️ Skip uploading to GitHub Security tab (will show warnings but won't fail)

## Current Behavior

The workflows are configured to:
- **Continue on error** for security uploads
- **Show scan results** in workflow logs
- **Not block deployments** if code scanning is not enabled

## Workflows

### Security Workflow (`.github/workflows/security.yml`)
- Runs on push to main, PRs, and weekly schedule
- Includes:
  - Dependency review (PRs only)
  - NPM audit
  - CodeQL analysis (optional)
  - Docker image scanning with Trivy

### CD Workflow Security Scan
- Runs Trivy scan on production images
- Shows results in workflow summary
- Attempts to upload to GitHub Security (optional)

## Viewing Results

### Without Code Scanning Enabled
- Check workflow logs for scan results
- Trivy output is shown in the workflow summary
- NPM audit results are uploaded as artifacts

### With Code Scanning Enabled
- Results appear in **Security** > **Code scanning** tab
- Alerts are created for vulnerabilities
- Historical tracking of security issues

## Troubleshooting

### "Code scanning is not enabled" Warning
This is expected if code scanning is not enabled. The workflow will:
- Still run the scans
- Show results in logs
- Continue without failing

### "Resource not accessible by integration" Error
This happens when:
- Code scanning is not enabled, OR
- Workflow permissions are insufficient

**Solution:** Enable code scanning (see above) or ignore the error (workflow continues).

## Recommendations

1. **Enable code scanning** for full security visibility
2. **Review scan results** regularly
3. **Fix critical vulnerabilities** before production releases
4. **Monitor security alerts** in the Security tab

For more information, see [GitHub Code Scanning Documentation](https://docs.github.com/en/code-security/code-scanning).

