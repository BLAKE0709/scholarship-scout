"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BasicsInput } from "@/lib/validators/onboarding";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
interface StepBasicsProps { data: Partial<BasicsInput>; onChange: (data: Partial<BasicsInput>) => void; }
export function StepBasics({ data, onChange }: StepBasicsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-text-primary">The Basics</h2>
        <p className="text-text-secondary">Start with the details every scholarship search needs.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={data.fullName ?? ""} onChange={(event) => onChange({ ...data, fullName: event.target.value })} placeholder="Jane Smith" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>State</Label>
            <Select value={data.state ?? ""} onValueChange={(state) => onChange({ ...data, state })}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{US_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City <span className="text-text-secondary">(optional)</span></Label>
            <Input id="city" value={data.city ?? ""} onChange={(event) => onChange({ ...data, city: event.target.value || null })} placeholder="Dallas" />
          </div>
        </div>
      </div>
    </div>
  );
}
