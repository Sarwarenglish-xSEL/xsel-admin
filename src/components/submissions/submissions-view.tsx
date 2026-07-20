"use client";

import type { AssignmentSubmission, QuizAttempt } from "@/types/database";
import { PageEmpty } from "@/components/page-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { QuizAttemptsTable } from "@/components/submissions/quiz-attempts-table";
import { SubmissionsTable } from "@/components/submissions/submissions-table";

export function SubmissionsView({
  submissions,
  quizAttempts,
}: {
  submissions: AssignmentSubmission[];
  quizAttempts: QuizAttempt[];
}) {
  if (submissions.length === 0 && quizAttempts.length === 0) {
    return (
      <PageEmpty
        title="No submissions"
        description="Student assignment submissions and quiz attempts will appear here."
      />
    );
  }

  return (
    <Card className="overflow-hidden border-brand/10 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">
              Assignments ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              Quizzes ({quizAttempts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-5">
            {submissions.length === 0 ? (
              <PageEmpty
                title="No assignment submissions"
                description="Student assignment submissions will appear here."
              />
            ) : (
              <SubmissionsTable submissions={submissions} />
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-5">
            {quizAttempts.length === 0 ? (
              <PageEmpty
                title="No quiz attempts"
                description="Student quiz attempts will appear here."
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
