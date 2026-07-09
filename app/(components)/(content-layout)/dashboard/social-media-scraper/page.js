"use client";
import { useState } from "react";
import axios from "axios";

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: "ri-facebook-line", color: "text-blue-600", accentClass: "border-blue-600 bg-blue-600" },
  { id: "youtube", label: "YouTube", icon: "ri-youtube-line", color: "text-red-500", accentClass: "border-red-500 bg-red-500" },
  { id: "instagram", label: "Instagram", icon: "ri-instagram-line", color: "text-pink-500", accentClass: "border-pink-500 bg-pink-500" },
  { id: "linkedin", label: "LinkedIn", icon: "ri-linkedin-line", color: "text-blue-700", accentClass: "border-blue-700 bg-blue-700" },
];

// ---------- Facebook Result Display ----------
function FacebookResult({ result }) {
  if (!result) return null;
  return (
    <div className="box mt-5">
      <div className="box-header">
        <h5 className="box-title flex items-center gap-2">
          <i className="ri-facebook-line text-blue-600" /> Facebook Page Details
        </h5>
      </div>
      <div className="box-body">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <InfoRow icon="ri-user-line" label="Page Name" value={result.page_name} />
            <InfoRow icon="ri-price-tag-3-line" label="Category" value={result.category} />
            <InfoRow icon="ri-group-line" label="Followers / Likes" value={result.followers} />
            <InfoRow icon="ri-global-line" label="Website" value={result.website} isLink />
          </div>
          <div className="col-span-12 md:col-span-6">
            {result.about && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 font-medium mb-1">About</p>
                <p className="text-sm text-gray-700 dark:text-white/70 bg-gray-50 dark:bg-white/5 rounded p-3">{result.about}</p>
              </div>
            )}
          </div>
        </div>
        {result.recent_posts?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">Recent Posts ({result.recent_posts.length})</p>
            <div className="space-y-2">
              {result.recent_posts.map((post, i) => (
                <div key={i} className="bg-gray-50 dark:bg-white/5 rounded p-3 text-sm text-gray-600 dark:text-white/70 border-l-2 border-blue-300">
                  {post.text || "No text available"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- YouTube Result Display ----------
function YouTubeResult({ result }) {
  if (!result || !Array.isArray(result)) return null;
  const isChannel = result[0]?.type === "channel";
  const isVideo = result[0]?.type === "video";
  const isSearch = result[0]?.type === "search_result";

  if (isChannel && result[0]) {
    const ch = result[0];
    return (
      <div className="box mt-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2"><i className="ri-youtube-line text-red-500" /> YouTube Channel</h5>
        </div>
        <div className="box-body">
          <div className="flex items-start gap-4 flex-wrap mb-4">
            {ch.avatar && <img src={ch.avatar} alt="Channel" className="w-20 h-20 rounded-full object-cover border-2 border-red-200" onError={e => e.target.style.display = "none"} />}
            <div className="flex-1">
              <h2 className="text-xl font-bold dark:text-white">{ch.name}</h2>
              <div className="flex gap-5 mt-2 flex-wrap">
                <span className="text-sm text-gray-500"><i className="ri-group-line mr-1" />{ch.subscribers} subscribers</span>
                <span className="text-sm text-gray-500"><i className="ri-video-line mr-1" />{ch.video_count} videos</span>
              </div>
              {ch.description && <p className="text-sm text-gray-500 mt-2 line-clamp-3">{ch.description}</p>}
            </div>
          </div>
          {ch.recent_videos?.length > 0 && (
            <>
              <p className="text-sm font-semibold text-gray-600 mb-2">Recent Videos</p>
              <div className="grid grid-cols-12 gap-3">
                {ch.recent_videos.map((v, i) => (
                  <div key={i} className="col-span-12 md:col-span-4 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                    <a href={v.url} target="_blank" rel="noreferrer" className="text-red-500 hover:underline text-sm font-medium line-clamp-2">{v.title}</a>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>{v.views} views</span>
                      <span>{v.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isVideo && result[0]) {
    const v = result[0];
    return (
      <div className="box mt-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2"><i className="ri-youtube-line text-red-500" /> Video Details</h5>
        </div>
        <div className="box-body">
          <h2 className="text-lg font-bold dark:text-white mb-2">{v.title}</h2>
          <div className="flex gap-5 flex-wrap mb-3">
            <InfoRow icon="ri-bar-chart-line" label="Views" value={v.views} />
            <InfoRow icon="ri-thumb-up-line" label="Likes" value={v.likes} />
            <InfoRow icon="ri-tv-line" label="Channel" value={v.channel} />
            <InfoRow icon="ri-calendar-line" label="Upload Date" value={v.upload_date} />
          </div>
          {v.description && <p className="text-sm text-gray-500 bg-gray-50 dark:bg-white/5 rounded p-3 line-clamp-5">{v.description}</p>}
        </div>
      </div>
    );
  }

  if (isSearch) {
    return (
      <div className="box mt-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2"><i className="ri-youtube-line text-red-500" /> Search Results ({result.length})</h5>
        </div>
        <div className="box-body p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-8">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Views</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {result.map((v, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <a href={v.url} target="_blank" rel="noreferrer" className="text-red-500 hover:underline font-medium line-clamp-2">{v.title}</a>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.channel}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.views}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

// ---------- Instagram Result Display ----------
function InstagramResult({ result }) {
  if (!result) return null;
  return (
    <div className="box mt-5">
      <div className="box-header">
        <h5 className="box-title flex items-center gap-2"><i className="ri-instagram-line text-pink-500" /> Instagram Profile</h5>
      </div>
      <div className="box-body">
        <div className="flex items-start gap-5 flex-wrap">
          {result.profile_image && result.profile_image !== "N/A" && (
            <img src={result.profile_image} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-pink-200" onError={e => e.target.style.display = "none"} />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold dark:text-white">{result.profile_name}</h2>
            <p className="text-gray-500 text-sm">{result.full_name}</p>
            <p className="text-sm mt-2 dark:text-white/70">{result.bio}</p>
            <div className="flex gap-6 mt-3">
              {[["Posts", result.posts], ["Followers", result.followers], ["Following", result.following]].map(([l, v]) => (
                <div key={l} className="text-center">
                  <p className="font-bold text-lg dark:text-white">{v}</p>
                  <p className="text-xs text-gray-500">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- LinkedIn Result Display ----------
function LinkedInResult({ result }) {
  if (!result) return null;
  return (
    <div className="box mt-5">
      <div className="box-header">
        <h5 className="box-title flex items-center gap-2"><i className="ri-linkedin-line text-blue-700" /> LinkedIn Profile</h5>
      </div>
      <div className="box-body">
        <div className="flex items-start gap-4 flex-wrap mb-4">
          {result.profile_image && result.profile_image !== "N/A" && (
            <img src={result.profile_image} alt="Profile" className="w-20 h-20 rounded object-cover border border-gray-200" onError={e => e.target.style.display = "none"} />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold dark:text-white">{result.profile_name}</h2>
            <p className="text-gray-500 text-sm">{result.tagline}</p>
            <p className="text-xs text-gray-400 mt-1">{result.followers}</p>
          </div>
        </div>
        {result.about && result.about !== "N/A" && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 font-medium mb-1">About</p>
            <p className="text-sm text-gray-600 dark:text-white/70 bg-gray-50 dark:bg-white/5 rounded p-3 line-clamp-4">{result.about}</p>
          </div>
        )}
        {result.website && result.website !== "N/A" && (
          <a href={result.website} target="_blank" rel="noreferrer" className="text-blue-700 text-sm hover:underline">{result.website}</a>
        )}
      </div>
    </div>
  );
}

// Reusable info row
function InfoRow({ icon, label, value, isLink }) {
  return (
    <div className="flex items-start gap-2 mb-2">
      <i className={`${icon} text-gray-400 mt-0.5 text-sm`} />
      <div>
        <span className="text-xs text-gray-400">{label}: </span>
        {isLink && value && value !== "N/A" ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">{value}</a>
        ) : (
          <span className="text-sm text-gray-700 dark:text-white/70">{value || "N/A"}</span>
        )}
      </div>
    </div>
  );
}

export default function SocialMediaScraperPage() {
  const [platform, setPlatform] = useState("facebook");
  const [urlInput, setUrlInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [inputMode, setInputMode] = useState("url"); // "url" | "search"
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activePlatform = PLATFORMS.find(p => p.id === platform);

  function switchPlatform(pid) {
    setPlatform(pid);
    setResult(null);
    setError("");
    setUrlInput("");
    setQueryInput("");
    // youtube supports both; others url only
    setInputMode("url");
  }

  async function run() {
    const hasUrl = urlInput.trim();
    const hasQuery = queryInput.trim();

    if (platform === "youtube") {
      if (!hasUrl && !hasQuery) { setError("Enter a YouTube channel/video URL or search query."); return; }
    } else {
      if (!hasUrl) { setError("Enter a valid URL."); return; }
    }

    setError(""); setResult(null); setLoading(true);
    try {
      let res;
      if (platform === "facebook") {
        res = await axios.post("/api/facebook_scraper", { url: hasUrl });
        setResult(res.data.data?.[0] || res.data);
      } else if (platform === "youtube") {
        const payload = hasUrl ? { url: hasUrl } : { query: hasQuery };
        res = await axios.post("/api/youtube_scraper", payload);
        setResult(res.data.data || []);
      } else if (platform === "instagram") {
        res = await axios.post("/api/instagram_scraper", { url: hasUrl });
        setResult(res.data);
      } else if (platform === "linkedin") {
        res = await axios.post("/api/linkedin_scraper", { url: hasUrl });
        setResult(res.data);
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to scrape. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const placeholders = {
    facebook: "https://www.facebook.com/pagename",
    youtube: inputMode === "url" ? "https://www.youtube.com/@channel or video URL" : "e.g. tech tutorials 2024",
    instagram: "https://www.instagram.com/username/ or @username",
    linkedin: "https://www.linkedin.com/company/companyname or person profile URL",
  };

  return (
    <div>
      {/* Info Banner */}
      <div className="box mb-5 border-l-4 border-l-pink-500">
        <div className="box-body py-3">
          <p className="text-sm text-gray-600">
            <i className="ri-information-line text-pink-500 mr-2" />
            Combined social media scraper — extract public data from Facebook, YouTube, Instagram, and LinkedIn.
          </p>
        </div>
      </div>

      {/* Platform Tabs + Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-share-line text-pink-500" />
            Social Media Scraper
            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded font-semibold ml-1">NEW v14</span>
          </h5>
        </div>
        <div className="box-body">
          {/* Platform tabs */}
          <div className="flex gap-2 flex-wrap mb-5">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => switchPlatform(p.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  platform === p.id
                    ? `${p.accentClass} text-white shadow-sm`
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <i className={`${p.icon} ${platform === p.id ? "text-white" : p.color}`} />
                {p.label}
              </button>
            ))}
          </div>

          {/* YouTube mode toggle */}
          {platform === "youtube" && (
            <div className="flex gap-2 mb-4">
              {[{ id: "url", label: "Channel / Video URL" }, { id: "search", label: "Search Videos" }].map(m => (
                <button
                  key={m.id}
                  onClick={() => { setInputMode(m.id); setUrlInput(""); setQueryInput(""); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    inputMode === m.id ? "bg-red-500 border-red-500 text-white" : "border-gray-200 text-gray-500 hover:border-red-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Input field */}
          <div className="mb-4">
            {platform === "youtube" && inputMode === "search" ? (
              <>
                <label className="block text-sm font-medium text-gray-600 mb-1">Search Query</label>
                <input
                  type="text"
                  className="ti-form-input"
                  value={queryInput}
                  onChange={e => setQueryInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && run()}
                  placeholder="e.g. JavaScript tutorials for beginners"
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {platform === "facebook" && "Facebook Page / Profile URL"}
                  {platform === "youtube" && "YouTube Channel or Video URL"}
                  {platform === "instagram" && "Instagram Profile URL or @username"}
                  {platform === "linkedin" && "LinkedIn Company or Person URL"}
                </label>
                <input
                  type="url"
                  className="ti-form-input"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && run()}
                  placeholder={placeholders[platform]}
                />
              </>
            )}
          </div>

          {/* Platform-specific hints */}
          {platform === "facebook" && (
            <p className="text-xs text-gray-400 mb-3">
              <i className="ri-information-line mr-1" />
              Only public pages are supported. If the page requires login, partial data will be returned.
            </p>
          )}
          {platform === "instagram" && (
            <p className="text-xs text-gray-400 mb-3">
              <i className="ri-information-line mr-1" />
              Only public profiles are supported.
            </p>
          )}
          {platform === "linkedin" && (
            <p className="text-xs text-gray-400 mb-3">
              <i className="ri-information-line mr-1" />
              Provide a public LinkedIn company or person profile URL.
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className={`ti-btn ti-btn-outline border text-white flex items-center gap-2 disabled:opacity-60 ${activePlatform?.accentClass} hover:opacity-90`}
            >
              {loading ? (
                <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</>
              ) : (
                <><i className={activePlatform?.icon} /> Scrape {activePlatform?.label}</>
              )}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3"><i className="ri-error-warning-line mr-1" />{error}</p>}
        </div>
      </div>

      {/* Results */}
      {result && platform === "facebook" && <FacebookResult result={result} />}
      {result && platform === "youtube" && <YouTubeResult result={result} />}
      {result && platform === "instagram" && <InstagramResult result={result} />}
      {result && platform === "linkedin" && <LinkedInResult result={result} />}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-share-line text-5xl text-pink-200 mb-3 block" />
            <p className="text-gray-400 text-sm">Select a platform, enter a URL, and click Scrape.</p>
          </div>
        </div>
      )}
    </div>
  );
}
