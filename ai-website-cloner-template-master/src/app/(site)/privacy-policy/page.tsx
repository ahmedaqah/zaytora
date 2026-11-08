import type { Metadata } from "next";
import { LegalPage, type LegalCopy } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | ZAYTORA",
};

const ar: LegalCopy = {
  eyebrow: "الشروط والسياسات",
  heading: "سياسة الخصوصية",
  intro: "نحترم خصوصيتك. توضح هذه الصفحة ما البيانات التي نجمعها وكيف نستخدمها وكيف تتحكم بها.",
  sections: [
    {
      title: "١. البيانات التي نجمعها",
      body: [
        "بيانات الحساب: الاسم والبريد الإلكتروني وكلمة المرور (مشفّرة)، أو بيانات تسجيل الدخول عبر Google عند اختيارك ذلك.",
        "محتوى دعواتك: النصوص والصور والمقاطع وتفاصيل المناسبة التي تضيفها بنفسك.",
        "بيانات الطلبات: تفاصيل الطلب وإثبات التحويل البنكي الذي ترسله لنا.",
        "ردود الضيوف (RSVP) والصور التي يرفعها الضيوف عبر كاميرا الحدث، وتُحفظ ضمن دعوتك.",
      ],
    },
    {
      title: "٢. كيف نستخدم بياناتك",
      body: [
        "لتشغيل حسابك وإنشاء دعواتك ومشاركتها، ولمعالجة الطلبات وتفعيل الدعوات، وللتواصل معك بخصوص طلبك أو الدعم الفني.",
      ],
    },
    {
      title: "٣. المشاركة",
      body: [
        "لا نبيع بياناتك. تظهر دعوتك لمن تشاركهم رابطها أو رمز QR الخاص بها فقط، وقد نستعين بمزوّدي استضافة وبنية تحتية لتشغيل الموقع بشرط التزامهم بحماية البيانات.",
      ],
    },
    {
      title: "٤. الاحتفاظ بالبيانات وحذفها",
      body: [
        "نحتفظ ببياناتك طالما حسابك فعال. يمكنك حذف حسابك في أي وقت من قائمة الحساب أو من أسفل الموقع، وعندها تُحذف دعواتك وبياناتك نهائيًا ولا يمكن استرجاعها.",
      ],
    },
    {
      title: "٥. حقوقك",
      body: ["يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها في أي وقت عبر التواصل معنا."],
    },
    {
      title: "٦. التحديثات",
      body: ["قد نحدّث هذه السياسة من وقت لآخر، وسيظهر تاريخ آخر تحديث على هذه الصفحة عند أي تغيير جوهري."],
    },
  ],
  contactHeading: "عندك سؤال عن خصوصيتك؟",
  contactWhatsapp: "راسلنا على واتساب",
  contactEmail: "راسلنا بالإيميل",
};

const en: LegalCopy = {
  eyebrow: "Terms & Policies",
  heading: "Privacy Policy",
  intro: "We respect your privacy. This page explains what data we collect, how we use it and how you control it.",
  sections: [
    {
      title: "1. Data we collect",
      body: [
        "Account data: your name, email and password (stored hashed), or your Google sign-in details if you choose that option.",
        "Invitation content: the text, images, videos and event details you add yourself.",
        "Order data: order details and the proof of bank transfer you send us.",
        "Guest RSVPs and photos uploaded by guests through the event camera, which are stored with your invitation.",
      ],
    },
    {
      title: "2. How we use your data",
      body: [
        "To run your account, create and share your invitations, process orders and activate invitations, and to contact you about your order or support.",
      ],
    },
    {
      title: "3. Sharing",
      body: [
        "We do not sell your data. Your invitation is visible only to people you share its link or QR code with. We use hosting and infrastructure providers to run the site, who are required to protect the data.",
      ],
    },
    {
      title: "4. Retention and deletion",
      body: [
        "We keep your data while your account is active. You can delete your account at any time from the account menu or the site footer, after which your invitations and data are permanently deleted and cannot be recovered.",
      ],
    },
    {
      title: "5. Your rights",
      body: ["You can ask to access, correct or delete your data at any time by contacting us."],
    },
    {
      title: "6. Updates",
      body: ["We may update this policy from time to time and will update the date on this page for any material change."],
    },
  ],
  contactHeading: "Questions about your privacy?",
  contactWhatsapp: "Message us on WhatsApp",
  contactEmail: "Email us",
};

export default function PrivacyPolicyPage() {
  return <LegalPage copy={{ ar, en }} />;
}
