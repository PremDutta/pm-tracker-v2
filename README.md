# 🎯 PM Jobs Tracker

A beautiful, Apple-inspired job aggregator for Product Manager & Senior PM roles across India.

![PM Jobs Tracker](https://img.shields.io/badge/PM%20Jobs-Tracker-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Features

- 🔗 **12 Job Platforms**: LinkedIn, Naukri, Instahyre, Indeed, Glassdoor, Foundit, Wellfound, Cutshort, Levels.fyi, Hirist, Shine, Apna
- 📍 **5 Locations**: Noida, Delhi, Gurugram, Bengaluru, Hyderabad
- 🎯 **2 Roles**: Product Manager & Senior Product Manager
- ⚡ **120 Search Combinations**: All jobs sorted by most recent
- 🎨 **Apple-inspired Design**: Clean, dark mode interface
- 📱 **Fully Responsive**: Works on all devices

## 🚀 Quick Start

### Option 1: Deploy to GitHub Pages (Free Hosting)

#### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Name it `pm-jobs-tracker`
4. Keep it **Public**
5. Click **Create repository**

#### Step 2: Upload Files

**Option A: Using GitHub Web Interface (Easiest)**

1. In your new repo, click **"uploading an existing file"**
2. Drag and drop ALL the files from this project
3. Click **Commit changes**

**Option B: Using Git Command Line**

```bash
# Clone your empty repo
git clone https://github.com/YOUR_USERNAME/pm-jobs-tracker.git
cd pm-jobs-tracker

# Copy all project files here, then:
git add .
git commit -m "Initial commit"
git push origin main
```

#### Step 3: Update package.json

Edit `package.json` and replace `YOUR_GITHUB_USERNAME` with your actual GitHub username:

```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/pm-jobs-tracker"
```

#### Step 4: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under "Build and deployment":
   - Source: **GitHub Actions**
3. Create a file `.github/workflows/deploy.yml` with this content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

#### Step 5: Access Your Site

After a few minutes, your site will be live at:
```
https://YOUR_USERNAME.github.io/pm-jobs-tracker
```

---

### Option 2: Deploy to Vercel (Even Easier)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your `pm-jobs-tracker` repository
4. Click **Deploy**
5. Done! Your site is live in ~60 seconds

---

### Option 3: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in
2. Drag & drop the `build` folder (after running `npm run build`)
3. Or connect your GitHub repo for auto-deploys

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 📁 Project Structure

```
pm-jobs-tracker/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.js          # Main component
│   └── index.js        # Entry point
├── package.json
├── .gitignore
└── README.md
```

## 🎨 Customization

### Add More Locations

Edit the `LOCATIONS` array in `src/App.js`:

```javascript
const LOCATIONS = [
  { id: 'noida', name: 'Noida', state: 'UP' },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra' },  // Add new
  // ...
];
```

### Add More Roles

Edit the `ROLES` array:

```javascript
const ROLES = [
  { id: 'pm', name: 'Product Manager', keywords: 'product+manager' },
  { id: 'gpm', name: 'Group Product Manager', keywords: 'group+product+manager' },  // Add new
  // ...
];
```

### Add More Platforms

Add to the `PLATFORMS` object:

```javascript
const PLATFORMS = {
  // ... existing platforms
  newplatform: {
    name: 'New Platform',
    icon: '🆕',
    color: '#123456',
    bgColor: 'rgba(18, 52, 86, 0.15)',
    priority: 13,
    getUrl: (role, location) => `https://newplatform.com/search?q=${role}&loc=${location}`,
    description: 'Platform description'
  }
};
```

## 📱 Mobile Support

The app is fully responsive and works great on:
- 📱 iPhone / Android phones
- 📱 iPad / Android tablets
- 💻 Desktop browsers

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this for your own job search!

---

Made with ❤️ for Product Managers in India
