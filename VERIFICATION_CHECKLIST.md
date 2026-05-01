# MorfApp Deployment Infrastructure Verification Checklist

Use this checklist to verify all components are working before starting CI/CD deployments.

## ✅ Infrastructure Status

### Pre-Productivo (PRE)
- [ ] Frontend accessible: `curl https://pre.morfapp.app` → 200
- [ ] API accessible: `curl https://api-pre.morfapp.app/health` → 200
- [ ] Database has tenant: `psql morfapp_pre -c "SELECT count(*) FROM tenants;"`
- [ ] Admin credentials work: email=`admin@pre`, password=`pre2024!`

### Production (PROD)
- [ ] Frontend accessible: `curl https://morfapp.app` → 200
- [ ] API accessible: `curl https://api.morfapp.app/health` → 200
- [ ] Database has tenant: `psql morfapp -c "SELECT count(*) FROM tenants;"`

### Jenkins
- [ ] Access Jenkins: `curl https://jenkins.morfapp.app/login` → 200
- [ ] Service running: `ssh teo@100.95.233.68 "systemctl status jenkins"` → active
- [ ] Logs clean: `ssh teo@100.95.233.68 "journalctl -u jenkins -n 10"`

### Cloudflare Tunnel
- [ ] Tunnel active: `ssh teo@100.95.233.68 "systemctl status cloudflared"` → active
- [ ] Routes configured: Check `/etc/cloudflared/config.yml`
  - [ ] `jenkins.morfapp.app → localhost:8081`
  - [ ] `api-pre.morfapp.app → localhost:5300`
  - [ ] `pre.morfapp.app → localhost:4000`
  - [ ] `api.morfapp.app → localhost:5500`
  - [ ] `morfapp.app → localhost:3900`

## 🔧 Jenkins Configuration

### Credentials Set Up
- [ ] SSH key for `teo@100.95.233.68` added to Jenkins
  - **ID**: `server-ssh-key`
  - **Type**: SSH Username with private key
- [ ] Server sudo password added
  - **ID**: `server-sudo-password`
  - **Type**: Secret text
  - **Value**: `!QAZxsw2`
- [ ] GitHub credentials added (if using webhooks)
  - **Type**: GitHub with personal access token

### Pipeline Jobs Created
- [ ] `morfapp-pre-api` — Backend → PRE (Jenkinsfile.pre)
- [ ] `morfapp-pre-web` — Frontend → PRE (Jenkinsfile.pre)
- [ ] `morfapp-prod-api` — Backend → PROD (Jenkinsfile.prod)
- [ ] `morfapp-prod-web` — Frontend → PROD (Jenkinsfile.prod)

## 🧪 Test Deployments

### Test PRE Backend Deployment
1. [ ] Trigger `morfapp-pre-api` → Build Now
2. [ ] Console output shows successful stages
3. [ ] Verify: `curl https://api-pre.morfapp.app/health` → 200
4. [ ] Check service: `ssh teo@100.95.233.68 "systemctl status morfapp-pre-api"`

### Test PRE Frontend Deployment
1. [ ] Trigger `morfapp-pre-web` → Build Now
2. [ ] Console output shows successful stages
3. [ ] Verify: `curl https://pre.morfapp.app` → 200
4. [ ] Check service: `ssh teo@100.95.233.68 "systemctl status morfapp-pre-web"`

### Test PROD Backend Deployment (SAFE - requires confirmation)
1. [ ] Trigger `morfapp-prod-api` → Build with Parameters
2. [ ] Set **CONFIRM_PRODUCTION = true**
3. [ ] Set **DEPLOY_WHAT = backend**
4. [ ] Console output shows successful stages
5. [ ] Verify: `curl https://api.morfapp.app/health` → 200

### Test PROD Frontend Deployment
1. [ ] Trigger `morfapp-prod-web` → Build with Parameters
2. [ ] Set **CONFIRM_PRODUCTION = true**
3. [ ] Set **DEPLOY_WHAT = frontend**
4. [ ] Console output shows successful stages
5. [ ] Verify: `curl https://morfapp.app` → 200

## 📡 GitHub Webhooks (Optional)

- [ ] Webhook created in GitHub repo settings
  - **URL**: `https://jenkins.morfapp.app/github-webhook/`
  - **Events**: Push events
  - **Active**: Checked
- [ ] Jenkins jobs configured to trigger on GitHub push
  - [ ] `morfapp-pre-api` has "Trigger builds by pushing to GitHub"
  - [ ] `morfapp-pre-web` has "Trigger builds by pushing to GitHub"

## 🚀 Deployment Workflow

### Typical Workflow

```
1. Developer pushes to master/main
   ↓
2. GitHub webhook triggers Jenkins
   ↓
3. morfapp-pre-api builds and deploys to PRE
4. morfapp-pre-web builds and deploys to PRE
   ↓
5. PRE health checks pass
   ↓
6. (When ready for PROD) Manually trigger morfapp-prod-* with CONFIRM_PRODUCTION=true
```

## 📋 Quick Commands

### Check Service Status
```bash
ssh teo@100.95.233.68 "systemctl status morfapp-pre-api morfapp-pre-web morfapp-api morfapp-web jenkins"
```

### View Jenkins Logs
```bash
ssh teo@100.95.233.68 "journalctl -u jenkins -n 50 -f"
```

### Restart Services Manually
```bash
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"
```

### Check Cloudflare Tunnel
```bash
ssh teo@100.95.233.68 "systemctl status cloudflared --no-pager | head -20"
```

## ⚠️ Troubleshooting

### Jenkins job fails with SSH error
- [ ] Verify SSH key is correct (from `~/.ssh/id_rsa`)
- [ ] Ensure key is in Jenkins credentials with ID `server-ssh-key`
- [ ] Test SSH manually: `ssh -i <your-key> teo@100.95.233.68 "echo OK"`

### Deployment service not starting
- [ ] Check service logs: `ssh teo@100.95.233.68 "systemctl status morfapp-pre-api -n 20"`
- [ ] Verify environment variables in service file
- [ ] Check database connection: `psql morfapp_pre -c "SELECT 1"`

### API returning 502
- [ ] Check if service is running: `systemctl status morfapp-pre-api`
- [ ] Check if port is bound: `ss -tlnp | grep 5300`
- [ ] Check API logs on server

### Frontend showing blank page
- [ ] Check if service is running: `systemctl status morfapp-pre-web`
- [ ] Verify NEXT_PUBLIC_API_URL is set correctly in .env
- [ ] Check build output in Jenkins console

---

**Status**: Ready for continuous deployment! 🎉

Once all checks pass, Jenkins will automatically deploy PRE on every push to master.
Production deployments require manual confirmation.
