// app/support/page.jsx
"use client";
import { useTranslations } from "next-intl";
import { Mail, Phone, HelpCircle, MessageCircle } from "lucide-react";


export default function SupportPageClient() {
  const t = useTranslations("auth.support");

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-4xl mx-auto p-6 space-y-10">
        {/* Titre */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[#001F54]">{t("title")}</h1>
          <p className="text-gray-600">{t("intro")}</p>
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 text-[#001F54]">
            <HelpCircle className="w-5 h-5 text-[#FDC500]" />
            {t("faq.title")}
          </h2>
          <div className="space-y-3">
            <details className="p-4 border rounded-lg bg-white shadow hover:shadow-md transition">
              <summary className="font-medium cursor-pointer text-[#001F54]">
                {t("faq.q1.t")}
              </summary>
              <p className="mt-2 text-gray-600">{t("faq.q1.a")}</p>
            </details>

            <details className="p-4 border rounded-lg bg-white shadow hover:shadow-md transition">
              <summary className="font-medium cursor-pointer text-[#001F54]">
                {t("faq.q2.t")}
              </summary>
              <p className="mt-2 text-gray-600">{t("faq.q2.a")}</p>
            </details>

            <details className="p-4 border rounded-lg bg-white shadow hover:shadow-md transition">
              <summary className="font-medium cursor-pointer text-[#001F54]">
                {t("faq.q3.t")}
              </summary>
              <p className="mt-2 text-gray-600">{t("faq.q3.a")}</p>
            </details>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 text-[#001F54]">
            <MessageCircle className="w-5 h-5 text-[#FDC500]" />
            {t("contact.title")}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg text-center bg-[#001F54] text-white hover:bg-[#023E7D] transition">
              <Mail className="w-6 h-6 mx-auto text-[#FDC500]" />
              <p className="mt-2">{t("contact.email")}</p>
            </div>
            <div className="p-4 border rounded-lg text-center bg-[#001F54] text-white hover:bg-[#023E7D] transition">
              <Phone className="w-6 h-6 mx-auto text-[#FDC500]" />
              <p className="mt-2">{t("contact.phone")}</p>
            </div>
          </div>
        </section>


      </div>
 
    </div>

  );
}
