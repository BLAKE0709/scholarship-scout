"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  PenTool,
  Trophy,
  FileText,
  BarChart3,
  ClipboardList,
  Download,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  GraduationCap,
  Dumbbell,
  Heart,
  Crown,
  Palette,
  Briefcase,
  Award,
  BadgeCheck,
  MoreHorizontal,
  ChevronDown,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";
import { AchievementForm } from "@/components/vault/achievement-form";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: string;
  gpa: string | null;
  gpa_scale: string | null;
  sat_score: number | null;
  act_score: number | null;
  graduation_year: number;
  state: string;
  city: string | null;
  school_name: string | null;
  grade_level: string | null;
  intended_major: string | null;
  interests: string[];
  extracurriculars: string[];
  vault_health_score: number;
}

interface Essay {
  id: string;
  title: string;
  wordCount: number;
  fidelityScore: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string | null;
  organization: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  verified: boolean;
}

interface Document {
  id: string;
  type: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
}

interface FidelityScore {
  id: string;
  score: number;
  createdAt: string;
}

interface ApsScore {
  id: string;
  score: number;
  promptSophistication: number;
  criticalEvaluation: number;
  creativeIntegration: number;
  iterativeRefinement: number;
  ethicalAwareness: number;
  assessmentDate: string;
}

interface Application {
  id: string;
  scholarshipName: string;
  status: string;
  amountMin: number;
  amountMax: number | null;
  submittedAt: string | null;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACHIEVEMENT_TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  academic: GraduationCap,
  athletic: Dumbbell,
  community_service: Heart,
  leadership: Crown,
  arts: Palette,
  work_experience: Briefcase,
  award: Award,
  certification: BadgeCheck,
  other: Star,
};

const ACHIEVEMENT_TYPE_LABELS: Record<string, string> = {
  academic: "Academic",
  athletic: "Athletic",
  community_service: "Community Service",
  leadership: "Leadership",
  arts: "Arts",
  work_experience: "Work Experience",
  award: "Award",
  certification: "Certification",
  other: "Other",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  transcript: "Transcript",
  recommendation_letter: "Recommendation",
  certificate: "Certificate",
  financial_aid: "Financial Aid",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-text-secondary/10 text-text-secondary",
  in_progress: "bg-accent-teal/10 text-accent-teal",
  review: "bg-highlight-gold/10 text-highlight-gold",
  final: "bg-green-100 text-green-700",
  submitted: "bg-accent-teal/10 text-accent-teal",
  under_review: "bg-highlight-gold/10 text-highlight-gold",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-error/10 text-error",
  withdrawn: "bg-text-secondary/10 text-text-secondary",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getApsLevel(score: number): string {
  if (score >= 90) return "Expert";
  if (score >= 75) return "Advanced";
  if (score >= 60) return "Proficient";
  if (score >= 40) return "Developing";
  return "Beginner";
}

// ── Vault Page ─────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const router = useRouter();
  const { user, profile: userProfile, isLoading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null,
  );
  const [essays, setEssays] = useState<Essay[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fidelityScores, setFidelityScores] = useState<FidelityScore[]>([]);
  const [apsScores, setApsScores] = useState<ApsScore[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  const [editingAchievement, setEditingAchievement] =
    useState<Achievement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch vault data
  const fetchVaultData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [
        profileRes,
        essaysRes,
        achievementsRes,
        documentsRes,
        applicationsRes,
      ] = await Promise.all([
        fetch("/api/vault/export?format=json"),
        fetch("/api/essays"),
        fetch("/api/vault/achievements"),
        fetch("/api/vault/documents"),
        fetch("/api/applications?limit=100"),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.profile) setStudentProfile(profileData.profile);
        if (profileData.fidelityScores)
          setFidelityScores(profileData.fidelityScores);
        if (profileData.apsScores) setApsScores(profileData.apsScores);
      }

      if (essaysRes.ok) {
        const essayData = await essaysRes.json();
        setEssays(essayData.data ?? []);
      }

      if (achievementsRes.ok) {
        const achData = await achievementsRes.json();
        setAchievements(achData.data ?? []);
      }

      if (documentsRes.ok) {
        const docData = await documentsRes.json();
        setDocuments(docData.data ?? []);
      }

      if (applicationsRes.ok) {
        const appData = await applicationsRes.json();
        setApplications(appData.data ?? []);
      }
    } catch {
      toast.error("Failed to load vault data");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportRef.current &&
        !exportRef.current.contains(event.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuOpen]);

  // Achievement handlers
  function handleAchievementSaved() {
    setShowAchievementForm(false);
    setEditingAchievement(null);
    fetchVaultData();
    toast.success("Achievement saved");
  }

  async function handleDeleteAchievement(id: string) {
    try {
      const response = await fetch(`/api/vault/achievements/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");

      setAchievements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Achievement deleted");
    } catch {
      toast.error("Failed to delete achievement");
    }
  }

  // Document handlers
  async function handleUploadDocument(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("type", "other");

      const response = await fetch("/api/vault/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      setDocuments((prev) => [result.data, ...prev]);
      toast.success("Document uploaded");
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteDocument(id: string) {
    try {
      const response = await fetch(`/api/vault/documents?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");

      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  }

  // Export handlers
  async function handleExportJSON() {
    setExportMenuOpen(false);
    try {
      const response = await fetch("/api/vault/export?format=json");
      if (!response.ok) throw new Error("Export failed");

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `scholarship-vault-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Vault exported as JSON");
    } catch {
      toast.error("Failed to export vault");
    }
  }

  async function handleExportText() {
    setExportMenuOpen(false);
    try {
      const response = await fetch("/api/vault/export?format=text");
      if (!response.ok) throw new Error("Export failed");

      const text = await response.text();
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `scholarship-vault-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Vault exported as text");
    } catch {
      toast.error("Failed to export vault");
    }
  }

  if (userLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  // Compute stats for applications tab
  const totalApplied = applications.reduce(
    (sum, a) => sum + (a.amountMin ?? 0),
    0,
  );
  const totalWon = applications
    .filter((a) => a.status === "accepted")
    .reduce((sum, a) => sum + (a.amountMin ?? 0), 0);

  const latestFidelity = fidelityScores.length > 0 ? fidelityScores[0] : null;
  const latestAps = apsScores.length > 0 ? apsScores[0] : null;

  // Fidelity chart data
  const fidelityChartData = [...fidelityScores].reverse().map((fs) => ({
    date: new Date(fs.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: fs.score,
  }));

  // APS radar data
  const apsRadarData = latestAps
    ? [
        { dimension: "Prompt", value: latestAps.promptSophistication },
        { dimension: "Critical", value: latestAps.criticalEvaluation },
        { dimension: "Creative", value: latestAps.creativeIntegration },
        { dimension: "Iterative", value: latestAps.iterativeRefinement },
        { dimension: "Ethical", value: latestAps.ethicalAwareness },
      ]
    : [];

  // Group achievements by type
  const achievementsByType: Record<string, Achievement[]> = {};
  for (const ach of achievements) {
    if (!achievementsByType[ach.type]) achievementsByType[ach.type] = [];
    achievementsByType[ach.type].push(ach);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">My Vault</h2>
          <p className="text-sm text-text-secondary">
            Your complete academic identity -- everything that makes you, you.
          </p>
        </div>
        <div className="relative" ref={exportRef}>
          <Button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="bg-highlight-gold text-primary-navy hover:bg-highlight-gold/90 font-semibold"
          >
            <Download className="mr-2 h-4 w-4" />
            Export My Vault
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border-light bg-surface shadow-lg">
              <button
                onClick={handleExportJSON}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-page"
              >
                Export as JSON
              </button>
              <Separator />
              <button
                onClick={handleExportText}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-page"
              >
                Export as Text
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="essays" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">Essays</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="scores" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Scores</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Applications</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Student Profile</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/settings")}
                >
                  Edit Profile
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {studentProfile ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoItem
                      label="Name"
                      value={userProfile?.fullName ?? "--"}
                    />
                    <InfoItem
                      label="School"
                      value={studentProfile.school_name ?? "--"}
                    />
                    <InfoItem
                      label="Grade Level"
                      value={
                        studentProfile.grade_level
                          ?.replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase()) ?? "--"
                      }
                    />
                    <InfoItem
                      label="GPA"
                      value={
                        studentProfile.gpa
                          ? `${studentProfile.gpa} / ${studentProfile.gpa_scale ?? "4.0"}`
                          : "--"
                      }
                    />
                    <InfoItem
                      label="SAT Score"
                      value={
                        studentProfile.sat_score?.toString() ?? "Not reported"
                      }
                    />
                    <InfoItem
                      label="ACT Score"
                      value={
                        studentProfile.act_score?.toString() ?? "Not reported"
                      }
                    />
                    <InfoItem
                      label="Graduation Year"
                      value={studentProfile.graduation_year.toString()}
                    />
                    <InfoItem label="State" value={studentProfile.state} />
                    <InfoItem
                      label="Intended Major"
                      value={studentProfile.intended_major ?? "--"}
                    />
                  </div>

                  {studentProfile.interests.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-text-secondary">
                        Interests
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {studentProfile.interests.map((interest) => (
                          <Badge
                            key={interest}
                            variant="secondary"
                            className="bg-accent-teal/10 text-accent-teal"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {studentProfile.extracurriculars.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-text-secondary">
                        Extracurriculars
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {studentProfile.extracurriculars.map((ec) => (
                          <Badge
                            key={ec}
                            variant="secondary"
                            className="bg-highlight-gold/10 text-highlight-gold"
                          >
                            {ec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <User className="mb-3 h-10 w-10 text-text-secondary/30" />
                  <p className="text-sm text-text-secondary">
                    Complete your profile to get started
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push("/settings")}
                  >
                    Set Up Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Essays Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="essays" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className="bg-accent-teal/10 text-accent-teal"
            >
              {essays.length} essay{essays.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {essays.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex flex-col items-center py-12">
                <PenTool className="mb-3 h-10 w-10 text-text-secondary/30" />
                <p className="text-lg font-medium text-text-primary">
                  No essays yet
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Start writing to build your essay portfolio
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.push("/essays")}
                >
                  Go to Essay Workspace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {essays.map((essay) => (
                <Card
                  key={essay.id}
                  className="cursor-pointer rounded-xl transition-colors hover:bg-bg-page"
                  onClick={() => router.push("/essays")}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-teal/10">
                      <PenTool className="h-5 w-5 text-accent-teal" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary">
                        {essay.title}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                        <span>{essay.wordCount} words</span>
                        <span>Updated {formatDate(essay.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {essay.fidelityScore !== null && (
                        <Badge
                          variant="secondary"
                          className="bg-highlight-gold/10 text-highlight-gold font-mono"
                        >
                          FS: {essay.fidelityScore}
                        </Badge>
                      )}
                      <Badge
                        className={
                          STATUS_COLORS[essay.status] ?? STATUS_COLORS.draft
                        }
                      >
                        {essay.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Achievements Tab ─────────────────────────────────────────────── */}
        <TabsContent value="achievements" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className="bg-highlight-gold/10 text-highlight-gold"
            >
              {achievements.length} achievement
              {achievements.length !== 1 ? "s" : ""}
            </Badge>
            <Button
              size="sm"
              onClick={() => {
                setEditingAchievement(null);
                setShowAchievementForm(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Achievement
            </Button>
          </div>

          {achievements.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex flex-col items-center py-12">
                <Trophy className="mb-3 h-10 w-10 text-text-secondary/30" />
                <p className="text-lg font-medium text-text-primary">
                  No achievements yet
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Add your accomplishments to strengthen your applications
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setEditingAchievement(null);
                    setShowAchievementForm(true);
                  }}
                >
                  Add Your First Achievement
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(achievementsByType).map(([type, items]) => {
              const Icon = ACHIEVEMENT_TYPE_ICONS[type] ?? Star;
              const label = ACHIEVEMENT_TYPE_LABELS[type] ?? type;

              return (
                <div key={type}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-highlight-gold" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      {label}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((ach) => (
                      <Card key={ach.id} className="rounded-xl">
                        <CardContent className="flex items-start gap-4 py-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">
                                {ach.title}
                              </p>
                              {ach.verified && (
                                <BadgeCheck className="h-4 w-4 text-accent-teal" />
                              )}
                            </div>
                            {ach.description && (
                              <p className="mt-1 text-sm text-text-secondary">
                                {ach.description}
                              </p>
                            )}
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-text-secondary">
                              {ach.organization && (
                                <span>{ach.organization}</span>
                              )}
                              {ach.dateStart && (
                                <span>
                                  {formatDate(ach.dateStart)}
                                  {ach.dateEnd
                                    ? ` - ${formatDate(ach.dateEnd)}`
                                    : " - Present"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-text-secondary hover:text-text-primary"
                              onClick={() => {
                                setEditingAchievement(ach);
                                setShowAchievementForm(true);
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-text-secondary hover:text-error"
                              onClick={() => handleDeleteAchievement(ach.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {showAchievementForm && studentProfile && (
            <AchievementForm
              studentId={studentProfile.id}
              achievement={editingAchievement ?? undefined}
              onSave={handleAchievementSaved}
              onCancel={() => {
                setShowAchievementForm(false);
                setEditingAchievement(null);
              }}
            />
          )}
        </TabsContent>

        {/* ── Documents Tab ────────────────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className="bg-primary-navy/10 text-primary-navy"
            >
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </Badge>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUploadDocument}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
              <Button
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </div>

          {documents.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex flex-col items-center py-12">
                <FileText className="mb-3 h-10 w-10 text-text-secondary/30" />
                <p className="text-lg font-medium text-text-primary">
                  No documents uploaded
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Upload transcripts, recommendation letters, and certificates
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Your First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Card key={doc.id} className="rounded-xl">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-navy/10">
                      <FileText className="h-5 w-5 text-primary-navy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary truncate">
                        {doc.name}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                        <Badge variant="secondary" className="text-xs">
                          {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                        </Badge>
                        {doc.fileSize && (
                          <span>{formatFileSize(doc.fileSize)}</span>
                        )}
                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-secondary hover:text-accent-teal"
                        asChild
                      >
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-secondary hover:text-error"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Scores Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="scores" className="mt-6 space-y-6">
          {/* Fidelity Score */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Fidelity Score</CardTitle>
            </CardHeader>
            <CardContent>
              {latestFidelity ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-4xl font-bold text-primary-navy">
                      {latestFidelity.score}
                    </div>
                    <div className="text-sm text-text-secondary">
                      <p>Current Score</p>
                      <p className="text-xs">
                        Updated {formatDate(latestFidelity.createdAt)}
                      </p>
                    </div>
                  </div>
                  {fidelityChartData.length > 1 && (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fidelityChartData}>
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            stroke="#94a3b8"
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 12 }}
                            stroke="#94a3b8"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            dot={{ fill: "#14b8a6", r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <p className="font-mono text-4xl font-bold text-text-secondary/30">
                    --
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Complete an essay to receive your Fidelity Score
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* APS Score */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">
                AI Proficiency Score (APS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestAps ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-4xl font-bold text-primary-navy">
                      {latestAps.score}
                    </div>
                    <div className="text-sm text-text-secondary">
                      <p className="font-medium text-highlight-gold">
                        {getApsLevel(latestAps.score)}
                      </p>
                      <p className="text-xs">
                        Assessed {formatDate(latestAps.assessmentDate)}
                      </p>
                    </div>
                  </div>
                  {apsRadarData.length > 0 && (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="70%"
                          data={apsRadarData}
                        >
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fontSize: 12, fill: "#64748b" }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            stroke="#94a3b8"
                          />
                          <Radar
                            name="APS"
                            dataKey="value"
                            stroke="#14b8a6"
                            fill="#14b8a6"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <p className="font-mono text-4xl font-bold text-text-secondary/30">
                    --
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Use the AI tools to build your AI Proficiency Score
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Applications Tab ─────────────────────────────────────────────── */}
        <TabsContent value="applications" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="rounded-xl">
              <CardContent className="py-4">
                <p className="text-sm text-text-secondary">Total Applied</p>
                <p className="font-mono text-2xl font-bold text-primary-navy">
                  ${totalApplied.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="py-4">
                <p className="text-sm text-text-secondary">Total Won</p>
                <p className="font-mono text-2xl font-bold text-accent-teal">
                  ${totalWon.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {applications.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex flex-col items-center py-12">
                <ClipboardList className="mb-3 h-10 w-10 text-text-secondary/30" />
                <p className="text-lg font-medium text-text-primary">
                  No applications yet
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Start applying to scholarships to track your progress
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.push("/scholarships")}
                >
                  Discover Scholarships
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-bg-page">
                      <th className="px-4 py-3 text-left font-medium text-text-secondary">
                        Scholarship
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-border-light last:border-0 hover:bg-bg-page cursor-pointer"
                        onClick={() => router.push("/applications")}
                      >
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {app.scholarshipName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              STATUS_COLORS[app.status] ?? STATUS_COLORS.draft
                            }
                          >
                            {app.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-text-primary">
                          ${app.amountMin.toLocaleString()}
                          {app.amountMax && app.amountMax > app.amountMin
                            ? ` - $${app.amountMax.toLocaleString()}`
                            : ""}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatDate(app.submittedAt ?? app.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {applications.length > 0 && (
                <div className="border-t border-border-light px-4 py-3">
                  <button
                    onClick={() => router.push("/applications")}
                    className="flex items-center gap-1 text-xs font-medium text-accent-teal hover:underline"
                  >
                    View all applications
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
