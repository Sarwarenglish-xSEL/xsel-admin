import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, createStandaloneAnonClient } from "@/lib/supabase/admin";
import { DEFAULT_USER_PASSWORD } from "@/lib/user-defaults";
import type { Profile } from "@/types/database";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
});

export async function getProfiles(search?: string): Promise<Profile[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`email.ilike.${term},full_name.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateUserRole(
  userId: string,
  role: Profile["role"]
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}

type UserMutationResult = { ok: true } | { ok: false; message: string };

async function getAdminProfile(): Promise<UserMutationResult | Profile> {
  const current = await getCurrentProfile();
  if (!current || current.role !== "admin") {
    return { ok: false, message: "Only admins can manage users" };
  }
  return current;
}

export async function updateUser(
  userId: string,
  input: { full_name: string; email: string; role: Profile["role"] }
): Promise<UserMutationResult> {
  const admin = await getAdminProfile();
  if ("ok" in admin) return admin;

  if (userId === admin.id && input.role !== "admin") {
    return { ok: false, message: "You cannot remove your own admin access" };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (fetchError || !existing) {
    return { ok: false, message: fetchError?.message ?? "User not found" };
  }

  const emailChanged = existing.email !== input.email;
  const service = createServiceClient();

  if (emailChanged && !service) {
    return {
      ok: false,
      message: "Changing email requires SUPABASE_SERVICE_ROLE_KEY in server config",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      email: input.email,
      role: input.role,
    })
    .eq("id", userId);

  if (profileError) return { ok: false, message: profileError.message };

  if (service) {
    const { error: authError } = await service.auth.admin.updateUserById(userId, {
      email: input.email,
      user_metadata: {
        full_name: input.full_name,
        role: input.role,
      },
    });

    if (authError) return { ok: false, message: authError.message };
  }

  return { ok: true };
}

export async function deleteUser(userId: string): Promise<UserMutationResult> {
  const admin = await getAdminProfile();
  if ("ok" in admin) return admin;

  if (userId === admin.id) {
    return { ok: false, message: "You cannot delete your own account" };
  }

  const service = createServiceClient();
  if (!service) {
    return {
      ok: false,
      message: "User deletion requires SUPABASE_SERVICE_ROLE_KEY in server config",
    };
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function getStaffProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function createUser(
  email: string,
  fullName: string,
  role: Profile["role"]
): Promise<{ ok: true; needsEmailConfirmation?: boolean } | { ok: false; message: string }> {
  const current = await getCurrentProfile();
  if (!current || current.role !== "admin") {
    return { ok: false, message: "Only admins can create users" };
  }

  const service = createServiceClient();
  if (service) {
    const { error } = await service.auth.admin.createUser({
      email,
      password: DEFAULT_USER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const anon = createStandaloneAnonClient();
  if (!anon) {
    return { ok: false, message: "Server configuration error" };
  }

  const { data, error } = await anon.auth.signUp({
    email,
    password: DEFAULT_USER_PASSWORD,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, needsEmailConfirmation: !data.session };
}
