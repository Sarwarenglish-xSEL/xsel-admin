import { Activity, Clock, Signal, Users, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type SessionStatsProps = {
  total: number;
  online: number;
  recent: number;
  offline: number;
  activeLast24h: number;
};

const cards: {
  key: keyof SessionStatsProps;
  label: string;
  hint?: string;
  icon: typeof Signal;
  tone: string;
  cardBg: string;
}[] = [
  {
    key: "online",
    label: "Online now",
    hint: "Active in last 5 min",
    icon: Signal,
    tone: "bg-success/15 text-success",
    cardBg: "border-success/25 bg-gradient-to-br from-success/12 via-surface to-success/5",
  },
  {
    key: "recent",
    label: "Recently active",
    hint: "Seen recently, app idle",
    icon: Clock,
    tone: "bg-accent/25 text-accent-dark",
    cardBg: "border-accent/30 bg-gradient-to-br from-accent/15 via-surface to-accent/5",
  },
  {
    key: "offline",
    label: "Offline",
    hint: "No heartbeat in 5 min",
    icon: WifiOff,
    tone: "bg-gray-100 text-gray-600",
    cardBg: "border-brand/15 bg-gradient-to-br from-gray-100/80 via-surface to-brand/[0.03]",
  },
  {
    key: "activeLast24h",
    label: "Active last 24h",
    icon: Activity,
    tone: "bg-brand/20 text-brand",
    cardBg: "border-brand/25 bg-gradient-to-br from-brand/15 via-surface to-brand/5",
  },
  {
    key: "total",
    label: "Tracked devices",
    icon: Users,
    tone: "bg-brand/20 text-brand-dark",
    cardBg: "border-brand/20 bg-surface",
  },
];

export function SessionStats(stats: SessionStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.key} className={`overflow-hidden shadow-sm ${card.cardBg}`}>
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand/65">{card.label}</p>
              {card.hint ? (
                <p className="mt-0.5 text-[11px] text-brand/45">{card.hint}</p>
              ) : null}
              <p className="mt-2 font-sans text-3xl font-bold tracking-tight text-brand-dark">
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
