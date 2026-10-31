-- Auth triggers run with a restricted schema search path. Qualify public
-- objects explicitly so signups can create the corresponding profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, company_domain)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 2)
  );
  return new;
end;
$$;
