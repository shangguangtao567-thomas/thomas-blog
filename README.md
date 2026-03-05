# Thomas's Blog — Static Edition

A minimal, fast personal blog powered by Vite + React + GitHub Pages.

**Live site:** https://[your-username].github.io/[repo-name]/

---

## ✍️ Writing a New Post

1. Create a new file in the `posts/` directory:
   ```
   posts/YYYY-MM-DD-your-post-slug.md
   ```

2. Add frontmatter at the top:
   ```markdown
   ---
   titleEn: "Your Post Title in English"
   titleZh: "你的文章标题（中文）"
   excerptEn: "A brief description of your post."
   excerptZh: "文章简介（中文）"
   tag: AI          # One of: AI, Open Source, Infrastructure, Tools, Security, Web, Mobile, Data, Tech
   tagEn: AI
   image: https://images.unsplash.com/photo-xxx?w=800&auto=format&fit=crop
   readTime: 8      # Estimated reading time in minutes
   date: 2026-03-05
   ---

   Your post content in Markdown...
   ```

3. Push to `main` branch — GitHub Actions will automatically build and deploy in ~90 seconds.

---

## 🏗️ Project Structure

```
posts/                    ← Write your Markdown posts here
src/
  data/
    posts-index.json      ← Auto-generated from posts/ (don't edit)
    posts.json            ← Auto-generated from posts/ (don't edit)
    tech-news.json        ← Auto-updated daily by GitHub Actions
  pages/                  ← React page components
  components/             ← Shared UI components
  contexts/               ← Theme & Language contexts
scripts/
  build-data.mjs          ← Converts posts/ → JSON (runs before build)
  fetch-tech-news.mjs     ← Fetches HN + OpenAI processing
.github/workflows/
  deploy.yml              ← Auto-deploy on push to main
  fetch-tech-news.yml     ← Daily tech news fetch (08:00 UTC)
```

---

## 🚀 GitHub Pages Setup

### First-time setup:

1. **Create a GitHub repository** (public)

2. **Push this code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: **GitHub Actions**

4. **Add secrets:**
   - Go to repo Settings → Secrets and variables → Actions
   - Add `OPENAI_API_KEY` with your OpenAI API key

5. **Trigger first deploy:**
   - Go to Actions tab → "Build and Deploy to GitHub Pages" → Run workflow

---

## 🔧 Local Development

```bash
pnpm install
pnpm dev          # Start dev server at http://localhost:5173
pnpm build        # Build for production
pnpm preview      # Preview production build
```

### Fetch tech news locally:
```bash
OPENAI_API_KEY=sk-xxx pnpm fetch-tech
```

---

## 🌐 Custom Domain (Optional)

1. Add a `CNAME` file in the `public/` directory with your domain:
   ```
   blog.yourdomain.com
   ```

2. Update `vite.config.ts`:
   ```ts
   base: '/'  // Keep as '/' for custom domains
   ```

3. Configure DNS with your domain provider.

---

## 📝 Tech Stack

- **Framework:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS v3
- **Markdown:** gray-matter (parsing) + marked (rendering)
- **Hosting:** GitHub Pages (free)
- **CI/CD:** GitHub Actions
- **AI:** OpenAI GPT-4o-mini (tech news summarization)
