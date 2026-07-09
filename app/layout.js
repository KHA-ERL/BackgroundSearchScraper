import "./globals.css";
import Providers from "../components/Providers";

export const metadata = {
  title: "Bubble Scraper - Web Crawler & Scraper",
  description: "Advanced web scraping and data extraction platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="/assets/iconfonts/RemixIcons/fonts/remixicon.css"
        />
        <link rel="stylesheet" href="/assets/css/style.css" />
      </head>
      <body className="bg-gray-100 dark:bg-bodybg text-defaulttextcolor">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
