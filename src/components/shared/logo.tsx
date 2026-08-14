interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className = "" }: LogoProps) {
  if (compact) {
    return (
      <span className={`text-xl font-bold text-primary-navy ${className}`}>
        SS
      </span>
    );
  }

  return (
    <span className={`text-xl font-bold text-primary-navy ${className}`}>
      Scholarship Scout
    </span>
  );
}
