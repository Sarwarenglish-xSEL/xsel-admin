"use client";

import type { AssignmentSubmission, QuizAttempt } from "@/types/database";
import { PageEmpty } from "@/components/page-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <Tabs defaultValue="assignments">
      <TabsList>
        <TabsTrigger value="assignments">
          Assignments ({submissions.length})
        </TabsTrigger>
        <TabsTrigger value="quizzes">Quizzes ({quizAttempts.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="assignments">
        {submissions.length === 0 ? (
          <PageEmpty
            title="No assignment submissions"
            description="Student assignment submissions will appear here."
          />
        ) : (
          <SubmissionsTable submissions={submissions} />
        )}
      </TabsContent>

      <TabsContent value="quizzes">
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
  );
}
