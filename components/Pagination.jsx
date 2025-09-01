"use client";
import React from "react";
import { useTranslations } from "next-intl";

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}) {
  const t = useTranslations("pagination");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function goto(p) {
    const np = Math.min(totalPages, Math.max(1, p));
    if (np !== page) onPageChange?.(np);
  }

  const nums = [];
  const pad = 1;
  const from = Math.max(1, page - pad);
  const to = Math.min(totalPages, page + pad);
  if (from > 1) nums.push(1);
  if (from > 2) nums.push("…");
  for (let i = from; i <= to; i++) nums.push(i);
  if (to < totalPages - 1) nums.push("…");
  if (to < totalPages) nums.push(totalPages);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* info */}
      <div className="text-sm text-slate-600">
        {t("showing")}{" "}
        <span className="font-medium text-[#0B1E3A]">{start}</span>–
        <span className="font-medium text-[#0B1E3A]">{end}</span>{" "}
        {t("of")}{" "}
        <span className="font-medium text-[#0B1E3A]">{total}</span>
      </div>

      {/* actions */}
      <div className="flex items-center gap-3">
        {/* page size */}
        <label className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
          <span>{t("perPage")}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>

        {/* pager */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goto(page - 1)}
            disabled={page <= 1}
            aria-label={t("prev")}
            className="px-2 py-1 rounded-lg border border-gray-300 text-sm text-[#0B1E3A] disabled:opacity-40 hover:bg-gray-50"
          >
            ←
          </button>

          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="px-2 text-slate-500">…</span>
            ) : (
              <button
                key={n}
                onClick={() => goto(n)}
                className={`px-2 py-1 rounded-lg border text-sm ${
                  n === page
                    ? "border-[#F7C600] bg-[#FFF7CC] text-[#0B1E3A] font-semibold"
                    : "border-gray-300 text-[#0B1E3A] hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            )
          )}

          <button
            onClick={() => goto(page + 1)}
            disabled={page >= totalPages}
            aria-label={t("next")}
            className="px-2 py-1 rounded-lg border border-gray-300 text-sm text-[#0B1E3A] disabled:opacity-40 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
