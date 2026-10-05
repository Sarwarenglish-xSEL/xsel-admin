import { getCertificates, getEligibleCertificateEnrollments } from "@/lib/db/certificates";
import { getProfileOptions } from "@/lib/db/profiles";
import { getCourses } from "@/lib/db/courses";
import { parsePageParam } from "@/lib/db/pagination";
import { CertificatesTable } from "@/components/certificates/certificates-table";
import { ListPagination } from "@/components/list-pagination";
import { PageHeader } from "@/components/layout/page-header";

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  let certificatesResult;
  let eligible;
  let users;
  let courses;
  let error: string | null = null;

  try {
    [certificatesResult, eligible, users, courses] = await Promise.all([
      getCertificates({ page }),
      getEligibleCertificateEnrollments(),
      getProfileOptions(),
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
        certificates={certificatesResult!.data}
        eligible={eligible!}
        users={users!}
        courses={courses!}
      />
      <ListPagination
        page={certificatesResult!.page}
        totalPages={certificatesResult!.totalPages}
        total={certificatesResult!.total}
        pageSize={certificatesResult!.pageSize}
      />
    </div>
  );
}
