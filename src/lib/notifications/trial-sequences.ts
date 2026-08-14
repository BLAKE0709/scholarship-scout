import { createNotification } from "@/lib/notifications/engine";

interface TrialEmailTemplate {
  subject: string;
  bodyTemplate: string;
}

const TRIAL_SEQUENCES: Record<number, TrialEmailTemplate> = {
  1: {
    subject: "Your 14-day Pro trial has started!",
    bodyTemplate:
      "Welcome to Scholarship Scout Pro! For the next 14 days, you have access to unlimited scholarship matches, unlimited essay drafts with AI assistance, your personal Fidelity Score, full Vault export, and priority support. Make the most of it — start by exploring your top matches.",
  },
  7: {
    subject: "One week in — how is Scholarship Scout working for you?",
    bodyTemplate:
      "You are one week into your Pro trial. By now you have had access to unlimited matches and essay tools. Keep building momentum — the scholarships you discover and the essays you refine now will pay off when application deadlines arrive. Your trial continues for 7 more days.",
  },
  12: {
    subject: "Your trial ends in 2 days",
    bodyTemplate:
      "Your Pro trial expires in just 2 days. After that, you will lose access to unlimited matches, unlimited essays, your Fidelity Score, and Vault export. Subscribe now to keep everything — your data and progress are preserved either way.",
  },
  14: {
    subject: "Your Pro trial has ended",
    bodyTemplate:
      "Your 14-day Pro trial has come to an end. You are now on the Free plan with limited matches and essays. The good news: all your saved scholarships, essays, and progress are still here. Subscribe to Pro to pick up right where you left off.",
  },
  17: {
    subject: "We miss you — here is what you are missing",
    bodyTemplate:
      "Since your Pro trial ended, new scholarships have been added that match your profile. On the Free plan, you are limited to 5 matches per month. Upgrade to Pro to see all your matches, get unlimited essay help, and unlock your Fidelity Score. Your saved data is waiting for you.",
  },
};

export function getTrialEmailForDay(
  dayNumber: number,
): TrialEmailTemplate | null {
  return TRIAL_SEQUENCES[dayNumber] ?? null;
}

export async function sendTrialEmail(
  userId: string,
  dayNumber: number,
): Promise<void> {
  const template = getTrialEmailForDay(dayNumber);

  if (!template) {
    return;
  }

  await createNotification({
    userId,
    type: "nudge",
    title: template.subject,
    body: template.bodyTemplate,
    actionUrl: dayNumber >= 12 ? "/pricing" : "/dashboard",
    metadata: {
      trialSequence: true,
      trialDay: dayNumber,
    },
  });
}
