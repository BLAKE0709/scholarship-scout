import { db } from "./index";
import {
  plans,
  scholarships,
  scholarshipProviders,
  users,
  studentProfiles,
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Plans
  const [freePlan, proPlan, familyPlan] = await db
    .insert(plans)
    .values([
      {
        name: "Free",
        slug: "free",
        priceMonthly: 0,
        priceYearly: 0,
        userType: "student",
        features: {
          matches_per_month: 10,
          essay_reviews: 2,
          basic_ai: true,
          fidelity_score: false,
          aps_score: false,
        },
        matchLimitMonthly: 10,
        essayLimitMonthly: 2,
      },
      {
        name: "Pro",
        slug: "pro",
        priceMonthly: 999,
        priceYearly: 9990,
        userType: "student",
        features: {
          matches_per_month: null,
          essay_reviews: null,
          basic_ai: true,
          advanced_ai: true,
          fidelity_score: true,
          aps_score: true,
          priority_support: true,
        },
        matchLimitMonthly: null,
        essayLimitMonthly: null,
      },
      {
        name: "Family",
        slug: "family",
        priceMonthly: 1499,
        priceYearly: 14990,
        userType: "parent",
        features: {
          linked_students: 5,
          matches_per_month: null,
          essay_reviews: null,
          basic_ai: true,
          advanced_ai: true,
          fidelity_score: true,
          aps_score: true,
          parent_dashboard: true,
          priority_support: true,
        },
        matchLimitMonthly: null,
        essayLimitMonthly: null,
      },
    ])
    .returning();

  console.log(`Created ${[freePlan, proPlan, familyPlan].length} plans`);

  // Scholarship Providers
  const [provider1, provider2, provider3] = await db
    .insert(scholarshipProviders)
    .values([
      {
        name: "Gates Millennium Scholars Program",
        type: "foundation",
        description:
          "The Gates Millennium Scholars program provides outstanding minority students with financial support.",
        website: "https://www.gmsp.org",
      },
      {
        name: "Coca-Cola Scholars Foundation",
        type: "corporate",
        description:
          "The Coca-Cola Scholars Foundation celebrates and empowers visionary leaders who are refreshing the world.",
        website: "https://www.coca-colascholarsfoundation.org",
      },
      {
        name: "National Merit Scholarship Corporation",
        type: "foundation",
        description:
          "Recognizes and honors academically talented students of the United States.",
        website: "https://www.nationalmerit.org",
      },
    ])
    .returning();

  // Scholarships
  const createdScholarships = await db
    .insert(scholarships)
    .values([
      {
        name: "Gates Millennium Scholarship",
        providerId: provider1.id,
        description:
          "Full scholarship covering tuition, fees, room, board, and books for minority students with significant financial need pursuing STEM or education degrees.",
        amountMin: 25000,
        amountMax: 75000,
        deadline: new Date("2026-09-15"),
        requirements: {
          min_gpa: 3.3,
          pell_grant_eligible: true,
          essay_required: true,
          recommendation_letters: 3,
        },
        eligibility: {
          citizenship: "US",
          min_gpa: 3.3,
          financial_need: "high",
          ethnicities: [
            "African American",
            "Hispanic",
            "Asian Pacific Islander",
            "American Indian",
          ],
        },
        status: "active",
        renewable: true,
        national: true,
        tags: ["STEM", "minority", "full-ride", "need-based"],
      },
      {
        name: "Coca-Cola Scholars Award",
        providerId: provider2.id,
        description:
          "Awarded to 150 high school seniors each year based on leadership, community service, and academic achievement.",
        amountMin: 20000,
        amountMax: 20000,
        deadline: new Date("2026-10-31"),
        requirements: {
          min_gpa: 3.0,
          essay_required: true,
          community_service: true,
        },
        eligibility: {
          citizenship: "US",
          min_gpa: 3.0,
          grade_level: "senior",
        },
        status: "active",
        renewable: false,
        national: true,
        tags: ["leadership", "community-service", "merit"],
      },
      {
        name: "National Merit Scholarship",
        providerId: provider3.id,
        description:
          "Based on PSAT/NMSQT scores. Approximately 7,500 finalists receive scholarships annually.",
        amountMin: 2500,
        amountMax: 2500,
        deadline: new Date("2026-03-01"),
        requirements: {
          psat_qualifying: true,
          essay_required: true,
        },
        eligibility: {
          citizenship: "US",
          psat_required: true,
          grade_level: "senior",
        },
        status: "active",
        renewable: false,
        national: true,
        tags: ["merit", "academic", "PSAT"],
      },
      {
        name: "Texas Tomorrow Fund Scholarship",
        providerId: null,
        description:
          "Scholarships for Texas residents pursuing higher education at Texas public universities.",
        amountMin: 5000,
        amountMax: 15000,
        deadline: new Date("2026-06-01"),
        requirements: {
          texas_resident: true,
          min_gpa: 2.5,
          essay_required: true,
        },
        eligibility: {
          states: ["TX"],
          min_gpa: 2.5,
        },
        status: "active",
        renewable: true,
        national: false,
        states: ["TX"],
        tags: ["state", "Texas", "need-based"],
      },
      {
        name: "Women in STEM Excellence Award",
        providerId: null,
        description:
          "Supporting young women pursuing degrees in Science, Technology, Engineering, and Mathematics.",
        amountMin: 10000,
        amountMax: 10000,
        deadline: new Date("2026-08-15"),
        requirements: {
          min_gpa: 3.5,
          stem_major: true,
          essay_required: true,
          recommendation_letters: 2,
        },
        eligibility: {
          gender: "female",
          min_gpa: 3.5,
          intended_major_category: "STEM",
        },
        status: "active",
        renewable: false,
        national: true,
        tags: ["women", "STEM", "merit", "diversity"],
      },
    ])
    .returning();

  console.log(`Created ${createdScholarships.length} scholarships`);

  // Test user
  const [testUser] = await db
    .insert(users)
    .values({
      email: "test@scholarshipscout.dev",
      fullName: "Test Student",
      role: "student",
      onboardingCompleted: true,
    })
    .returning();

  await db.insert(studentProfiles).values({
    userId: testUser.id,
    gpa: "3.8",
    gpaScale: "4.0",
    satScore: 1350,
    graduationYear: 2027,
    state: "TX",
    city: "Dallas",
    schoolName: "Highland Park High School",
    gradeLevel: "junior",
    intendedMajor: "Computer Science",
    interests: ["Computer Science", "Robotics", "Mathematics"],
    extracurriculars: ["Debate Team", "Coding Club", "Robotics Club"],
    firstGeneration: false,
    financialNeed: "medium",
    vaultHealthScore: 72,
  });

  console.log("Created test user: test@scholarshipscout.dev");
  console.log("Seed complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
