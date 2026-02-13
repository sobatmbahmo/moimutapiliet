# 🚀 DEPLOYMENT GUIDE - Production Launch

**Date**: February 13, 2026
**Status**: READY TO DEPLOY
**Timeline**: 30-60 minutes depending on host

---

## 🎯 **Choose Your Hosting**

### **Option A: Vercel** ✅ (RECOMMENDED - Easiest)
- **Cost**: Free tier available, $20/month for pro
- **Setup Time**: 5-10 minutes
- **Best for**: Next.js projects, but works great with Vite
- **Pros**: Auto-deploy on git push, unlimited deployments

### **Option B: Netlify** ✅ (Easy)
- **Cost**: Free tier available, $19/month for pro
- **Setup Time**: 5-10 minutes
- **Best for**: Static sites, SPA
- **Pros**: Simple, good free tier

### **Option C: Self-hosted (DigitalOcean/AWS)** ⏳ (Advanced)
- **Cost**: $5-20/month minimum
- **Setup Time**: 30-60 minutes
- **Best for**: Full control, custom features
- **Pros**: Cheaper long-term, more control

---

## 📋 **Pre-Deployment Checklist**

Before deploying, verify:

- [ ] `.env` is NOT pushed to GitHub (check .gitignore)
- [ ] All environment variables are ready
- [ ] Dev server works: `npm run dev` ✓
- [ ] Build succeeds: `npm run build` (test below)
- [ ] No console errors
- [ ] Git status clean
- [ ] Latest code pushed to GitHub

---

## 🏗️ **Build & Test Locally**

```bash
# Build for production
npm run build

# This creates a 'dist' folder (this is what gets deployed)
# The dist folder is optimized, minified, ready for production
```

If build fails:
```bash
# Check for errors
npm run build -- --verbose

# Common issues:
# - Import errors (check file paths)
# - Missing environment variables
# - Syntax errors in code
```

---

## 📤 **Option A: Deploy to Vercel**

### **Step 1: Connect GitHub**
1. Go to https://vercel.com
2. Click "Import Project"
3. Select "From Git Repository"
4. Connect your GitHub account
5. Select `sobatmbahmo/moimutapiliet` repo

### **Step 2: Configure Project**
```
Framework: Vite
Build Command: npm run build
Output Directory: dist
[Next]
```

### **Step 3: Add Environment Variables**
Click "Environment Variables" and add:
```
VITE_SUPABASE_URL = https://sflnecqovkzfnrbsoawo.supabase.co
VITE_SUPABASE_KEY = sb_publishable_H6LRAFl1SQkXJ-3ZbOOqAw_9H2WwPir
VITE_FONNTE_TOKEN = rUanTDbsyiRTN9nqTp6v
VITE_SENTRY_DSN = [get from Sentry.io if using]
```

### **Step 4: Deploy**
```
Click "Deploy"
Wait 3-5 minutes
✅ Live at: https://moimutapiliet-[randomid].vercel.app
```

### **Step 5: Setup Custom Domain (Optional)**
1. Buy domain (Namecheap, GoDaddy, etc)
2. Vercel → Settings → Domains
3. Add your domain
4. Update DNS records

---

## 📤 **Option B: Deploy to Netlify**

### **Step 1: Connect GitHub**
1. Go to https://netlify.com
2. Click "Add new site"
3. Select "Import an existing project"
4. Connect GitHub
5. Select repository

### **Step 2: Configure**
```
Base directory: (leave empty)
Build command: npm run build
Publish directory: dist
```

### **Step 3: Environment Variables**
Netlify → Site settings → Build & deploy → Environment
Add same variables as Vercel above

### **Step 4: Deploy**
```
Click "Deploy site"
Wait 2-3 minutes
✅ Live at: https://[sitename].netlify.app
```

---

## 💻 **Option C: Self-Hosted (DigitalOcean)**

### **Step 1: Create Droplet**
```
1. DigitalOcean.com → Create → Droplet
2. Image: Ubuntu 22.04
3. Size: $5/month (enough for this project)
4. Region: Singapore (close to Indonesia)
5. Authentication: SSH key
6. Create Droplet
```

### **Step 2: Setup Server**
```bash
# SSH to your server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2 (for running app 24/7)
npm install -g pm2

# Install Nginx (reverse proxy)
apt install -y nginx
```

### **Step 3: Deploy Code**
```bash
# Clone your repo
cd /var/www
git clone https://github.com/sobatmbahmo/moimutapiliet.git
cd moimutapiliet

# Install dependencies
npm install

# Build
npm run build

# Create environment file
nano .env
# (paste your environment variables)
# Save: Ctrl+X, Y, Enter
```

### **Step 4: Start App with PM2**
```bash
# Create simple start script
cat > start.js << 'EOF'
const express = require('express');
const { createServer } = require('vite');

const app = express();
app.use(express.static('dist'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
EOF

# OR use simple HTTP server for dist folder
pm2 serve dist --name moimutapiliet

# Make PM2 start on server reboot
pm2 startup
pm2 save
```

### **Step 5: Setup Nginx Proxy**
```bash
# Edit Nginx config
nano /etc/nginx/sites-available/default

# Replace with:
server {
    listen 80;
    server_name your_domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Save and test
nginx -t

# Reload Nginx
systemctl reload nginx
```

### **Step 6: Setup SSL (Free with Certbot)**
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your_domain.com
# Follow prompts
```

---

## 🔍 **Post-Deployment Verification**

After deployment:

### **1. Access your site**
```
Open: https://your-domain.com
Expected: Should load without errors
```

### **2. Test validations**
```
Try invalid email in login
Expected: Error message shows
```

### **3. Check console for errors**
```
Open DevTools (F12)
Console tab
Expected: No red errors
```

### **4. Test key features**
```
- Register account
- Login
- View products
- Create order
- Check WhatsApp notification received
```

### **5. Monitor errors**
```
If using Sentry:
- Go to Sentry.io dashboard
- Should show no critical errors
```

### **6. Check performance**
```
Lighthouse (Chrome DevTools)
Expected:
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
```

---

## 🚨 **Troubleshooting**

### **"Cannot find module" error**
```
Solution: npm install
# Make sure all dependencies installed
```

### **"Cannot read properties of undefined"**
```
Solution: Check environment variables
# Make sure VITE_SUPABASE_URL is set
```

### **"CORS error"**
```
Solution: 
- Add your domain to Supabase allowed origins
- Supabase → Project Settings → Auth → Redirect URLs
- Add: https://your-domain.com
```

### **"WhatsApp notifications not working"**
```
Solution:
- Check VITE_FONNTE_TOKEN in environment
- Verify Fonnte account is active
- Check customer phone number format
```

### **"Orders not showing"**
```
Solution:
- If RLS enabled: Check RLS policies
- Check user is logged in
- Check Supabase connection in Network tab
```

---

## 📊 **Deployment Checklist**

- [ ] Code pushed to GitHub
- [ ] All environment variables ready
- [ ] Build succeeds locally
- [ ] Hosting provider chosen
- [ ] Deployment executed
- [ ] Domain configured (if using custom)
- [ ] SSL certificate active (HTTPS working)
- [ ] All features tested
- [ ] No console errors
- [ ] Sentry dashboard shows no critical errors
- [ ] WhatsApp notifications working
- [ ] Database connection working
- [ ] RLS policies working (if enabled)

---

## 📈 **After Going Live**

### **Day 1**
- Monitor Sentry for errors
- Check performance metrics
- Test with real users

### **Week 1**
- Monitor daily
- Fix any critical bugs
- Adjust RLS policies if needed

### **Week 2-4**
- Analyze user behavior
- Monitor server logs
- Plan Priority 2 features

---

## 🎯 **Success Criteria**

✅ Deployment successful when:
- Site loads at https://your-domain.com
- All validations working
- No console errors
- WhatsApp notifications sent
- Orders saved to Supabase
- Users can login/register
- Admin dashboard accessible
- RLS policies working (if enabled)
- Performance acceptable

---

## 💡 **Recommended Deployment Path**

**For quickest launch:**
```
1. Choose Vercel (easiest)
2. Connect GitHub
3. Add environment variables
4. Deploy (5 min)
5. Test (5 min)
6. Add custom domain (optional, 10 min)
Total: 20 minutes
```

**For full control:**
```
1. DigitalOcean droplet ($5/month)
2. Setup Node.js + PM2
3. Deploy code
4. Setup Nginx + SSL
Total: 30-60 minutes
```

---

## 📞 **Support Resources**

- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- DigitalOcean Docs: https://docs.digitalocean.com
- Supabase Docs: https://supabase.com/docs
- Vite Docs: https://vitejs.dev

---

**Ready to deploy? Let's go! 🚀**
