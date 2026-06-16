-- Allow role selection during signup via auth user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role public.user_role;
begin
  begin
    selected_role := coalesce(
      nullif(new.raw_user_meta_data->>'role', '')::public.user_role,
      'user'::public.user_role
    );
  exception
    when others then
      selected_role := 'user'::public.user_role;
  end;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    selected_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
