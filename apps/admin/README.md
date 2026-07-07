# Halolmia Admin Panel 🎛️

Admin dashboard for managing the Halolmia marketplace platform.

## 🚀 Quick Start

### Development
```bash
# From project root
npm run dev:services
```

Admin panel will be available at: http://localhost:3001

### Production Build
```bash
npm run build:admin
```

## 📦 Deploy

### Easiest Way (Vercel - One Command)
```bash
npm run deploy:admin
```

Or use the deployment script:
```bash
# Windows
scripts\deploy-admin.cmd vercel

# Mac/Linux
./scripts/deploy-admin.sh vercel
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🎨 Features

- **📊 Dashboard**: Real-time statistics, charts, and analytics
- **📝 Listings**: Approve/reject user listings, manage feed order
- **👥 Users**: View and manage user accounts
- **💳 Payments**: Track payment transactions
- **🎯 Ads**: Manage advertising campaigns
- **🚨 Reports**: Handle user-reported content
- **⚙️ Settings**: Configure platform settings

## 🛠️ Tech Stack

- **Next.js 15** - React framework
- **Convex** - Real-time backend
- **HeroUI** - Component library
- **Recharts** - Data visualization
- **TailwindCSS** - Styling
- **TypeScript** - Type safety

## 🔒 Security Note

⚠️ **Important**: This admin panel currently has no authentication. Before deploying to production:

1. Add authentication (e.g., NextAuth, Clerk)
2. Set up IP whitelisting
3. Use password protection
4. Configure proper CORS

## 🌍 Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats and charts |
| `/listings` | Manage all listings |
| `/users` | User management |
| `/payments` | Payment history |
| `/ads` | Advertising management |
| `/reports` | User reports |
| `/settings` | Platform configuration |

## 🔗 Links

- [Deployment Guide](./DEPLOYMENT.md)
- [Main Project](../../README.md)
- [Convex Backend](../../packages/backend)

## 📞 Support

For issues or questions, contact the development team.
