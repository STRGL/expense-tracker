<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment

**Do NOT `git push` without explicit instruction from the user.** Every push to `main` triggers a GitHub Actions build and redeploys the live hosted environment. Pushing breaking changes will take the site down. Always commit locally and wait for the user to confirm before pushing.
