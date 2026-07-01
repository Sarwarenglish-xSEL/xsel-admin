import { cn } from "@/lib/utils";
import { BackLink } from "@/components/layout/back-link";

function ThemedHeaderContent({
  title,
  description,
  actions,
  titleClassName,
  descriptionClassName,
  accentClassName,
  headingAs: Heading = "h2",
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  titleClassName: string;
  descriptionClassName: string;
  accentClassName: string;
  headingAs?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className={accentClassName} />
        <div className="min-w-0">
          <Heading className={titleClassName}>{title}</Heading>
          {description && <p className={descriptionClassName}>{description}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0 sm:ml-4">{actions}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  className,
  backHref,
  actions,
}: {
  title: string;
  description?: string;
  className?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      {backHref && (
        <BackLink
          href={backHref}
          className="mt-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
        />
      )}
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border border-brand/15 brand-gradient px-6 py-5 shadow-sm",
          actions && "sm:pr-4"
        )}
      >
        <ThemedHeaderContent
          title={title}
          description={description}
          actions={actions}
          headingAs="h1"
          titleClassName="text-2xl font-bold tracking-tight text-brand-dark"
          descriptionClassName="mt-1 text-sm text-brand/80"
          accentClassName="mt-1.5 h-9 w-1 shrink-0 rounded-full brand-accent-bar"
        />
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  className,
  actions,
}: {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-b border-brand/10 brand-gradient px-5 py-4",
        className
      )}
    >
      <ThemedHeaderContent
        title={title}
        description={description}
        actions={actions}
        headingAs="h3"
        titleClassName="text-base font-semibold tracking-tight text-brand-dark"
        descriptionClassName="mt-0.5 text-xs text-brand/80"
        accentClassName="mt-1 h-7 w-1 shrink-0 rounded-full brand-accent-bar"
      />
    </div>
  );
}
