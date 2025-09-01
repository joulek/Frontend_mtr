import useSWR from "swr";

const fetcher = (url) =>
  fetch(url, { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });

export default function useDevisList({ type, q, page = 1, limit = 20 }) {
  const params = new URLSearchParams();
  if (type && type !== "all") params.set("type", type);
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("limit", String(limit));

  const key = `/api/devis/list?${params.toString()}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, {
    keepPreviousData: true,          // ✨ يبقي الداتا السابقة
    dedupingInterval: 15000,         // يمنع طلبات مكررة
    revalidateOnFocus: false,
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isValidating,
    error,
    refresh: () => mutate(),         // نداء تحديث يدوي
  };
}
