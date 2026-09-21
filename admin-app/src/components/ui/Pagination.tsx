import Link from "next/link";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function hrefFor(targetPage: number): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    search.set("page", String(targetPage));
    return `${basePath}?${search.toString()}`;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
      <p className="text-sm text-slate-500">
        Showing {from}–{to} of {total} patients
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500",
            page === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
          )}
          aria-disabled={page === 1}
        >
          ‹
        </Link>
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(p)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
              p === page ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {p}
          </Link>
        ))}
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500",
            page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
          )}
          aria-disabled={page === totalPages}
        >
          ›
        </Link>
      </div>
    </div>
  );
}
