"use client";

import { useEffect, useState } from "react";
import { getProfileOptionsAction } from "@/app/actions";
import type { ProfileOption } from "@/lib/db/profiles";

/** Loads the full student list only when a picker dialog is opened. */
export function useLazyProfileOptions(active: boolean) {
  const [users, setUsers] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!active || fetched) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getProfileOptionsAction()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load users");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setFetched(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, fetched]);

  return { users, loading, error };
}
