---
description: How to recover from a Critical Encryption Key Mismatch (Safe Mode)
---

# Emergency Recovery: Encryption Key Mismatch

If you see the **"Emergency Recovery Mode"** alert in System Settings, it means the stored encryption key is invalid or corrupted (e.g., due to a bad DB restore or manual tampering).

The system has automatically entered **Safe Mode** to prevent data corruption. All write operations to encrypted fields are blocked.

### Resolution Steps

1.  **Locate your Master Key**: Find the original 64-character hex key used when the system was first set up. Checks your password manager or secure notes.
2.  **Navigate to System Settings**: Go to `/settings/system`.
3.  **Use the Recovery Form**:
    - The "Encryption Key" section will be highlighted in **Red**.
    - Enter your **Master Key** into the input field.
    - Click **"Save Key"**.
4.  **Verification**:
    - The system will attempt to decrypt the "Canary" value with the entered key.
    - **If successful**: The "Emergency Mode" alert will disappear, and full system functionality will be restored immediately.
    - **If failed**: You will see an error "Invalid Key". Double-check your backup.

### If Key is Lost

If you have absolutely lost the original key:

1.  You must reset the encryption system.
2.  **Warning**: This means all currently encrypted data (SSO Secrets, Slack Tokens) will be **permanently unreadable**.
3.  Enter a **NEW** key in the form.
4.  The system will accept it (overwriting the old one), but you will need to manually re-enter all Client Secrets and Tokens in their respective settings pages.
