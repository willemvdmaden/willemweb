# Deployment: private source repo → public Pages repo

This repository (`willemvdmaden/willemweb`) is **private**. GitHub Pages on the
Free plan only serves public repositories, so the site is published from a
separate **public** repo. The workflow in `.github/workflows/deploy.yml` pushes
the committed static site there on every push to `gh-pages`.

```
  willemvdmaden/willemweb (PRIVATE)        willemvdmaden.github.io (PUBLIC)
  ├─ index.html, _astro/, images/ ...      ├─ index.html, _astro/, images/ ...
  └─ .github/workflows/deploy.yml  ──push──▶└─ (served by GitHub Pages)
                                              → willemvandermaden.com
```

Only the **rendered site** lands in the public repo. This repo's history and
any source files stay private.

## One-time setup

### 1. Create the public repo
Create a new **public** repo named **`willemvdmaden.github.io`** (empty — no
README). If you use a different name, update `PUBLIC_REPO` in
`.github/workflows/deploy.yml`; with the custom domain set, any name works.

### 2. Create a deploy key
Generate an SSH key pair (locally):

```bash
ssh-keygen -t ed25519 -C "willemweb-deploy" -f willemweb-deploy -N ""
```

This creates `willemweb-deploy` (private) and `willemweb-deploy.pub` (public).

- **Public key** → in the **public** repo: Settings → Deploy keys → *Add deploy
  key* → paste the contents of `willemweb-deploy.pub` → **check "Allow write
  access"** → Add key.
- **Private key** → in **this** repo: Settings → Secrets and variables →
  Actions → *New repository secret* → name it **`ACTIONS_DEPLOY_KEY`** → paste
  the contents of `willemweb-deploy` (the private key, including the
  `-----BEGIN…` / `-----END…` lines) → Add secret.

Then delete the local key files (`rm willemweb-deploy willemweb-deploy.pub`).

### 3. Enable Pages on the public repo
First run the deploy (merge to `gh-pages`, or run the workflow manually via
Actions → "Publish site to public Pages repo" → Run workflow). That creates the
`gh-pages` branch in the public repo. Then:

- Public repo → Settings → Pages → Source: **Deploy from a branch** →
  Branch: **`gh-pages`** / **`/ (root)`** → Save.
- Settings → Pages → Custom domain: **`willemvandermaden.com`** → Save →
  enable **Enforce HTTPS** once the certificate is issued.

### 4. Release the domain from this repo
The same custom domain can only be active on one Pages site. In **this** repo:
Settings → Pages → remove the custom domain / disable Pages. (DNS does not
change — it already points at GitHub Pages, which now routes the domain to the
public repo.)

## Updating the site
Push your static changes to `gh-pages` in this repo. The workflow republishes
to the public repo automatically. Trigger a manual republish anytime via
Actions → "Publish site to public Pages repo" → Run workflow.
