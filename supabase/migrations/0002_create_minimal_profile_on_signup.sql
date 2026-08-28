-- Automatically create the minimum Juntos profile when Supabase Auth creates a user.
-- preferred_language is UX-only and must never be used for authorization.

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.handle_new_juntos_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, preferred_language)
  values (
    new.id,
    case
      when coalesce(new.raw_user_meta_data->>'preferred_language', 'en') = 'es' then 'es'
      else 'en'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_juntos_user() from public, anon, authenticated;
grant execute on function private.handle_new_juntos_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created_juntos on auth.users;
create trigger on_auth_user_created_juntos
after insert on auth.users
for each row execute function private.handle_new_juntos_user();
