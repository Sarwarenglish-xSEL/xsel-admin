"use client";

import { usePathname, useRouter } from "next/navigation";
import type { AssignmentSubmission, QuizAttempt } from "@/types/database";
import { PageEmpty } from "@/components/page-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { QuizAttemptsTable } from "@/components/submissions/quiz-attempts-table";
import { SubmissionsTable } from "@/components/submissions/submissions-table";

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

  function setTab(next: string) {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (next === "quizzes") params.set("tab", "quizzes");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
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
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="assignments">
              Assignments ({assignmentTotal})
            </TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes ({quizTotal})</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-5">
            {submissions.length === 0 ? (
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
            {quizAttempts.length === 0 ? (
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
