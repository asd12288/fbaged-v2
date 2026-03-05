alter table public.lead_import_batches
  add column if not exists clean_file_path text,
  add column if not exists duplicate_file_path text;

insert into storage.buckets (id, name, public)
values ('lead-import-files', 'lead-import-files', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "lead import files admin select" on storage.objects;
create policy "lead import files admin select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lead-import-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "lead import files admin insert" on storage.objects;
create policy "lead import files admin insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lead-import-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "lead import files admin update" on storage.objects;
create policy "lead import files admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lead-import-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  bucket_id = 'lead-import-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "lead import files admin delete" on storage.objects;
create policy "lead import files admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lead-import-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
