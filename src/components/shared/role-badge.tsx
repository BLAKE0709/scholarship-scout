import { Badge } from "@/components/ui/badge";

const roleConfig = {
  student: {
    label: "Student",
    className: "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
  },
  parent: {
    label: "Parent",
    className: "bg-primary-navy/10 text-primary-navy border-primary-navy/20",
  },
  counselor: {
    label: "Counselor",
    className:
      "bg-highlight-gold/10 text-highlight-gold border-highlight-gold/20",
  },
  institution_admin: {
    label: "Admin",
    className:
      "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
  },
  provider: {
    label: "Provider",
    className:
      "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
  },
  superadmin: {
    label: "Super Admin",
    className:
      "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
  },
} as const;

interface RoleBadgeProps {
  role: keyof typeof roleConfig;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] ?? roleConfig.student;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
