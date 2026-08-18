import { Activity, MonitorOff, Signal, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type SessionStatsProps = {
  total: number;
  online: number;
  offline: number;
  activeLast24h: number;
};

const cards = [
  {
    key: "online" as const,
    label: "Online now",
    icon: Signal,
    tone: "bg-success/15 text-success",
  },
  {
    key: "offline" as const,
    label: "Offline",
    icon: MonitorOff,
    tone: "bg-gray-100 text-gray-500",
  },
  {
    key: "activeLast24h" as const,
    label: "Active last 24h",
    icon: Activity,
    tone: "bg-accent/25 text-accent-dark",
  },
  {
    key: "total" as const,
    label: "Tracked users",
    icon: Users,
    tone: "bg-brand/20 text-brand",
  },
];

export function SessionStats(stats: SessionStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key} className="overflow-hidden border-brand/20 shadow-sm">
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-brand-dark">
                {stats[card.key]}
              </p>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
