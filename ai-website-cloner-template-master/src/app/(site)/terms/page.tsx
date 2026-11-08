import type { Metadata } from "next";
import { LegalPage, type LegalCopy } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "الشروط والأحكام | ZAYTORA",
};

const ar: LegalCopy = {
  eyebrow: "الشروط والسياسات",
  heading: "الشروط والأحكام",
  intro:
    "باستخدامك موقع زيتورا وخدماته فإنك توافق على الشروط التالية. يرجى قراءتها بعناية قبل إنشاء حساب أو طلب أي دعوة.",
  sections: [
    {
      title: "١. الخدمة",
      body: [
        "زيتورا منصة لتصميم الدعوات الرقمية ومشاركتها مع الضيوف، وتشمل إدارة الردود (RSVP) وكاميرا الحدث ومشاركة رمز QR.",
      ],
    },
    {
      title: "٢. الحساب",
      body: [
        "أنت مسؤول عن صحة بيانات حسابك وعن الحفاظ على سرية كلمة المرور، وعن كل نشاط يتم من خلال حسابك.",
        "يمكنك حذف حسابك في أي وقت من قائمة الحساب أو من أسفل الموقع، وعند الحذف تُزال دعواتك وبياناتك نهائيًا.",
      ],
    },
    {
      title: "٣. الطلبات والدفع",
      body: [
        "يتم الدفع عبر تحويل بنكي يدوي، ويقوم فريقنا بمراجعة التحويل وتفعيل الدعوة يدويًا بعد تأكيد الاستلام.",
        "تخضع عمليات الاسترداد لـ سياسة الاسترداد المنشورة على الموقع.",
      ],
    },
    {
      title: "٤. المحتوى الذي تضيفه",
      body: [
        "أنت المسؤول عن النصوص والصور والمقاطع التي تضيفها إلى دعوتك، ويجب أن تملك حق استخدامها.",
        "يُمنع استخدام الخدمة لنشر محتوى مسيء أو مخالف للقانون أو ينتهك حقوق الآخرين، ويحق لنا إزالة أي محتوى من هذا النوع.",
      ],
    },
    {
      title: "٥. الملكية الفكرية",
      body: [
        "تصاميم القوالب والعلامة التجارية وشعار زيتورا ملك لزيتورا، ولا يجوز نسخها أو إعادة بيعها دون إذن كتابي.",
      ],
    },
    {
      title: "٦. حدود المسؤولية",
      body: [
        "نبذل جهدنا لضمان استمرارية الخدمة، لكننا لا نضمن عدم انقطاعها أو خلوها من الأخطاء، ولا نتحمل مسؤولية أي خسائر غير مباشرة ناتجة عن استخدامها.",
      ],
    },
    {
      title: "٧. التعديلات",
      body: ["يجوز لنا تحديث هذه الشروط من وقت لآخر، ويعتبر استمرارك في استخدام الموقع موافقة على النسخة المحدثة."],
    },
  ],
  contactHeading: "عندك سؤال عن الشروط؟",
  contactWhatsapp: "راسلنا على واتساب",
  contactEmail: "راسلنا بالإيميل",
};

const en: LegalCopy = {
  eyebrow: "Terms & Policies",
  heading: "Terms & Conditions",
  intro:
    "By using Zaytora and its services you agree to the following terms. Please read them carefully before creating an account or ordering an invitation.",
  sections: [
    {
      title: "1. The service",
      body: [
        "Zaytora is a platform for designing digital invitations and sharing them with guests, including RSVP management, an event camera and QR code sharing.",
      ],
    },
    {
      title: "2. Your account",
      body: [
        "You are responsible for the accuracy of your account details, for keeping your password confidential, and for all activity under your account.",
        "You can delete your account at any time from the account menu or the site footer. Deleting it permanently removes your invitations and data.",
      ],
    },
    {
      title: "3. Orders and payment",
      body: [
        "Payment is made by manual bank transfer. Our team reviews the transfer and activates the invitation manually once receipt is confirmed.",
        "Refunds are governed by the Refund Policy published on this site.",
      ],
    },
    {
      title: "4. Content you add",
      body: [
        "You are responsible for the text, images and videos you add to your invitation and must have the right to use them.",
        "You may not use the service to publish abusive or unlawful content or content that infringes others' rights, and we may remove such content.",
      ],
    },
    {
      title: "5. Intellectual property",
      body: [
        "Template designs, the Zaytora brand and logo belong to Zaytora and may not be copied or resold without written permission.",
      ],
    },
    {
      title: "6. Limitation of liability",
      body: [
        "We work to keep the service running but do not guarantee it will be uninterrupted or error-free, and we are not liable for indirect losses arising from its use.",
      ],
    },
    {
      title: "7. Changes",
      body: ["We may update these terms from time to time. Continued use of the site means you accept the updated version."],
    },
  ],
  contactHeading: "Questions about these terms?",
  contactWhatsapp: "Message us on WhatsApp",
  contactEmail: "Email us",
};

export default function TermsPage() {
  return <LegalPage copy={{ ar, en }} />;
}
