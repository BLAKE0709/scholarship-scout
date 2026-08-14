import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

// Single swap point for the production domain at deploy time.
const PRODUCT_DOMAIN = "scholarshipscout.app";
const SUPPORT_EMAIL = `support@${PRODUCT_DOMAIN}`;

export const metadata: Metadata = {
  title: "Privacy Policy — Scholarship Scout",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="August 14, 2026"
      intro={
        <p>
          Scholarship Scout (&quot;Scout,&quot; &quot;we,&quot; &quot;us&quot;)
          is a family-operated service based in Texas that helps students find
          and win scholarships. This policy says what we collect, why, and the
          boundaries we enforce — in plain English, because parents and students
          are the people who actually read it. Questions:{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      }
      sections={[
        {
          id: "who-can-use",
          heading: "Who can use Scout",
          body: (
            <>
              <p>
                Scout is for users 13 and older. Users under 18 need a parent or
                guardian&apos;s consent to use the service. Parent accounts
                exist as their own role and connect to a student&apos;s account
                only through a link the student accepts.
              </p>
            </>
          ),
        },
        {
          id: "what-we-collect",
          heading: "What we collect",
          body: (
            <>
              <p>
                <strong>Account information:</strong> name, email address, and
                role (student, parent, or counselor).
              </p>
              <p>
                <strong>Student academic profile:</strong> what you choose to
                enter — GPA, graduation year, state, interests, activities, and
                achievements. This exists so matching works; more detail means
                better matches, but how much to share is your call.
              </p>
              <p>
                <strong>Your work:</strong> essays you draft, documents you
                upload to the vault, and the applications you track.
              </p>
              <p>
                <strong>AI coaching interactions:</strong> when a student uses
                the essay coach, the text they submit and the conversation
                around it.
              </p>
              <p>
                <strong>Usage and billing:</strong> first-party analytics events
                (what features get used, so we can improve them) and
                subscription status. Payments run through Stripe — card numbers
                never touch our servers.
              </p>
            </>
          ),
        },
        {
          id: "privacy-boundaries",
          heading: "The boundaries we enforce in the product",
          body: (
            <>
              <p>
                Linked parents and counselors can see a student&apos;s progress:
                matches, deadlines, application status, and wins. They can{" "}
                <strong>never</strong> see essay drafts, essay revision history,
                or AI coaching conversations. That wall is enforced by our APIs,
                not by policy language — the endpoints that serve parent and
                counselor views exclude that content outright.
              </p>
            </>
          ),
        },
        {
          id: "how-we-use",
          heading: "How we use your information",
          body: (
            <>
              <p>
                To match students with scholarships, track deadlines and send
                alerts, coach essays, run the family features you enable,
                process subscriptions, and improve the product.
              </p>
              <p>
                We do <strong>not</strong> sell personal information. We do{" "}
                <strong>not</strong> use your data for advertising. We do{" "}
                <strong>not</strong> train AI models on student essays.
              </p>
            </>
          ),
        },
        {
          id: "third-parties",
          heading: "Service providers we rely on",
          body: (
            <>
              <p>
                Scout runs on a small set of processors, each receiving only
                what its job requires: <strong>Supabase</strong> (database and
                authentication), <strong>Vercel</strong> (hosting),{" "}
                <strong>Stripe</strong> (payments), <strong>Anthropic</strong>{" "}
                (AI essay coaching — coaching requests are processed by their
                API), and a transactional email provider (account and deadline
                emails). We don&apos;t hand your data to anyone else unless the
                law requires it.
              </p>
            </>
          ),
        },
        {
          id: "your-rights",
          heading: "Your rights and controls",
          body: (
            <>
              <p>
                <strong>Export:</strong> the vault export gives you your data
                anytime, in-product. <strong>Correction:</strong> profile data
                is editable directly. <strong>Deletion:</strong> email{" "}
                <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>{" "}
                and we will delete your account and associated data. Scout is a
                consumer product used by families directly; we are not a school
                official under FERPA, and we don&apos;t receive records from
                schools.
              </p>
            </>
          ),
        },
        {
          id: "security-retention",
          heading: "Security and retention",
          body: (
            <>
              <p>
                Data is encrypted in transit and at rest by our hosting
                providers. Access to production systems is limited to the people
                who operate Scout. We keep your data while your account is
                active and delete it when you ask us to close the account,
                except records we must keep for tax or legal reasons (like
                billing history).
              </p>
            </>
          ),
        },
        {
          id: "changes",
          heading: "Changes to this policy",
          body: (
            <>
              <p>
                If we change this policy in a way that matters, we&apos;ll email
                account holders at least 14 days before it takes effect and post
                the new version here with a fresh date.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
