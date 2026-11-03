"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AssignmentSubmission, QuizAttempt } from "@/types/database";
import { PageEmpty } from "@/components/page-states";
import { BrandSpinner } from "@/components/layout/navigation-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { QuizAttemptsTable } from "@/components/submissions/quiz-attempts-table";
import { SubmissionsTable } from "@/components/submissions/submissions-table";

function TabLoader({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[16rem] flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <BrandSpinner size={40} />
      <p className="text-sm font-medium text-brand/70">{label}</p>
    </div>
  );
}

export function SubmissionsView({
  submissions,
  quizAttempts,
  assignmentTotal,
  quizTotal,
  activeTab,
  searchQuery,
}: {
  submissions: AssignmentSubmission[];
  quizAttempts: QuizAttempt[];
  assignmentTotal: number;
  quizTotal: number;
  activeTab: "assignments" | "quizzes";
  searchQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayTab, setDisplayTab] = useState(activeTab);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDisplayTab(activeTab);
  }, [activeTab]);

  const showLoader = isPending || displayTab !== activeTab;

  function setTab(next: string) {
    if (next !== "assignments" && next !== "quizzes") return;
    if (next === displayTab && !showLoader) return;

    setDisplayTab(next);
    startTransition(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (next === "quizzes") params.set("tab", "quizzes");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  if (assignmentTotal === 0 && quizTotal === 0) {
    return (
      <PageEmpty
        title={searchQuery ? "No submissions found" : "No submissions"}
        description={
          searchQuery
            ? "Try a different search term."
            : "Student assignment submissions and quiz attempts will appear here."
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <Tabs value={displayTab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="assignments">
              Assignments ({assignmentTotal})
            </TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes ({quizTotal})</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-5">
            {showLoader ? (
              <TabLoader label="Loading assignments..." />
            ) : submissions.length === 0 ? (
              <PageEmpty
                title={
                  searchQuery
                    ? "No assignment submissions found"
                    : "No assignment submissions"
                }
                description={
                  searchQuery
                    ? "Try a different search term."
                    : "Student assignment submissions will appear here."
                }
              />
            ) : (
              <SubmissionsTable submissions={submissions} />
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-5">
            {showLoader ? (
              <TabLoader label="Loading quizzes..." />
            ) : quizAttempts.length === 0 ? (
              <PageEmpty
                title={
                  searchQuery ? "No quiz attempts found" : "No quiz attempts"
                }
                description={
                  searchQuery
                    ? "Try a different search term."
                    : "Student quiz attempts will appear here."
                }
              />
            ) : (
              <QuizAttemptsTable attempts={quizAttempts} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
