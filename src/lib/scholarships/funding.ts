import { z } from "zod";

export const FundingSchema = z.object({
  kind: z.enum(["scholarship", "grant", "tuition_discount", "employer_assistance", "paid_placement", "loan_repayment"]),
  amountType: z.enum(["fixed", "range", "percentage", "varies"]),
  percentage: z.number().positive().max(100).optional(),
  amountDescription: z.string().optional(),
  applicationCycle: z.string().optional(),
  opensOn: z.string().date().nullable().optional(),
  deadlineType: z.enum(["fixed", "rolling", "unannounced"]).optional(),
  fundingTiming: z.string().optional(),
  serviceObligation: z.string().optional(),
  stackingPolicy: z.string().optional(),
  eligibleExpenses: z.array(z.string()).optional(),
  nextStep: z.string().trim().min(1).max(1200).optional(),
}).refine((value) => value.amountType !== "percentage" || value.percentage !== undefined, "Percentage funding needs a percentage");
export type Funding = z.infer<typeof FundingSchema>;
export function parseFunding(value: unknown): Funding | null {
  const result = FundingSchema.safeParse(value);
  return result.success ? result.data : null;
}
export const fundingKindLabels: Record<Funding["kind"], string> = {
  scholarship: "Scholarship", grant: "Grant", tuition_discount: "Tuition discount",
  employer_assistance: "Employer assistance", paid_placement: "Paid placement", loan_repayment: "Loan repayment",
};
export function formatFunding(amountMin: number, amountMax: number | null, value?: unknown): string {
  const funding = parseFunding(value);
  if (funding?.amountType === "percentage") return `${funding.percentage}% tuition discount`;
  if (funding?.amountType === "varies") return "Amount varies";
  const dollars = (n: number) => `$${n.toLocaleString("en-US")}`;
  if (amountMax && amountMax > amountMin) return amountMin === 0 ? `Up to ${dollars(amountMax)}` : `${dollars(amountMin)} - ${dollars(amountMax)}`;
  return amountMin > 0 ? dollars(amountMin) : "Amount not confirmed";
}
