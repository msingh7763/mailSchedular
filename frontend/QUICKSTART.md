# 🚀 Quick Start Guide

## 5-Minute Setup

### Step 1: Get Google Client ID (2 min)
```
1. Go to https://console.cloud.google.com/
2. Create new project or use existing
3. APIs & Services → Credentials
4. Create OAuth 2.0 Web Application
5. Add http://localhost:3000 to authorized URIs
6. Copy Client ID
```

### Step 2: Configure Environment (30 sec)
```bash
# Create .env.local in frontend/ directory
VITE_GOOGLE_CLIENT_ID=paste_your_client_id_here
VITE_API_BASE_URL=http://localhost:5000/api
```

### Step 3: Install & Run (2 min)
```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:3000`

---

## 📋 Available Scripts

```bash
# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🏗 Project Layout

| File | Purpose |
|------|---------|
| `src/main.tsx` | App entry point |
| `src/pages/Login.tsx` | OAuth login page |
| `src/pages/Dashboard.tsx` | Main dashboard |
| `src/components/ComposeEmailModal.tsx` | Email composer |
| `src/context/AuthContext.tsx` | Auth state |
| `src/types.ts` | TypeScript types |
| `tailwind.config.js` | Tailwind customization |

---

## 🔑 Key Features

✅ Google OAuth authentication
✅ Email scheduling with rate limiting
✅ CSV/TXT file upload
✅ Responsive design (mobile + desktop)
✅ Dashboard with tabs (Scheduled/Sent)
✅ Real-time stats
✅ Form validation
✅ Loading & error states

---

## 🔌 Backend API Endpoints

Your backend needs these endpoints:

```
POST /api/emails/schedule
- Schedule new email campaign
- Body: { subject, body, recipients[], startTime, delayBetweenEmails, hourlyLimit }

GET /api/emails?status=scheduled|sent
- Get emails by status
- Returns: Email[]
```

All requests need: `Authorization: Bearer <google_oauth_token>`

---

## 📱 Component Quick Reference

### Login Page
- Shows OAuth button
- Displays features list
- Redirects authenticated users to dashboard

### Dashboard
- Welcome greeting
- Email stats (scheduled/sent count)
- Two tabs: Scheduled, Sent emails
- Compose button
- Table/card view

### Compose Modal
- Step 1: Email content (subject + body)
- Step 2: Recipients (file upload)
- Step 3: Schedule (start time, delay, hourly limit)
- Estimated duration calculator

---

## 🎨 Customization

### Change Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  primary: {
    600: '#your_color_here',
    // ...
  }
}
```

### Change Fonts
Edit `src/index.css`:
```css
body {
  font-family: 'Your Font', sans-serif;
}
```

### Change API Base URL
Edit `.env.local`:
```
VITE_API_BASE_URL=your_api_url
```

---

## ⚡ Performance Tips

- Images are lazy-loaded
- Code is automatically split by Vite
- CSS is minified in production
- No unused code is bundled (tree-shaking)

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Google login not working | Check Client ID, authorized URIs |
| API calls failing | Verify backend URL in .env.local |
| Styling looks wrong | Clear cache, rebuild with `npm run build` |
| TypeScript errors | Run `npm install` to update types |

---

## 📦 Build Size

**Development**: ~500KB (with source maps)
**Production**: ~150KB (minified + gzipped)

---

## 🚢 Deployment

### Build
```bash
npm run build
```

### Deploy `dist/` folder to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Any static host

---

## 🔐 Security Checklist

- ✅ HTTPS in production
- ✅ JWT token in Authorization header
- ✅ OAuth credentials secure
- ✅ No secrets in code
- ✅ Environment variables used
- ✅ CORS configured properly
- ✅ Input validation on forms

---

## 📊 File Structure

```
frontend/
├── src/
│   ├── components/        (React components)
│   ├── pages/            (Page components)
│   ├── context/          (State management)
│   ├── main.tsx          (Entry point)
│   ├── types.ts          (TypeScript types)
│   └── index.css         (Global styles)
├── public/               (Static assets)
├── dist/                 (Production build)
├── node_modules/         (Dependencies)
├── index.html            (HTML template)
├── package.json          (Config)
├── tsconfig.json         (TS config)
├── vite.config.ts        (Build config)
└── tailwind.config.js    (Tailwind config)
```

---

## 💡 Tips

- Use TypeScript for type safety
- Check browser console for errors
- Use React DevTools extension
- Test on mobile devices
- Monitor network tab in DevTools
- Use error boundaries for crash handling

---

## 🎓 Learning Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Router](https://reactrouter.com/)

---

## ✅ Before Going to Production

- [ ] Google OAuth configured
- [ ] Backend API endpoints working
- [ ] Environment variables set
- [ ] Build succeeds without errors
- [ ] Tested on mobile devices
- [ ] HTTPS configured
- [ ] Error handling implemented
- [ ] Loading states visible
- [ ] Form validation working
- [ ] API error handling implemented

---

**Questions?** Check FRONTEND_COMPLETE.md for detailed documentation.

Happy coding! 🚀
