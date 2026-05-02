# ✅ Jenkins Setup Complete — Final Steps

## What's Already Done
- ✅ Jenkins 2.555.1 running on `https://jenkins.morfapp.app` (port 8081)
- ✅ Java 21 installed and configured
- ✅ 4 pipeline jobs created:
  - `morfapp-pre-api` (Backend → PRE)
  - `morfapp-pre-web` (Frontend → PRE)
  - `morfapp-prod-api` (Backend → PROD)
  - `morfapp-prod-web` (Frontend → PROD)
- ✅ Jenkinsfiles.pre and Jenkinsfile.prod ready in repo

## What You Need To Do (Via Jenkins UI)

### Step 1: Initial Admin Setup
1. Go to **https://jenkins.morfapp.app**
2. **Unlock Jenkins** with initial password: `56d3237cddbd49adae83c80c81990d0d`
3. Click **"Install suggested plugins"**
4. Create your admin user:
   - Email: your email
   - Username: `admin`
   - Password: strong password (save it!)

### Step 2: Add Credentials (2 total)

Go to **Manage Jenkins → Credentials → System → Global credentials**

#### Credential 1: SSH Key for Server Access
1. Click **"Add credentials"**
2. **Kind**: SSH Username with private key
3. **Scope**: Global
4. **Username**: `teo`
5. **Private Key**: (Enter directly)
   - Paste contents of `/home/teo/.ssh/id_rsa` from the server, OR
   - Run this to get it:
     ```bash
     ssh teo@100.95.233.68 "cat ~/.ssh/id_rsa"
     ```
   - Paste the full output (including BEGIN/END lines)
6. **Passphrase**: Leave empty
7. **ID**: `server-ssh-key`
8. **Description**: `Server SSH (teo@100.95.233.68)`
9. Click **"Create"**

#### Credential 2: Sudo Password
1. Click **"Add credentials"** again
2. **Kind**: Secret text
3. **Scope**: Global
4. **Secret**: `!QAZxsw2`
5. **ID**: `server-sudo-password`
6. **Description**: `Server sudo password`
7. Click **"Create"**

### Step 3: Update Job Repositories

Each of the 4 jobs needs to point to your GitHub repository. Update them one by one:

1. Go to **morfapp-pre-api**
2. Click **"Configure"**
3. Under **Pipeline → Definition → SCM**:
   - Change repository URL from `https://github.com/mateo-yourusername/morfapp.git` 
   - To your actual repository URL
4. Click **"Save"**
5. **Repeat for other 3 jobs**

### Step 4: Test PRE Deployments

1. Go to **morfapp-pre-api**
2. Click **"Build Now"** (or **"Build with Parameters"**)
3. Watch the console output
4. When done, verify: `curl https://api-pre.morfapp.app/health`
5. Repeat for **morfapp-pre-web**

### Step 5: GitHub Webhooks (Optional but Recommended)

1. Go to your GitHub repo: **Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://jenkins.morfapp.app/github-webhook/`
3. **Content type**: `application/json`
4. **Events**: Push events
5. **Active**: Checked
6. Click **"Add webhook"**

7. Back in Jenkins, for each **PRE job**:
   - Click **"Configure"**
   - Check **"Trigger builds by pushing to GitHub"**
   - Click **"Save"**

## Verification Checklist

```bash
# Check services running
ssh teo@100.95.233.68 "systemctl status morfapp-pre-{api,web} morfapp-{api,web} jenkins"

# Check health
curl https://api-pre.morfapp.app/health         # Should be 200
curl https://pre.morfapp.app                    # Should be 200
curl https://jenkins.morfapp.app                # Should load Jenkins UI

# Check server routes
ssh teo@100.95.233.68 "cat /etc/cloudflared/config.yml | grep -A1 -B1 morfapp"
```

## Manual Deploy Commands (If Jenkins Fails)

### Deploy to PRE Backend
```bash
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"
```

### Deploy to PRE Frontend
```bash
cd front
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-web && tar -xzf /tmp/morfapp-pre-frontend.tar.gz && rm /tmp/morfapp-pre-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"
```

## Troubleshooting

**Jenkins job won't start building:**
- Check SSH credential is added and has correct key
- Check sudo password credential is set correctly
- View job logs: click job → "Console Output"

**Build fails with SSH error:**
- Verify SSH key in credentials matches `/home/teo/.ssh/id_rsa`
- Test manually: `ssh -i ~/.ssh/id_rsa teo@100.95.233.68 "echo OK"`

**Services not starting:**
- Check: `ssh teo@100.95.233.68 "systemctl status morfapp-pre-api -n 20"`
- Check logs: `journalctl -u morfapp-pre-api -n 50`

**API returning 502:**
- Check service: `systemctl status morfapp-pre-api`
- Check port: `ss -tlnp | grep 5300` (should show morfapp-pre-api)

---

## Next Steps After Setup
1. ✅ Do manual PRE deployments via Jenkins to verify everything works
2. ✅ Once comfortable, test PROD deployments (requires CONFIRM_PRODUCTION=true)
3. ✅ Set up GitHub webhooks for automatic PRE deployments on push
4. ✅ Create deployment checklist/runbook for team

**Estimated setup time**: 15-20 minutes via UI ⏱️
