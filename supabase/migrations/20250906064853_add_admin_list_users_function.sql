create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  role text,
  created_at timestamptz,
  email text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.role, p.created_at, u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where exists (
    select 1 from public.profiles ap 
    where ap.id = auth.uid() and ap.role = 'admin'
  )
  order by p.created_at desc;
$$;

grant execute on function public.admin_list_users() to authenticated;;
