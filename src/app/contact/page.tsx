import { LegalShell } from "@/components/legal/LegalShell";
import { ContactForm } from "@/components/legal/ContactForm";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <LegalShell title="Contact us" updated={LEGAL.lastUpdated}>
      <p>Found a bug, need help, or have a privacy question? Send us a message and we will reply by email.</p>
      <ContactForm />
    </LegalShell>
  );
}
