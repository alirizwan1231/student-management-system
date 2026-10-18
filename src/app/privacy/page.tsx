import { LegalShell, H2, UL } from "@/components/legal/LegalShell";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const { appName, operator, retentionDays, minimumAge, supportEmail } = LEGAL;
  return (
    <LegalShell title="Privacy Policy" updated={LEGAL.lastUpdated}>
      <p>
        {appName} is run by {operator} (&quot;we&quot;, &quot;us&quot;). This policy explains what personal data we collect when you use the app, why we collect it,
        who can see it, and the choices you have. We keep it short and we do not sell your data.
      </p>

      <H2>1. What we collect</H2>
      <UL
        items={[
          <><b>Account data:</b> your email address and a password (stored only as a secure hash by our authentication provider). If you use email-code sign-in, we send a one-time code to your email.</>,
          <><b>Content you create:</b> semesters, subjects, instructors, lecture notes, tasks, timetable entries, attendance records, exam dates, comments, polls and the files you upload.</>,
          <><b>Group data:</b> if you create or join a study group, your group membership and anything you choose to share with that group.</>,
          <><b>Technical data:</b> basic logs such as IP address, browser type and error information, created by our hosting and infrastructure providers for security and reliability.</>,
          <><b>Messages you send us:</b> if you use the contact form, your name, email and message.</>,
        ]}
      />
      <p>We do not use advertising trackers or analytics cookies, and we do not build advertising profiles.</p>

      <H2>2. Cookies and data stored on your device</H2>
      <p>
        We use only essential cookies to keep you signed in. To let the app work offline, a copy of your data is stored in your browser (IndexedDB), together with a
        service-worker cache of the app pages and a few preferences in local storage. Signing out or deleting your account clears this local copy.
      </p>

      <H2>3. How we use your data</H2>
      <UL items={["To provide the app: store, sync and show your academic information across your devices.", "To keep your account secure and prevent abuse.", "To send service emails: sign-in codes, password resets, account notices and replies to your messages.", "To fix bugs and improve reliability."]} />

      <H2>4. Who can see your data</H2>
      <UL
        items={[
          "Only you, by default. Your data is protected by per-user access rules in the database.",
          "Members of a study group can see what you choose to share to that group.",
          "Platform administrators can view account and content records when needed for support, abuse prevention or security. Administrator actions are recorded in an audit log.",
          "Our service providers, only as needed to run the service (see below).",
        ]}
      />

      <H2>5. Service providers</H2>
      <UL
        items={[
          "Supabase: database and authentication.",
          "Cloudflare R2: storage of the files you upload.",
          "Resend and our email provider: delivery of service emails.",
          "Our hosting provider: serving the website.",
        ]}
      />
      <p>These providers may process data in countries other than your own, under their own security and privacy commitments.</p>

      <H2>6. How long we keep data</H2>
      <p>
        We keep your data until you delete it or delete your account. When you delete your account in Settings, your database records and uploaded files are removed
        immediately; copies in provider backups may remain for up to {retentionDays} days before they expire.
      </p>

      <H2>7. Your rights and choices</H2>
      <UL
        items={[
          "Access and portability: download a copy of your data from Settings (Your data and privacy).",
          "Correction: edit your information inside the app at any time.",
          "Deletion: delete your account from Settings.",
          "Questions or complaints: contact us using the details below. Depending on where you live, you may also have the right to complain to your local data-protection authority.",
        ]}
      />

      <H2>8. Security</H2>
      <p>
        Data is encrypted in transit (HTTPS). Files are stored in a private bucket and are only reachable through short-lived links issued to the file&apos;s owner.
        No system is perfectly secure, so please use a strong, unique password and keep your devices protected.
      </p>

      <H2>9. Children</H2>
      <p>The service is not intended for children under {minimumAge}. If you believe a child has created an account, contact us and we will delete it.</p>

      <H2>10. Changes to this policy</H2>
      <p>We may update this policy. If the changes are significant we will tell you in the app or by email. The date at the top shows the latest version.</p>

      <H2>11. Contact</H2>
      <p>
        Questions about privacy: <a className="font-semibold text-brand-600 hover:underline dark:text-brand-400" href={`mailto:${supportEmail}`}>{supportEmail}</a> or use the{" "}
        <a className="font-semibold text-brand-600 hover:underline dark:text-brand-400" href="/contact">contact form</a>.
      </p>
    </LegalShell>
  );
}
