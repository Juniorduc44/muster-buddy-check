# Images Directory

This folder stores **all static image assets** used by Muster Buddy Check (favicons, logos, social-share/OG images, banners, etc.).

## Why keep images here?

- **Single source of truth** – every graphic lives in one predictable place  
- **Version-controlled** – changes travel with your code (no external CDN surprises)  
- **Easy swaps** – update a logo or favicon by replacing a single file or tweaking an environment variable  
- **Clear brand assets** – contributors instantly see the current project branding  

```
src/
└─ assets/
   └─ images/
      ├─ shield_icon.png
      ├─ muster_logo.png
      ├─ og_card.png
      └─ README.md   ← you are here
```

## Referencing images with environment variables

At build-time Vite exposes any variable prefixed with **`VITE_`** to the client.  
We leverage this for images so different environments (dev, preview, prod, white-label) can swap graphics without touching JSX/HTML.

### 1. Add your files

```
src/assets/images/shield_icon.png
src/assets/images/og_card.png
```

### 2. Define paths in `.env`

```
# .env
VITE_APP_FAVICON=/src/assets/images/shield_icon.png
VITE_APP_OG_IMAGE=/src/assets/images/og_card.png
```

*Paths are project-relative; Vite will rewrite them into processed asset URLs.*

### 3. Use them in code

**React (TSX)**

```tsx
// components/Meta.tsx
const favicon = import.meta.env.VITE_APP_FAVICON;
const ogImage = import.meta.env.VITE_APP_OG_IMAGE;

return (
  <>
    <link rel="icon" href={favicon} />
    <meta property="og:image" content={ogImage} />
  </>
);
```

**index.html**

```html
<link rel="icon" href="%VITE_APP_FAVICON%" />
<meta property="og:image" content="%VITE_APP_OG_IMAGE%" />
```

Vite replaces the `%VITE_*%` placeholders during the HTML transform step.

---

### Tips

| Use-case | Recommended size | Env var |
|----------|-----------------|---------|
| Favicon   | 32 × 32 / 48 × 48 | `VITE_APP_FAVICON` |
| Social card (Open Graph/Twitter) | 1200 × 630 | `VITE_APP_OG_IMAGE` |
| Dashboard logo | 300 × 80 | `VITE_APP_DASHBOARD_LOGO` |

*Add more variables as your branding evolves.*

---

### Gotchas

1. **Restart dev server** after editing env files (`npm run dev`).  
2. **Commit images** – Netlify will need them during static build.  
3. Keep env vars consistent between **local**, **preview**, and **prod** deployments.

Happy theming! 🎨
