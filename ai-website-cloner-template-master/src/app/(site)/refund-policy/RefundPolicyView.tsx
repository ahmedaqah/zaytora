"use client";

import { useLanguage } from "@/context/LanguageContext";

const WHATSAPP_DISPLAY = "+970 59 270 6282";
const WHATSAPP_LINK = "https://wa.me/970592706282";
const SUPPORT_EMAIL = "info@zaytorainvites.com";

const COPY = {
  ar: {
    eyebrow: "الشروط والسياسات",
    heading: "سياسة الاسترداد",
    intro:
      "يتم الدفع في زيتورا عبر تحويل بنكي يدوي (لا توجد بوابة دفع إلكترونية)، ويقوم فريقنا بمراجعة كل تحويل وتفعيل الدعوة يدويًا خلال 24 ساعة من تأكيد الاستلام. توضح هذه الصفحة حقوقك بخصوص استرداد المبلغ في كل مرحلة.",
    sections: [
      {
        title: "١. قبل تفعيل الدعوة",
        body: [
          "يحق لك طلب استرداد كامل للمبلغ في أي وقت قبل تفعيل الدعوة.",
          "وإذا مرّ أكثر من 48 ساعة على تحويلك دون أن تُفعَّل دعوتك، فأنت مضمون استرداد كامل فوري بمجرد الطلب.",
        ],
      },
      {
        title: "٢. بعد تفعيل الدعوة",
        body: [
          "بمجرد تفعيل الدعوة (تصميمها بشكل نهائي وجاهزيتها للمشاركة مع ضيوفك)، تعتبر الخدمة منتجًا رقميًا مخصصًا بالكامل حسب طلبك، وبالتالي غير قابلة للاسترداد نهائيًا بعد هذه المرحلة.",
          "استثناء: إذا كان سبب المشكلة خللاً تقنيًا حقيقيًا من طرفنا يمنع الدعوة من العمل بشكل طبيعي، ولم نتمكن من إصلاحه خلال مدة معقولة، فيحق لك طلب استرداد حتى بعد التفعيل.",
        ],
      },
      {
        title: "٣. الدفع الزائد أو المكرر",
        body: [
          "إذا قمت بتحويل مبلغ أكبر من المطلوب، أو حولت مرتين عن طريق الخطأ، سنقوم برد الفرق أو المبلغ المكرر كاملًا فور اكتشافه أو إبلاغنا به.",
        ],
      },
      {
        title: "٤. كيف تطلب استرداد",
        body: [`تواصل معنا عبر واتساب (${WHATSAPP_DISPLAY}) أو البريد الإلكتروني (${SUPPORT_EMAIL})، مع ذكر رقم الطلب وصورة إثبات التحويل.`],
      },
      {
        title: "٥. طريقة الاسترداد ومدته",
        body: ["يتم رد المبلغ بنفس طريقة الدفع (تحويل بنكي) إلى نفس الحساب الذي حوّلت منه، خلال 3-5 أيام عمل من الموافقة على الطلب."],
      },
      {
        title: "٦. ملاحظة",
        body: ["أي رسوم تحويل بنكي (ذهابًا أو إيابًا) تكون على مسؤولية العميل ولا تُعتبر جزءًا من المبلغ المسترد."],
      },
    ],
    contactHeading: "تحتاج تطلب استرداد؟",
    contactWhatsapp: "راسلنا على واتساب",
    contactEmail: "راسلنا بالإيميل",
  },
  en: {
    eyebrow: "Terms & Policies",
    heading: "Refund Policy",
    intro:
      "Payment on Zaytora is made by manual bank transfer (there is no electronic payment gateway). Our team reviews every transfer and activates the invitation manually within 24 hours of confirming receipt. This page explains your refund rights at every stage.",
    sections: [
      {
        title: "1. Before your invitation is activated",
        body: [
          "You may request a full refund at any time before your invitation is activated.",
          "If more than 48 hours pass after your transfer without your invitation being activated, you are guaranteed an immediate full refund on request.",
        ],
      },
      {
        title: "2. After your invitation is activated",
        body: [
          "Once your invitation is activated (finalized and ready to share with your guests), the service is considered a fully custom digital product made to your order, and is therefore non-refundable from that point on.",
          "Exception: if the issue is a genuine technical fault on our side preventing the invitation from working normally, and we are unable to fix it within a reasonable time, you may still request a refund even after activation.",
        ],
      },
      {
        title: "3. Overpayment or duplicate payment",
        body: [
          "If you transfer more than the required amount, or transfer twice by mistake, we will refund the difference or the duplicate amount in full as soon as it is discovered or reported to us.",
        ],
      },
      {
        title: "4. How to request a refund",
        body: [`Contact us on WhatsApp (${WHATSAPP_DISPLAY}) or by email (${SUPPORT_EMAIL}), with your order number and proof of transfer.`],
      },
      {
        title: "5. Refund method and timeline",
        body: ["Refunds are issued the same way you paid (bank transfer) to the same sending account, within 3-5 business days of approval."],
      },
      {
        title: "6. Note",
        body: ["Any bank transfer fees (either direction) are the customer's responsibility and are not part of the refunded amount."],
      },
    ],
    contactHeading: "Need to request a refund?",
    contactWhatsapp: "Message us on WhatsApp",
    contactEmail: "Email us",
  },
};

export function RefundPolicyView() {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <div className="min-h-screen bg-background">
      <section className="px-4 pb-10 pt-20 text-center">
        <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8A24A]/30 bg-[#C8A24A]/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#C8A24A]">
          {t.eyebrow}
        </p>
        <h1 className="font-cinzel text-4xl font-bold text-foreground md:text-5xl">{t.heading}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-foreground">{t.intro}</p>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {t.sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-3 font-cinzel text-lg font-semibold text-foreground">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-relaxed text-body-foreground first:mt-0">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#C8A24A]/30 bg-[#C8A24A]/5 p-6 text-center">
          <h2 className="mb-4 font-cinzel text-lg font-semibold text-foreground">{t.contactHeading}</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#C8A24A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#A68832]"
            >
              {t.contactWhatsapp}
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background/5"
            >
              {t.contactEmail}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
