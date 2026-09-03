"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function label(segment = "") {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname() || "/dashboard/home";
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const crumbs = segments.map((segment, index) => ({
    label: label(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
    current: index === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500 dark:text-[#00FF41]/60">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            {index > 0 && <i className="ri-arrow-right-s-line text-stone-300 dark:text-[#00FF41]/35" aria-hidden="true" />}
            {crumb.current ? (
              <span aria-current="page" className="text-stone-800 dark:text-[#00FF41]">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="transition hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
