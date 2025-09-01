"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Image from "next/image";
import { ShieldCheck, FileText, Database, Cookie, Lock, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";

/* ---------- Anim helpers ---------- */
const vSection = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: .5 } } };
const vStagger = { hidden: {}, show: { transition: { staggerChildren: .08, delayChildren: .04 } } };
const vItem = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: .45 } } };

export default function PrivacyPolicyClient() {
  const p = useParams();
  const locale = typeof p?.locale === "string" ? p.locale : "fr";
  const t = useTranslations("legal.privacy");

  // Date de MAJ (à adapter si tu veux la charger du backend)
  const lastUpdated = new Date("2025-08-26T00:00:00Z");
  const lastUpdatedLabel = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(lastUpdated);

  const blocks = [
    {
      icon: <FileText className="h-5 w-5 text-[#F5B301]" />,
      title: t("blocks.collect.title"),
      content: (
        <>
          <p>
            {t.rich("blocks.collect.p1", {
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <p className="mt-2">{t("blocks.collect.p2")}</p>
        </>
      ),
    },
    {
      icon: <Database className="h-5 w-5 text-[#F5B301]" />,
      title: t("blocks.usage.title"),
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>{t.rich("blocks.usage.li1", { b: (c) => <strong>{c}</strong> })}</li>
          <li>{t.rich("blocks.usage.li2", { b: (c) => <strong>{c}</strong> })}</li>
          <li>{t.rich("blocks.usage.li3", { b: (c) => <strong>{c}</strong> })}</li>
        </ul>
      ),
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-[#F5B301]" />,
      title: t("blocks.legal.title"),
      content: (
        <>
          <p>{t.rich("blocks.legal.p1", { b: (c) => <strong>{c}</strong> })}</p>
          <p className="mt-2">{t("blocks.legal.p2")}</p>
        </>
      ),
    },
    {
      icon: <Lock className="h-5 w-5 text-[#F5B301]" />,
      title: t("blocks.security.title"),
      content: (
        <>
          <p>{t.rich("blocks.security.p1", { b: (c) => <strong>{c}</strong> })}</p>
          <p className="mt-2">{t.rich("blocks.security.p2", { b: (c) => <strong>{c}</strong> })}</p>
        </>
      ),
    },
    {
      icon: <Cookie className="h-5 w-5 text-[#F5B301]" />,
      title: t("blocks.cookies.title"),
      content: (
        <>
          <p>{t("blocks.cookies.p1")}</p>
          <p className="mt-2">{t("blocks.cookies.p2")}</p>
        </>
      ),
    },
    {
      icon: <RefreshCw className="h-5 w-5 text-[#F5B301]" />,
      title: t("blocks.rights.title"),
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>{t.rich("blocks.rights.li1", { b: (c) => <strong>{c}</strong> })}</li>
          <li>{t.rich("blocks.rights.li2", { b: (c) => <strong>{c}</strong> })}</li>
          <li>{t.rich("blocks.rights.li3", { b: (c) => <strong>{c}</strong> })}</li>
          <li>{t.rich("blocks.rights.li4", { b: (c) => <strong>{c}</strong> })}</li>
          <li>{t.rich("blocks.rights.li5", { b: (c) => <strong>{c}</strong> })}</li>
        </ul>
      ),
    },
    {
      icon: <Mail className="h-5 w-5 text-[#F5B301]" />,
      title: t("blocks.contact.title"),
      content: (
        <p>
          {t.rich("blocks.contact.p", {
            email: (chunks) => (
              <a href="mailto:contact@mtr.tn" className="underline underline-offset-4">
                {chunks}
              </a>
            ),
            help: (chunks) => (
              <Link href={`/${locale}/help-desk`} className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <SiteHeader />

      {/* HERO */}
      <section id="accueil" className="relative -mt-10 flex min-h-[45vh] items-center justify-center bg-[#0B2239] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(255,255,255,0.06),transparent),radial-gradient(60%_40%_at_85%_80%,rgba(245,179,1,0.10),transparent)]" />
        <motion.div variants={vSection} initial="hidden" animate="show" className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <ShieldCheck className="h-6 w-6 text-[#F5B301]" />
          </div>
          <h1 className="text-4xl font-extrabold md:text-5xl">{t("hero.title")}</h1>
          <p className="mt-3 text-white/80">{t("hero.subtitle")}</p>
          <p className="mt-2 text-xs text-white/60">{t("hero.lastUpdated", { date: lastUpdatedLabel })}</p>
        </motion.div>
      </section>

      {/* CONTENT */}
      <motion.section variants={vSection} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="bg-white py-14">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div variants={vStagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="grid gap-6">
              {blocks.map((b, i) => (
                <motion.article key={i} variants={vItem} className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                  <div className="mb-3 inline-flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B2239]/5">{b.icon}</span>
                    <h2 className="text-lg font-bold text-[#0B2239]">{b.title}</h2>
                  </div>
                  <div className="prose prose-slate max-w-none text-slate-700">{b.content}</div>
                </motion.article>
              ))}
            </div>

            {/* CTA aide */}
            <motion.div variants={vItem} className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <p className="text-slate-700">{t("cta.question")}</p>
              <div className="flex gap-3">
                <Link href={`/${locale}/help-desk`} className="rounded-full border border-[#F5B301] px-5 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301]">
                  {t("cta.helpCenter")}
                </Link>
                <a href="mailto:contact@mtr.tn" className="rounded-full bg-[#F5B301] px-5 py-2 text-sm font-semibold text-[#0B2239] hover:brightness-95">
                  {t("cta.writeEmail")}
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <SiteFooter />
    </div>
  );
}
