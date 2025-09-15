"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Facebook, Linkedin, MoreVertical, User, LogOut } from "lucide-react";
import { Inter } from "next/font/google";
import { useTranslations } from "next-intl";

/* -------- Police -------- */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
).replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* --------------------------- Helpers --------------------------- */
function pickName(cat, locale) {
  return (
    (cat?.translations &&
      (cat.translations[locale] ||
        cat.translations.fr ||
        cat.translations.en)) ||
    cat?.label ||
    ""
  );
}
function slugifySafe(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
const makeCatHref = (cat, locale) =>
  `/${locale}/produits/${cat?.slug || slugifySafe(pickName(cat, locale))}`;

function pickProdName(p, locale) {
  const byLocale =
    locale === "en"
      ? p?.name_en || p?.label_en || p?.title_en
      : p?.name_fr || p?.label_fr || p?.title_fr;

  return (
    byLocale ||
    (p?.translations &&
      (p.translations[locale] || p.translations.fr || p.translations.en)) ||
    p?.name ||
    p?.label ||
    p?.title ||
    ""
  );
}
const makeProductHref = (prod, locale) => {
  const slug = prod?.slug || slugifySafe(pickProdName(prod, locale));
  const id = prod?._id || prod?.id || prod?.productId;
  if (id) return `/${locale}/produits/${slug}/${id}`;
  return `/${locale}/produits/${slug}`;
};

function swapLocaleInPath(path, nextLocale) {
  const [p, q] = (path || "/").split("?");
  let base = p || "/";
  if (/^\/(fr|en)(\/|$)/.test(base)) {
    base = base.replace(/^\/(fr|en)(?=\/|$)/, `/${nextLocale}`);
  } else if (base === "/") {
    base = `/${nextLocale}`;
  } else {
    base = `/${nextLocale}${base}`;
  }
  return q ? `${base}?${q}` : base;
}
const PATH_LOCALE_RE = /^\/(fr|en)(?:\/|$)/;

export default function SiteHeader({ mode = "public", onLogout }) {
  const t = useTranslations("auth.header");

  const router = useRouter();
  const pathname = usePathname() || "/";
  const sp = useSearchParams(); // préserver ?uid=...&token=...
  const homePaths = ["/", "/fr", "/en", "/fr/", "/en/"];

  // === Langue ===
  const [locale, setLocale] = useState("fr");
  useEffect(() => {
    let desired = "fr";
    try {
      const saved = localStorage.getItem("mtr_locale");
      if (saved === "en" || saved === "fr") desired = saved;
    } catch {}

    const m = PATH_LOCALE_RE.exec(pathname);
    const pathLocale = m?.[1] || null;
    if (!localStorage.getItem("mtr_locale") && (pathLocale === "fr" || pathLocale === "en")) {
      desired = pathLocale;
    }

    setLocale(desired);
    if (typeof document !== "undefined") document.documentElement.lang = desired;

    const current = pathLocale;
    if (current !== desired) {
      const qs = sp?.toString();
      const nextUrl = qs
        ? `${swapLocaleInPath(pathname, desired)}?${qs}`
        : swapLocaleInPath(pathname, desired);
      router.replace(nextUrl, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHome = homePaths.includes(pathname);

  /* session */
  const [me, setMe] = useState(null);
  const [hintRole, setHintRole] = useState(() => {
    try { return localStorage.getItem("mtr_role") || null; } catch { return null; }
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/users/me`, { credentials: "include", cache: "no-store" });
        if (!alive) return;
        if (r.ok) {
          const json = await r.json();
          setMe(json);
          if (json?.role) {
            try { localStorage.setItem("mtr_role", json.role); } catch {}
            setHintRole(json.role);
          }
        } else {
          setMe(null); setHintRole(null);
          try { localStorage.removeItem("mtr_role"); } catch {}
        }
      } catch {
        setMe(null); setHintRole(null);
        try { localStorage.removeItem("mtr_role"); } catch {}
      }
    })();
    return () => { alive = false; };
  }, []);

  const isLoggedClient = mode === "client" || me?.role === "client";
  const homeHref = `/${locale}`;

  /* catégories */
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch(`${API}/categories`, { method: "GET", cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => { alive = false; if (!controller.signal.aborted) controller.abort(); };
  }, []);

  /* produits */
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch(`${API}/produits`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        if (alive) setProducts(list);
      } catch {
        if (alive) setProducts([]);
      } finally {
        if (alive) setLoadingProducts(false);
      }
    })();
    return () => { alive = false; if (!controller.signal.aborted) controller.abort(); };
  }, []);

  /* scroll vers section home */
  const [open, setOpen] = useState(false);
  const goToSection = useCallback(
    async (id, closeMenu) => {
      const doScroll = () => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (location.hash) history.replaceState(null, "", location.pathname + location.search);
        if (closeMenu) setOpen(false);
      };
      if (!homePaths.includes(pathname)) {
        await router.push(homeHref, { scroll: true });
        setTimeout(doScroll, 60);
      } else {
        doScroll();
      }
    },
    [pathname, router, homeHref]
  );

  /* switch langue — conserver la query */
  const switchLang = useCallback(
    (next) => {
      if (next === locale) return;
      setLocale(next);
      try { localStorage.setItem("mtr_locale", next); } catch {}
      if (typeof document !== "undefined") document.documentElement.lang = next;
      const qs = sp?.toString();
      const nextPath = swapLocaleInPath(pathname, next);
      const nextUrl = qs ? `${nextPath}?${qs}` : nextPath;
      router.push(nextUrl, { scroll: false });
    },
    [pathname, router, locale, sp]
  );

  /* ======================= Sous-composants ======================= */
  const ProductsMenu = ({ cats, locale }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [hoveredParent, setHoveredParent] = useState(null);

    const childrenMap = new Map();
    const getParentId = (c) => c?.parent?._id || c?.parent || c?.parentId || c?.parent_id || null;
    const getId = (c) => c?._id || pickName(c, locale);
    cats.forEach((c) => {
      const pid = getParentId(c);
      if (!pid) return;
      const arr = childrenMap.get(pid) || [];
      arr.push(c);
      childrenMap.set(pid, arr);
    });
    const tops = cats.filter((c) => !getParentId(c));

    const prodsByCat = new Map();
    const getProdCatId = (p) => p?.category?._id || p?.category || p?.categoryId || p?.category_id || null;
    (products || []).forEach((p) => {
      const cid = getProdCatId(p);
      if (!cid) return;
      const arr = prodsByCat.get(cid) || [];
      arr.push(p);
      prodsByCat.set(cid, arr);
    });

    return (
      <div
        className="relative"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => { setMenuOpen(false); setHoveredParent(null); }}
      >
        <button
          type="button"
          className="group relative px-3 py-2 text-[16px] font-medium text-[#0B2239] hover:text-[#F5B301]"
          aria-haspopup="true"
          aria-expanded={menuOpen ? "true" : "false"}
        >
          {t("nav.products")} <span className="ml-1">▾</span>
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-50 before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-2">
            <ul className="relative w-64 rounded-lg bg-white p-2 shadow-2xl ring-1 ring-slate-200 after:content-[''] after:absolute after:top-0 after:right-[-8px] after:w-2 after:h-full">
              {tops.map((parent) => {
                const id = getId(parent);
                const label = pickName(parent, locale);
                const hasChildren = !!childrenMap.get(id);
                const active = hoveredParent === id;
                return (
                  <li key={id}>
                    <Link
                      href={makeCatHref(parent, locale)}
                      onMouseEnter={() => setHoveredParent(id)}
                      className={`flex items-center justify-between rounded-md px-4 py-3 text-[16px] transition ${
                        active ? "bg-[#F5B301] text-[#0B2239]" : "text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]"
                      }`}
                    >
                      {label}
                      {hasChildren ? <span className="ml-3 text-xs opacity-70">›</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {hoveredParent && (
              <div className="absolute left-[100%] top-0 ml-2 w-72 rounded-lg bg-white p-2 shadow-2xl ring-1 ring-slate-200">
                {/* sous-catégories / produits  -> ici inchangé si tu en avais */}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const ClientNavItemsDesktop = () => {
    const [servicesOpen, setServicesOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const onDoc = (e) => { if (!ref.current?.contains(e.target)) setServicesOpen(false); };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const itemCls = "px-3 py-2 text-[16px] font-medium text-[#0B2239] hover:text-[#F5B301]";

    return (
      <>
        <Link href={`/${locale}/client/reclamations`} className={itemCls}>{t("client.claim")}</Link>
        <div ref={ref} className="relative">
          <button type="button" onClick={() => setServicesOpen((s) => !s)} className={itemCls} aria-haspopup="menu" aria-expanded={servicesOpen}>
            {t("client.myServices")} ▾
          </button>
          {servicesOpen && (
            <div role="menu" className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
              <Link href={`/${locale}/client/mes-devis`} role="menuitem" className="block px-4 py-2 text-[16px] text-slate-700 hover:bg-slate-50">
                {t("client.myQuotes")}
              </Link>
              <Link href={`/${locale}/client/mes-reclamations`} role="menuitem" className="block px-4 py-2 text-[16px] text-slate-700 hover:bg-slate-50">
                {t("client.myClaims")}
              </Link>
            </div>
          )}
        </div>
        <Link href={`/${locale}/client/devis`} className={itemCls}>{t("client.askQuote")}</Link>
      </>
    );
  };

  const ClientNavItemsMobile = () => (
    <details>
      <summary className="px-3 py-2 cursor-pointer select-none text-[16px]">{t("client.myServices")}</summary>
      <div className="pl-4 flex flex-col">
        <Link href={`/${locale}/client/mes-devis`} className="px-3 py-2 rounded hover:bg-slate-50 text-[16px]" onClick={() => setOpen(false)}>
          {t("client.myQuotes")}
        </Link>
        <Link href={`/${locale}/client/mes-reclamations`} className="px-3 py-2 rounded hover:bg-slate-50 text-[16px]" onClick={() => setOpen(false)}>
          {t("client.myClaims")}
        </Link>
      </div>
    </details>
  );

  const UserMenu = () => {
    const [uOpen, setUOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const onDoc = (e) => { if (!ref.current?.contains(e.target)) setUOpen(false); };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setUOpen((s) => !s)}
          aria-label={t("userMenu.aria")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-[#0B2239] hover:bg-slate-50"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {uOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50">
            <Link href={`/${locale}/client/profile`} onClick={() => setUOpen(false)} className="flex items-center gap-2 px-4 py-3 text-[16px] text-slate-700 hover:bg-slate-50">
              <User className="h-4 w-4" />
              {t("userMenu.profile")}
            </Link>
            <button
              onClick={() => { setUOpen(false); (onLogout || handleLogout)(); }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-[16px] text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              {t("userMenu.logout")}
            </button>
          </div>
        )}
      </div>
    );
  };

  async function handleLogout() {
    try { await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" }); }
    catch {}
    finally {
      try { localStorage.removeItem("mtr_role"); localStorage.removeItem("userRole"); localStorage.removeItem("rememberMe"); } catch {}
      setMe(null); setHintRole(null);
      router.replace(`/${locale}`);
    }
  }

  return (
    <header className={`${inter.className} sticky top-0 z-40`}>
      {/* top bar */}
      <div className="bg-[#0B2239] text-white">
        <div className="mx-auto max-w-screen-2xl px-2 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 h-auto min-h-[40px] py-1 text-[12px] sm:text-[14px]">
            <nav className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button type="button" onClick={() => goToSection("apropos")} className="opacity-90 transition hover:text-[#F5B301]" role="link">
                {t("topbar.about")}
              </button>
              <span className="hidden sm:inline opacity-40">|</span>
              <Link href={`/${locale}/help-desk`} className="opacity-90 transition hover:text-[#F5B301]">{t("topbar.helpdesk")}</Link>
              <span className="hidden sm:inline opacity-40">|</span>
              <button type="button" onClick={() => goToSection("presentation")} className="opacity-90 transition hover:text-[#F5B301]" role="link">
                {t("topbar.presentation")}
              </button>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <a href="https://www.facebook.com/profile.php?id=100076355199317&locale=fr_FR" target="_blank" rel="noreferrer" className="rounded-full bg-white/10 p-1.5 hover:bg-white/20" aria-label={t("aria.facebook")} title="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://www.linkedin.com/in/manufacutre-tunisienne-des-ressorts-22b388276/" target="_blank" rel="noreferrer" className="rounded-full bg-white/10 p-1.5 hover:bg-white/20" aria-label={t("aria.linkedin")} title="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => switchLang("fr")} className={`${locale === "fr" ? "ring-2 ring-[#F5B301] rounded-full" : ""} px-2 py-1 bg-transparent border-0 text-[13px] sm:text-[14px] font-semibold`} title={t("aria.langFR")} aria-pressed={locale === "fr"}>
                  FR
                </button>
                <button onClick={() => switchLang("en")} className={`${locale === "en" ? "ring-2 ring-[#F5B301] rounded-full" : ""} px-2 py-1 bg-transparent border-0 text-[13px] sm:text-[14px] font-semibold`} title={t("aria.langEN")} aria-pressed={locale === "en"}>
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* barre principale */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-screen-2xl px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href={`/${locale}`} className="flex items-center gap-3" aria-label={t("logoAlt")}>
              <Image src="/logo_MTR.png" alt={t("logoAlt")} width={90} height={90} className="object-contain" priority />
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <Link href={`/${locale}`} className="px-3 py-2 text-[15px] md:text-[16px] font-medium text-[#0B2239] hover:text-[#F5B301]">
                {t("nav.home")}
              </Link>

              {!isLoggedClient || isHome ? (
                <>
                  <button type="button" onClick={() => goToSection("presentation")} className="px-3 py-2 text-[15px] md:text-[16px] font-medium text-[#0B2239] hover:text-[#F5B301]" role="link">
                    {t("nav.company")}
                  </button>
                  <ProductsMenu cats={categories} locale={locale} />
                  <button type="button" onClick={() => goToSection("contact")} className="px-3 py-2 text-[15px] md:text-[16px] font-medium text-[#0B2239] hover:text-[#F5B301]" role="link">
                    {t("nav.contact")}
                  </button>
                  <button type="button" onClick={() => goToSection("localisation")} className="px-3 py-2 text-[15px] md:text-[16px] font-medium text-[#0B2239] hover:text-[#F5B301]" role="link">
                    {t("nav.location")}
                  </button>
                </>
              ) : (
                <ProductsMenu cats={categories} locale={locale} />
              )}

              {isLoggedClient && <ClientNavItemsDesktop />}
            </nav>

            <div className="flex items-center gap-3">
              {isLoggedClient ? (
                <UserMenu />
              ) : (
                <>
                  <Link href={`/${locale}/login`} className="hidden md:inline-block rounded-full bg-[#F5B301] px-4 py-2 text-[15px] md:text-[16px] font-semibold text-[#0B2239] shadow hover:brightness-95">
                    {t("actions.login")}
                  </Link>
                  <Link href={`/${locale}/devis`} className="hidden md:inline-block rounded-full bg-[#F5B301] px-4 py-2 text-[15px] md:text-[16px] font-semibold text-[#0B2239] shadow hover:brightness-95">
                    {t("actions.askQuote")}
                  </Link>
                </>
              )}

              <button onClick={() => setOpen((s) => !s)} aria-label={t("actions.openMenu")} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-[#0B2239] md:hidden">
                ☰
              </button>
            </div>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-top border-slate-200 bg-white">
            <div className="mx-auto max-w-screen-2xl px-4 py-3 flex flex-col gap-1">
              <Link href={`/${locale}`} className="rounded px-3 py-2 hover:bg-slate-50 text-[15px]" onClick={() => setOpen(false)}>
                {t("nav.home")}
              </Link>

              {(!isLoggedClient || isHome) && (
                <>
                  <button type="button" onClick={() => goToSection("presentation", true)} className="text-left rounded px-3 py-2 hover:bg-slate-50 text-[15px]" role="link">
                    {t("nav.company")}
                  </button>
                  <button type="button" onClick={() => goToSection("specialites", true)} className="text-left rounded px-3 py-2 hover:bg-slate-50 text-[15px]" role="link">
                    {t("nav.products")}
                  </button>
                  <button type="button" onClick={() => goToSection("contact", true)} className="text-left rounded px-3 py-2 hover:bg-slate-50 text-[15px]" role="link">
                    {t("nav.contact")}
                  </button>
                  <button type="button" onClick={() => goToSection("localisation", true)} className="text-left rounded px-3 py-2 hover:bg-slate-50 text-[15px]" role="link">
                    {t("nav.location")}
                  </button>
                </>
              )}

              {isLoggedClient ? (
                <>
                  <ClientNavItemsMobile />
                  <Link href={`/${locale}/client/devis`} onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-[#F5B301] px-4 py-2 text-center text-[15px] font-semibold text-[#0B2239] shadow hover:brightness-95">
                    {t("client.askQuote")}
                  </Link>
                </>
              ) : (
                <>
                  <Link href={`/${locale}/devis`} onClick={() => setOpen(false)} className="rounded-xl bg-[#F5B301] px-4 py-2 text-center text-[15px] font-semibold text-[#0B2239] shadow hover:brightness-95">
                    {t("actions.askQuote")}
                  </Link>
                  <Link href={`/${locale}/login`} onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-[#F5B301] px-4 py-2 text-center text-[15px] font-semibold text-[#0B2239] shadow hover:brightness-95">
                    {t("actions.login")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
