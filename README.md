# Savr - Deals Feed (MVP)

## How to update deals (daily)
Edit the file `public/deals.json` in this repository. Each item is an object with:
- id (unique number)
- title (string)
- image (URL)
- price (number)
- oldPrice (number, optional)
- affiliate_link (url)
- source (string)
- badge (string, optional)

After you save changes, Netlify will auto-redeploy and your site will update.

## Deployment
Netlify builds with `npm run build` and publishes the `dist` folder.

