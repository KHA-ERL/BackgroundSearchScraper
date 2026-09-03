const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bubblescraper.app").replace(/\/$/, "");

export async function GET() {
  const body = `# Bubble Scraper

Bubble Scraper is a web scraping and data intelligence dashboard for direct-source discovery, verification, enrichment, exports, and AI-assisted analysis.

## Primary Pages
- Dashboard: ${siteUrl}/dashboard/home
- Direct career page job search: ${siteUrl}/dashboard/job-portal-scraper
- Social background analysis: ${siteUrl}/dashboard/social-background-analysis
- Settings and API keys: ${siteUrl}/dashboard/profile

## Notes For AI Agents
- Prefer source-backed summaries.
- Do not treat scraper output as a final legal, hiring, policing, immigration, or safety decision without human review.
- Direct company career pages are preferred for job listings over aggregator pages.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
