# Halolmia Admin Panel - Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

#### Step-by-step:

1. **Install Vercel CLI** (optional, for CLI deployment)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from root directory**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_CONVEX_URL` = `https://compassionate-labrador-165.convex.cloud`

5. **Done!** Your admin panel will be live at: `https://your-project.vercel.app`

---

### Option 2: Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project**
   ```bash
   cd apps/admin
   npm run build
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod
   ```

4. **Set Environment Variables**
   - Go to Netlify Dashboard → Site settings → Environment variables
   - Add: `NEXT_PUBLIC_CONVEX_URL` = `https://compassionate-labrador-165.convex.cloud`

---

### Option 3: Manual Deploy (Any Provider)

#### Build the Admin Panel:
```bash
# From project root:
npm install
npm run build -w @halolmia/admin
```

#### The build output will be in:
```
apps/admin/.next/
```

#### Deploy to your hosting provider:
- **Node.js hosting**: Upload the entire `apps/admin` folder
- **Run command**: `npm start` (port 3001 by default)
- **Environment variables**: Set `NEXT_PUBLIC_CONVEX_URL`

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Set up authentication (currently no auth protection!)
- [ ] Add IP whitelist or password protection
- [ ] Configure CORS on Convex backend
- [ ] Use environment-specific Convex URLs
- [ ] Set up monitoring and error tracking

---

## 🌍 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | ✅ Yes | Your Convex backend URL |

---

## 🔗 Useful Commands

```bash
# Development
npm run dev -w @halolmia/admin

# Production build
npm run build -w @halolmia/admin

# Start production server
npm run start -w @halolmia/admin

# Lint
npm run lint -w @halolmia/admin
```

---

## 📱 Access After Deployment

Once deployed, you can access:
- Dashboard: `https://your-domain.com`
- Settings: `https://your-domain.com/settings`
- Listings: `https://your-domain.com/listings`
- Users: `https://your-domain.com/users`

---

## 🆘 Troubleshooting

### Build fails with "Cannot find module '@halolmia/backend'"
**Solution**: Make sure you're building from the monorepo root, not the admin folder.

### Environment variables not working
**Solution**: Restart the dev server after changing `.env.local`

### Vercel deployment fails
**Solution**: Ensure `vercel.json` is in the root directory and properly configured.

---

## 📞 Support

For issues, contact the development team or check the main project README.
