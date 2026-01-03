# Encryption System User Guide

## Overview

OpsSentinel uses a **Zero-Trust, Fault-Tolerant** encryption system to secure sensitive credentials (SSO Client Secrets, Slack Tokens, API Keys).

## 1. First Time Setup (Bootstrap)

When you first access **System Settings**, the Encryption Key will be unconfigured.

1.  Click **"Generate"** to create a secure 32-byte (64 char) hex key.
2.  **CRITICAL**: Click the **Copy (📋)** button and save this key in your Password Manager (1Password, Bitwarden, etc.).
3.  Check the box **"I have saved this key"**.
4.  Click **"Save Encryption Key"**.

> **Note**: The system will explicitly refuse to save if you do not confirm you have backed up the key.

## 2. Key Rotation (Routine Maintenance)

To change your encryption key (e.g. every 90 days):

1.  Click **"Replace Key"**.
2.  Generate or Paste your **New Key**.
3.  Ensure the **"Safe Key Rotation"** box is checked.
4.  Click **"Save Encryption Key"**.

### What happens?

The system performs an **Atomic Transaction**:

1.  Decrypts all data with the _Current_ key.
2.  Re-encrypts all data with the _New_ key.
3.  updates the Verification Canary.
4.  Saves everything at once.

> **Failure Safety**: If the system cannot decrypt your data (e.g. corruption), the rotation **ABORTS**. Your data remains safe and encrypted with the Old Key.

## 3. Disaster Recovery (Emergency Mode)

If you see the Red **"Emergency Recovery Mode"** alert:

**Cause**: The database contains encrypted data, but the stored key is invalid (e.g. bad DB restore, manual tampering).

**Resolution**:

1.  Retrieve your **Original Master Key** from your Password Manager.
2.  Paste it into the input field.
3.  Click **"Save Encryption Key"**.
4.  The system will validate the key against the "Canary". If it works, the system unlocks immediately.

## FAQ

**Q: What if I lost my key?**
A: Since this is a zero-trust system, lost keys mean **Data Loss**. You will need to Reset the key (entering a new one during Emergency Mode) and legally manually re-enter all your Client Secrets and Tokens.

**Q: Can I use `process.env.ENCRYPTION_KEY`?**
A: Yes, but it is treated as a fallback. The **Database Key** (System Settings) takes priority. We recommend managing the key via the UI for the safety features (Canary, Rotation) which `.env` cannot provide.

**Q: If I restore an old database encrypted with a different key, can I just "Rotate" to a new key?**
A: **No.** Rotation requires the _current_ system key to be able to decrypt the _current_ data.

- If you have a mismatch (Old DB + Wrong Key), the system effectively cannot read the data, so it cannot re-encrypt it.
- **Solution**: You must first use **Emergency Recovery** to restore the _Original Key_ that matches the old database. Once the system unlocks (files are readable), you can _then_ perform a Safe Rotation to a new key.
