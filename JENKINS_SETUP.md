# Jenkins Setup Guide for MorfApp

Jenkins is now running at **https://jenkins.morfapp.app** and ready for configuration.

## Step 1: Complete Jenkins Initial Setup

1. **Go to https://jenkins.morfapp.app/login**
2. **Unlock Jenkins:**
   - Paste the initial admin password: `56d3237cddbd49adae83c80c81990d0d`
3. **Install Suggested Plugins**
   - Select "Install suggested plugins"
   - Wait for installation to complete
4. **Create First Admin User**
   - Email: your email
   - Username: `admin` (or your preferred username)
   - Password: strong password (save it!)

## Step 2: Add Server Credentials to Jenkins

These credentials are used by pipelines to connect to the server and deploy.

### Add SSH Credentials (for SCP/SSH)

1. Go to **Jenkins Dashboard → Manage Jenkins → Credentials**
2. Click **"(global)" scope → Add credentials**
3. Fill in:
   - **Kind**: SSH Username with private key
   - **Scope**: Global
   - **Username**: `teo`
   - **Private Key**: Paste your SSH private key (from your local machine)
     ```bash
     # On your local machine:
     cat ~/.ssh/id_rsa  # or your SSH key path
     ```
   - **ID**: `server-ssh-key`
   - **Description**: Server SSH (teo@100.95.233.68)
4. Click **Create**

### Add Sudo Password Credential

1. Go to **Manage Jenkins → Credentials**
2. Click **(global) → Add credentials**
3. Fill in:
   - **Kind**: Secret text
   - **Scope**: Global
   - **Secret**: `!QAZxsw2` (the server sudo password)
   - **ID**: `server-sudo-password`
   - **Description**: Server sudo password
4. Click **Create**

## Step 3: Create Pipeline Jobs

### Job 1: morfapp-pre-api (Backend → PRE)

1. Go to **Jenkins Dashboard → New Item**
2. Enter name: `morfapp-pre-api`
3. Select **Pipeline**
4. Click **OK**
5. Under **Pipeline**:
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: `https://github.com/YOUR_GITHUB_USERNAME/morfapp.git`
   - **Credentials**: Select your GitHub credentials (create one if needed)
   - **Branch**: `*/master` (or `*/main`)
   - **Script Path**: `Jenkinsfile.pre`
6. **Save**

### Job 2: morfapp-pre-web (Frontend → PRE)

Repeat the above but:
- **Name**: `morfapp-pre-web`
- **Script Path**: `Jenkinsfile.pre`

### Job 3: morfapp-prod-api (Backend → PROD)

Repeat but:
- **Name**: `morfapp-prod-api`
- **Script Path**: `Jenkinsfile.prod`
- Add **Build Parameters**:
  - **Type**: Boolean
  - **Name**: `CONFIRM_PRODUCTION`
  - **Default**: unchecked

### Job 4: morfapp-prod-web (Frontend → PROD)

Repeat but:
- **Name**: `morfapp-prod-web`
- **Script Path**: `Jenkinsfile.prod`

## Step 4: Set Up GitHub Webhooks (Optional)

To auto-trigger PRE deployments on push to GitHub:

1. In your GitHub repository: **Settings → Webhooks → Add webhook**
2. Fill in:
   - **Payload URL**: `https://jenkins.morfapp.app/github-webhook/`
   - **Content type**: `application/json`
   - **Events**: Push events
   - **Active**: Checked
3. Click **Add webhook**
4. Back in Jenkins: Add GitHub credentials to your pipeline jobs:
   - **Manage Jenkins → Credentials**
   - **Add credentials → GitHub**
   - Paste your GitHub personal access token (PAT)

Then in each **Pipeline job settings**:
- Check **"Trigger builds by pushing to GitHub"**

## Step 5: Test Deployments

### Test PRE Deployment (Manual)

1. Go to **morfapp-pre-api job → Build Now**
2. Watch the console output
3. When complete, verify: `curl https://api-pre.morfapp.app/health`

### Test PROD Deployment (Manual - with approval)

1. Go to **morfapp-prod-api job → Build with Parameters**
2. Check **CONFIRM_PRODUCTION = true**
3. Select **DEPLOY_WHAT = backend**
4. Click **Build**
5. Watch console

## Troubleshooting

### Pipeline fails with SSH error
- Verify SSH key is added to Jenkins credentials
- Check key format (should be PEM format)
- Ensure key has no password (or use SSH agent forwarding)

### Pipeline fails with sudo password error
- Verify `server-sudo-password` credential is set correctly
- Password is `!QAZxsw2`

### Services not restarting on server
```bash
# Check service status manually
ssh teo@100.95.233.68
systemctl status morfapp-pre-api
systemctl status morfapp-pre-web
```

### Check Jenkins logs
```bash
ssh teo@100.95.233.68
journalctl -u jenkins -f  # Follow Jenkins logs
```

## Architecture

```
GitHub Push
    ↓
GitHub Webhook → jenkins.morfapp.app
    ↓
Jenkins Pipeline (morfapp-pre-api)
    ├─ Checkout code
    ├─ Build .NET (dotnet publish)
    ├─ Upload to server (scp)
    ├─ Restart service (systemctl)
    └─ Health check

Similarly for PRE frontend and PROD (with manual approval gate)
```

## Environment Variables in Pipelines

Each Jenkinsfile sets environment variables for:
- **Build**: .NET 9, Node 20
- **Deployment**: service names, directories, URLs
- **Server**: connection details (SERVER_HOST, SERVER_USER)

These can be customized in each job's **Definition** section if needed.

---

**Next**: Once Jenkins jobs are created and tested, all deployments to PRE happen automatically on push to master. Production deployments require manual trigger with confirmation checkbox.
