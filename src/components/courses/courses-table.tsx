"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Archive, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Course } from "@/types/database";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { archiveCourseAction, deleteCourseAction } from "@/app/actions";

function CourseActions({ course }: { course: Course }) {
  const router = useRouter();

  return (
    <DropdownMenu
      trigger={
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      }
    >
      <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}/edit`)}>
        <Pencil className="h-4 w-4" /> Edit
      </DropdownMenuItem>
      {course.status !== "archived" && (
        <DropdownMenuItem
          className="text-red-600 hover:bg-red-50"
          onClick={async () => {
            try {
              await archiveCourseAction(course.id);
              toast.success("Course archived");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          <Archive className="h-4 w-4" /> Archive
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        className="text-red-600 hover:bg-red-50"
        onClick={async () => {
          if (
            !confirm(
              `Delete "${course.title}" permanently? This removes all chapters, lessons, enrollments, and related data.`
            )
          ) {
            return;
          }
          try {
            await deleteCourseAction(course.id);
            toast.success("Course deleted");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete course");
          }
        }}
      >
        <Trash2 className="h-4 w-4" /> Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

const columns: ColumnDef<Course>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <Link
        href={`/courses/${row.original.id}/edit`}
        className="font-medium text-brand hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "course_type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{row.original.course_type}</Badge>,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="capitalize">{row.original.category}</span>,
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => `$${Number(row.original.price).toFixed(2)}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "published" ? "default" : "outline"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "course_start_date",
    header: "Start Date",
    cell: ({ row }) =>
      row.original.course_start_date
        ? format(new Date(row.original.course_start_date), "MMM d, yyyy")
        : "—",
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
  {
    id: "actions",
    cell: ({ row }) => <CourseActions course={row.original} />,
  },
];

export function CoursesTable({ courses }: { courses: Course[] }) {
  return (
    <DataTable columns={columns} data={courses} searchKey="title" searchPlaceholder="Search courses..." />
  );
}
