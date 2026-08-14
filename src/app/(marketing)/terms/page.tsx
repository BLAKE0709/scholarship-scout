import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

// Single swap point for the production domain at deploy time.
const PRODUCT_DOMAIN = "scholarshipscout.app";
const SUPPORT_EMAIL = `support@${PRODUCT_DOMAIN}`;

export const metadata: Metadata = {
  title: "Terms of Service — Scholarship Scout",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="August 14, 2026"
      intro={
        <p>
          These terms are the deal between you and Scholarship Scout
          (&quot;Scout,&quot; &quot;we,&quot; &quot;us&quot;), a family-operated
          service based in Texas. Short version: use Scout honestly, your work
          stays yours, cancel whenever you like. The longer version below is
          still written to be read. Questions:{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      }
      sections={[
        {
          id: "accounts",
          heading: "Accounts and eligibility",
          body: (
            <>
              <p>
                You must be 13 or older to create an account, and under-18 users
                need a parent or guardian&apos;s consent. Keep your login to
                yourself; you&apos;re responsible for activity on your account.
                Parent and counselor accounts see what the product allows them
                to see and nothing more (see the Privacy Policy for the exact
                boundaries).
              </p>
            </>
          ),
        },
        {
          id: "plans-billing",
          heading: "Plans, trials, and billing",
          body: (
            <>
              <p>
                The Free plan is free indefinitely. Pro and Family start with a
                14-day trial that does not require a card. Paid subscriptions
                renew automatically — monthly or yearly, at the price shown when
                you subscribe — until you cancel. Billing is handled by Stripe.
              </p>
              <p>
                <strong>Cancellation:</strong> cancel anytime from billing
                settings. Your plan stays active through the end of the period
                you already paid for, then stops. We don&apos;t offer pro-rated
                refunds for unused time, and we won&apos;t charge you again
                after you cancel. If a price ever changes, we&apos;ll tell you
                by email at least 14 days before it affects you.
              </p>
            </>
          ),
        },
        {
          id: "your-work",
          heading: "Your work stays yours",
          body: (
            <>
              <p>
                Essays, documents, and profile content belong to you. You give
                us only the license needed to store and process them so the
                product works. The essay coach is designed to preserve your
                authorship — it gives feedback and measures fidelity to your own
                writing; it does not produce essays for submission. You are
                responsible for what you submit to scholarship providers and
                schools, including complying with their rules on outside help.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          heading: "Acceptable use",
          body: (
            <>
              <p>
                Don&apos;t misrepresent your identity or achievements to
                providers, don&apos;t submit work that isn&apos;t yours,
                don&apos;t probe or disrupt the service, and don&apos;t scrape
                or resell the scholarship database. We can suspend accounts that
                abuse the service or other people.
              </p>
            </>
          ),
        },
        {
          id: "listings",
          heading: "About scholarship listings",
          body: (
            <>
              <p>
                Scholarship amounts, deadlines, and criteria are set by their
                providers and can change without notice. We verify listings
                against the provider&apos;s own page and link the source on
                every award so you can check the original — but we don&apos;t
                control providers, and we can&apos;t guarantee any award,
                outcome, or that a listing hasn&apos;t changed since we last
                verified it. Scout is an information and organization tool, not
                a guarantee of money.
              </p>
            </>
          ),
        },
        {
          id: "disclaimers",
          heading: "Disclaimers and limits on liability",
          body: (
            <>
              <p>
                Scout is provided &quot;as is.&quot; To the extent the law
                allows, we disclaim implied warranties, and our total liability
                for any claim related to the service is limited to the amount
                you paid us in the 12 months before the claim. We&apos;re a
                family company; we&apos;ll always try to make things right first
                — email us.
              </p>
            </>
          ),
        },
        {
          id: "termination",
          heading: "Closing your account",
          body: (
            <>
              <p>
                You can close your account anytime by canceling and emailing{" "}
                <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                ; we&apos;ll delete your data per the Privacy Policy. We can
                suspend or close accounts that violate these terms, with notice
                unless the violation makes that unreasonable.
              </p>
            </>
          ),
        },
        {
          id: "law-changes",
          heading: "Governing law and changes",
          body: (
            <>
              <p>
                These terms are governed by Texas law. If we change them in a
                way that matters, we&apos;ll email account holders at least 14
                days before the change takes effect. Continuing to use Scout
                after that means you accept the updated terms.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
