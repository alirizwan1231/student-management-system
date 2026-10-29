import { LegalShell, H2, UL } from "@/components/legal/LegalShell";
import { LEGAL } from "@/lib/legal";
import { MAX_FILE_SIZE_MB } from "@/lib/r2/validation";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const { appName, operator, country, minimumAge, supportEmail } = LEGAL;
  return (
    <LegalShell title="Terms of Service" updated={LEGAL.lastUpdated}>
      <p>
        These terms govern your use of {appName}, run by {operator}. By creating an account or using the app you agree to them. If you do not agree, please do not use the service.
      </p>

      <H2>1. Your account</H2>
      <UL items={[`You must be at least ${minimumAge} years old.`, "Give accurate information and keep your password secret. You are responsible for activity on your account.", "Tell us promptly if you think your account has been compromised."]} />

      <H2>2. Acceptable use</H2>
      <p>You agree not to:</p>
      <UL
        items={[
          "upload or share anything illegal, harmful, hateful, harassing or that infringes someone else's rights (including copyright);",
          "upload malware or try to break, probe or overload the service or other users' accounts;",
          `exceed the limits of the service, such as the ${MAX_FILE_SIZE_MB} MB per-file upload limit, or use it as general-purpose file hosting;`,
          "use the service to cheat on assessments or violate your institution's rules;",
          "create accounts by automated means or resell access to the service.",
        ]}
      />

      <H2>3. Your content</H2>
      <p>
        You own what you create and upload. You give us permission to store, process and display it only as needed to run the service for you, and to show it to the study
        groups and people you choose to share it with. You are responsible for having the right to upload and share your content.
      </p>

      <H2>4. Study groups</H2>
      <p>
        Things you share to a group can be seen by its members, who may keep copies. Group owners can remove members and content. Share carefully, and do not share other
        people&apos;s private information.
      </p>

      <H2>5. Availability and your data</H2>
      <p>
        We work to keep the service reliable, but it is provided &quot;as is&quot; and may be interrupted or changed. The app stores a copy of your data on your device so it
        works offline; sync happens when you are online. Please keep your own backup of important material using the data download in Settings.
      </p>

      <H2>6. Suspension and termination</H2>
      <p>
        You can delete your account at any time in Settings. We may suspend or remove accounts or content that breach these terms or put the service or other users at risk,
        and will try to tell you why when we can.
      </p>

      <H2>7. Disclaimer and limit of liability</H2>
      <p>
        To the extent allowed by law, we do not give any warranty that the service will be uninterrupted or error-free, and we are not liable for indirect or consequential
        losses, or for lost data or grades. Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <H2>8. Changes</H2>
      <p>We may update these terms. If you keep using the service after an update, you accept the new terms. We will tell you about significant changes.</p>

      <H2>9. Governing law</H2>
      <p>These terms are governed by the laws of {country}, without affecting any mandatory consumer rights you have where you live.</p>

      <H2>10. Contact</H2>
      <p>
        Questions: <a className="font-semibold text-brand-600 hover:underline dark:text-brand-400" href={`mailto:${supportEmail}`}>{supportEmail}</a>. See also our{" "}
        <a className="font-semibold text-brand-600 hover:underline dark:text-brand-400" href="/privacy">Privacy Policy</a>.
      </p>
    </LegalShell>
  );
}
