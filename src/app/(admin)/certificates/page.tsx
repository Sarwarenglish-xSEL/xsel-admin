import { getCertificates } from "@/lib/db/certificates";
import { getProfiles } from "@/lib/db/profiles";
import { getCourses } from "@/lib/db/courses";
import { CertificatesTable } from "@/components/certificates/certificates-table";
import { PageHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";

export default async function CertificatesPage() {
  let certificates;
  let users;
  let courses;
  let error: string | null = null;

  try {
    [certificates, users, courses] = await Promise.all([
      getCertificates(),
      getProfiles(),
      getCourses(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load certificates";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Certificates"
          description="Issue and manage course completion certificates"
        />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="Issue and manage course completion certificates"
      />
      <CertificatesTable
        certificates={certificates!}
        users={users!}
        courses={courses!}
      />
      {certificates!.length === 0 && (
        <PageEmpty
          title="No certificates issued"
          description="Issue a certificate using the button above."
        />
      )}
    </div>
  );
}
