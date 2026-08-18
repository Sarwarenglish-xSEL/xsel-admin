import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, createStandaloneAnonClient } from "@/lib/supabase/admin";
import { DEFAULT_USER_PASSWORD } from "@/lib/user-defaults";
import {
  canAssignRole,
  canManageUsers,
  type AdminModule,
} from "@/lib/permissions";
import { getAdminDataClient } from "@/lib/db/admin-client";
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
  const supabase = await getAdminDataClient();
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

async function getUserManagerProfile(): Promise<UserMutationResult | Profile> {
  const current = await getCurrentProfile();
  if (!current || !canManageUsers(current.role)) {
    return { ok: false, message: "Only admins can manage users" };
  }
  return current;
}

function validateRoleChange(
  manager: Profile,
  userId: string,
  targetRole: Profile["role"]
): UserMutationResult | null {
  if (!canAssignRole(manager.role, targetRole)) {
    return { ok: false, message: "You cannot assign this role" };
  }

  if (userId === manager.id) {
    if (manager.role === "superadmin" && targetRole !== "superadmin") {
      return { ok: false, message: "You cannot remove your own superadmin access" };
    }
    if (manager.role === "admin" && targetRole !== "admin") {
      return { ok: false, message: "You cannot remove your own admin access" };
    }
  }

  return null;
}

export async function updateManagerModules(
  userId: string,
  modules: AdminModule[]
): Promise<UserMutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ allowed_modules: modules })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateUser(
  userId: string,
  input: {
    full_name: string;
    email: string;
    role: Profile["role"];
    allowed_modules?: AdminModule[];
    device_transfer_count?: number;
  }
): Promise<UserMutationResult> {
  const manager = await getUserManagerProfile();
  if ("ok" in manager) return manager;

  const roleError = validateRoleChange(manager, userId, input.role);
  if (roleError) return roleError;

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", userId)
    .single();

  if (fetchError || !existing) {
    return { ok: false, message: fetchError?.message ?? "User not found" };
  }

  if (!canAssignRole(manager.role, existing.role as Profile["role"])) {
    return { ok: false, message: "You cannot modify this user" };
  }

  const emailChanged = existing.email !== input.email;
  const service = createServiceClient();

  if (emailChanged && !service) {
    return {
      ok: false,
      message: "Changing email requires SUPABASE_SERVICE_ROLE_KEY in server config",
    };
  }

  const profileUpdate: Record<string, unknown> = {
    full_name: input.full_name,
    email: input.email,
    role: input.role,
  };

  if (typeof input.device_transfer_count === "number") {
    profileUpdate.device_transfer_count = Math.min(
      2,
      Math.max(0, Math.trunc(input.device_transfer_count))
    );
  }

  if (input.role === "manager") {
    profileUpdate.allowed_modules = input.allowed_modules ?? [];
  } else {
    profileUpdate.allowed_modules = [];
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
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
  const manager = await getUserManagerProfile();
  if ("ok" in manager) return manager;

  if (userId === manager.id) {
    return { ok: false, message: "You cannot delete your own account" };
  }

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (fetchError || !target) {
    return { ok: false, message: fetchError?.message ?? "User not found" };
  }

  if (!canAssignRole(manager.role, target.role as Profile["role"])) {
    return { ok: false, message: "You cannot delete this user" };
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
  const supabase = await getAdminDataClient();
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
  role: Profile["role"],
  allowedModules?: AdminModule[]
): Promise<{ ok: true; needsEmailConfirmation?: boolean } | { ok: false; message: string }> {
  const current = await getCurrentProfile();
  if (!current || !canManageUsers(current.role)) {
    return { ok: false, message: "Only admins can create users" };
  }

  if (!canAssignRole(current.role, role)) {
    return { ok: false, message: "You cannot assign this role" };
  }

  const service = createServiceClient();
  if (service) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: DEFAULT_USER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    });

    if (error) return { ok: false, message: error.message };

    if (role === "manager" && data.user && allowedModules) {
      const modulesResult = await updateManagerModules(data.user.id, allowedModules);
      if (!modulesResult.ok) return modulesResult;
    }

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

  if (role === "manager" && data.user && allowedModules) {
    const modulesResult = await updateManagerModules(data.user.id, allowedModules);
    if (!modulesResult.ok) return modulesResult;
  }

  return { ok: true, needsEmailConfirmation: !data.session };
}
