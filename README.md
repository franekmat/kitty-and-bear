# Kitty & Bear ♡ — Our London Guide

A boutique, mobile-friendly web app for Kitty & Bear's shared London restaurants, date ideas, winter wardrobe shopping, and home move-in list—backed live by your Google Sheet.

## Features
- **1-click sorting** (`£ Price`, `♡ Romance`, `★ Google Rating`, `🚆 Travel Time`, `A–Z`) with instant ascending/descending toggle
- **Multi-select filters** (pick multiple cuisines, commute tiers, statuses, budget slider, minimum romance hearts, and instant search)
- **Card Grid + Compact Table** view switcher
- **1-tap Status cycling** & clickable Romance hearts right on each card
- **🎲 Surprise us!** random picker from your active filtered results
- **Manual "+ Add" modal** + **2-way Google Sheets sync** via `apps-script/Code.gs`

## Deploying to GitHub Pages (and later attaching your custom domain)
This repo includes `.github/workflows/deploy.yml` for automatic GitHub Pages deploys on push to `main`:
1. Push this repo to GitHub (e.g. `franekmat/kitty-and-bear`).
2. In GitHub repo **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Later, attach your custom domain (e.g. via Cloudflare DNS CNAME → `franekmat.github.io`) in **Settings → Pages → Custom domain**.

## Enabling 2-Way Live Google Sheets Sync (~2 mins)
1. Open your **Kitty and bear** Google Sheet → **Extensions → Apps Script**.
2. Paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs) and save.
3. Click **Deploy → New deployment → Web app** (*Execute as: Me*, *Who has access: Anyone*).
4. Copy the Web App URL into the **Connect Sheet Sync** modal in the web app.
