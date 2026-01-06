# Veil Landing Page

Professional landing page for the Veil VS Code extension.

## 📁 Structure

```
website/
├── index.html      # Main HTML file
├── styles.css      # Styling
├── script.js       # JavaScript interactions
└── logo1.png       # Veil logo
```

## 🚀 Deployment Options

### Option 1: GitHub Pages (Recommended)
1. Create a new repository `veil-website`
2. Push the `website/` folder contents to the repository
3. Go to Settings → Pages
4. Select `main` branch and `/` (root) folder
5. Your site will be live at `https://username.github.io/veil-website`

### Option 2: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to `website/` folder
3. Run `vercel` and follow prompts
4. Free custom domain support

### Option 3: Netlify
1. Drag and drop the `website/` folder to [Netlify Drop](https://app.netlify.com/drop)
2. Instant deployment with custom domain support

### Option 4: Local Preview
```bash
cd website
python -m http.server 8000
# Visit http://localhost:8000
```

## 🎨 Customization

### Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary: #667eea;        /* Main brand color */
    --secondary: #764ba2;      /* Secondary color */
    --accent: #f093fb;         /* Accent highlights */
}
```

### Content
- **Hero Section**: Edit title and subtitle in `index.html` (lines 30-35)
- **Features**: Modify feature cards (lines 60-130)
- **Installation**: Update installation commands (lines 180-200)

### Logo
Replace `logo1.png` with your own logo (recommended size: 512x512px)

## 📊 Features

- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Smooth scroll animations
- ✅ Modern gradient hero section
- ✅ Feature cards with hover effects
- ✅ Installation guide
- ✅ SEO-friendly markup
- ✅ Fast loading (no heavy dependencies)

## 🔗 Links to Update

Before deploying, update these links in `index.html`:
- GitHub repository URLs (currently placeholder)
- VS Code Marketplace link (when published)
- Documentation links

## 📝 License

MIT License - Same as Veil extension
