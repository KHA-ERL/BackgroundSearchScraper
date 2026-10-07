# Bubble Scraper

Bubble Scraper is a self-hosted web scraping and data intelligence dashboard built with Next.js and React. It helps teams collect public web data, find leads, verify contacts, research jobs, analyze public sources, and export useful datasets from one workspace.

The app is built around a simple workflow: search a source, scrape records, verify quality, enrich the result, and export or reuse the data.

## Core Features

- Public website, image, document, email, and phone scraping.
- Lead discovery from maps, search engines, directories, and company pages.
- Email, phone, WhatsApp, URL, domain, and WHOIS verification.
- Trusted job discovery from company career pages and ATS boards.
- AI-assisted social analysis, job application drafting, and summaries.
- Guest testing with sign-in required for saved history, projects, alerts, and profile settings.
- Private admin observability for users, tool usage, recent events, job activity, and security signals.
- Backend safeguards for signed sessions, rate limits, SSRF-safe URL scraping, and security headers.
- SEO/AEO support through sitemap, robots, `llms.txt`, structured data, and IndexNow.

## Tool Areas

- **Lead generation:** Google Maps, global directories, business directories, email scraping, phone scraping, WhatsApp number scraping.
- **Website data:** search engine scraping, live website scraping, website data extraction, document scraping, image scraping.
- **Verification:** email verifier, phone verifier, WhatsApp checker, WhatsApp verifier, URL checker, domain verifier, WHOIS lookup.
- **Jobs and research:** direct career page search, trusted ATS discovery, company-type filters, corporate scraper, B2C data.
- **Social and ads:** social media scraping, social background analysis, Facebook Ad Library research.
- **Ecommerce:** ecommerce, Myntra, and Snapdeal scraping workflows.

## Trusted Job Discovery

The job portal is designed to find legitimate roles without favoring only large tech companies. It supports:

- Broad trusted discovery across startups, small companies, recruiters, midsize teams, and large companies.
- Trust labels such as `Verified`, `Likely legit`, and `Needs review`.
- Trust reasons and warnings for each job result.
- Company mix filters: all trusted, startups and smaller employers, or big tech.
- Embedded source logic: all trusted blends broad discovery with known verified boards; startups and smaller employers hide big tech; big tech focuses on known verified company boards.

The hard-coded big-tech boards are no longer a separate source-mode button. They are folded into the company mix logic so users only choose the type of companies they want to see.

## Tech Stack

- Next.js 14
- React 18
- Tailwind CSS
- Playwright and Cheerio
- Supabase for optional persistence
- Firebase for optional authentication
- Mistral and Claude for optional AI features

## Quick Start

```bash
npm install
npx playwright install chromium
npm run dev
```

Open `http://localhost:3000`.

For production:

```bash
npm run build
npm start
```

## Configuration

Copy the example environment file and fill only the services you need:

```bash
cp .env.local.example .env.local
```

Common optional values:

- `NEXT_PUBLIC_SITE_URL` for canonical URLs, sitemap, robots, and AEO metadata.
- `MISTRAL_API_KEY` and `CLAUDE_API_KEY` for AI features.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for saved preferences, alerts, and records.
- `SESSION_COOKIE_SECRET` for signed HttpOnly app session cookies.
- `ADMIN_EMAILS` for access to `/dashboard/admin`.
- `NEXT_PUBLIC_FIREBASE_*` for authentication.
- `BING_SITE_VERIFICATION` and `INDEXNOW_KEY` for Bing Webmaster Tools and IndexNow.

## Admin Dashboard

Set `ADMIN_EMAILS` to the signed-in owner/admin email addresses that should access `/dashboard/admin`.
For username accounts without an email, use `ADMIN_USER_KEYS`, such as `auth:local:yourusername`.

The admin dashboard shows core MVP observability: users, runs today, failed runs, saved work, top tools, recent activity, job crawler status, and recent security signals.

## Security Model

- Guests can test scraper features with stricter limits.
- Sign-in is required to save scrape history, projects, job alerts, research, and profile settings.
- User data is scoped by the authenticated session, not by client-supplied user IDs.
- URL-based scrapers block localhost, private IPs, link-local addresses, and internal network targets.
- Security headers and per-route rate limits are enabled for production hardening.

## Scripts

```bash
npm run dev      # Start local development
npm run build    # Create a production build
npm start        # Run the production server
npm run lint     # Run Next.js lint checks
```

## Responsible Use

Bubble Scraper works with public web data and source-backed workflows. Review scraped results before using them for outreach, hiring, legal, financial, safety, or other high-impact decisions.
