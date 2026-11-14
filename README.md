# B4X-PLAY5 Tournament Website

A mobile-friendly Free Fire tournament website starter for Android/Termux.
Frontend: HTML/CSS/JavaScript. Hosting: Cloudflare Pages. Database/auth: Supabase.

## Included
- Public tournament listing (Solo/Duo/Squad)
- Registration form (team, captain UID, contact and player list)
- Admin email/password sign-in
- Admin-only tournament creation
- Approve/reject registrations
- Publish results and show recent results
- Supabase Row Level Security policies

## Important limitations
- This starter uses manual admin approval and manual results.
- Payment gateway is not included. Entry fee is only displayed; do not collect payment until you add and test a proper payment flow.
- Never ask players for passwords, OTPs or account access.
- Never put a Supabase `service_role` key in browser files. Only use the anon/public key in `config.js`.
- Before public launch, test policies with a separate non-admin account and consider CAPTCHA/rate limiting and privacy/terms pages.

## Step 1 — Supabase setup
1. Create a free project at https://supabase.com.
2. Open SQL Editor and run all of `supabase_schema.sql`.
3. Open Project Settings -> API. Copy Project URL and anon/public key.
4. Put both values into `config.js`.
5. Open Authentication -> Users and create your admin account (email + password).
6. In SQL Editor, run the admin insert at the bottom of `supabase_schema.sql`, replacing `YOUR_ADMIN_EMAIL` with your admin email. Run only that insert statement.

Supabase Free currently includes a 500 MB database and 1 GB file storage, with inactivity pausing after a week of low activity. Check current limits before launch.

## Step 2 — Test locally in Termux
Install Python and a static web server:
```bash
pkg update -y
pkg install python -y
cd ~/B4X-PLAY5
python -m http.server 8080
```
Open `http://127.0.0.1:8080` in Chrome. Do not open `index.html` directly as a file; ES modules need an HTTP server.

## Step 3 — Deploy free on Cloudflare Pages
1. Create/sign in to GitHub and create a repository named `b4x-play5`.
2. Upload the project files (index.html, style.css, app.js, config.js, supabase_schema.sql, README.md).
3. Create/sign in to Cloudflare at https://dash.cloudflare.com.
4. Go to Workers & Pages -> Create -> Pages -> Connect to Git.
5. Select your GitHub repository.
6. Framework preset: None. Build command: leave empty. Build output directory: `/`.
7. Deploy. Cloudflare will give you a free `*.pages.dev` website address.

## Step 4 — First test
1. Open your pages.dev link.
2. Confirm tournaments load (initially the list will be empty).
3. Sign in using your admin email/password.
4. Create a test tournament with ₹0 entry fee.
5. Open the site in a private/incognito browser window and submit a test registration.
6. Return to admin dashboard and approve it.
7. Publish a test result and check it appears publicly.

## Project structure
- `index.html` — page layout and forms
- `style.css` — responsive dark esports design
- `app.js` — Supabase data and admin interactions
- `config.js` — Supabase URL and anon key placeholders
- `supabase_schema.sql` — tables and RLS policies

## Troubleshooting
- "Connect Supabase first": check `config.js` and ensure values are pasted without extra spaces/quotes inside the string.
- "Invalid login credentials": verify the admin user exists in Supabase Auth.
- "not authorised as an admin": run the admin insert SQL for the exact email used to sign in.
- No tournaments: create one while signed in as an authorised admin.
- If the database pauses, restore it from the Supabase dashboard.
