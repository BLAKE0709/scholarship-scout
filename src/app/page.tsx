import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-page">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary-navy">
          Scholarship Scout
        </h1>
        <p className="text-lg text-text-secondary max-w-md">
          AI-powered scholarship matching and application platform
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
