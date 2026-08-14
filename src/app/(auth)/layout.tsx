export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary-navy">
            Scholarship Scout
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your path to scholarship success
          </p>
        </div>
        <div className="rounded-xl bg-surface p-8 shadow-lg">{children}</div>
      </div>
    </div>
  );
}
