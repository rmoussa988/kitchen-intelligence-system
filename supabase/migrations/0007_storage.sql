-- KIS — file storage for scans & photos (0007)
-- Two public buckets (unguessable object paths) for supplier-invoice scans and waste photos, plus
-- the columns that hold each file's URL on its record. Public read keeps display simple; uploads
-- require a signed-in user. Tighten to signed URLs later if scans become sensitive.

insert into storage.buckets (id, name, public)
values ('invoice-scans', 'invoice-scans', true),
       ('waste-photos',  'waste-photos',  true)
on conflict (id) do nothing;

-- Upload / modify policies on storage.objects (RLS is already enabled by Supabase). Wrapped so a
-- privilege hiccup on storage.objects doesn't abort the script; public read needs no policy.
do $$
begin
  begin
    create policy "kis upload attachments" on storage.objects
      for insert to authenticated
      with check (bucket_id in ('invoice-scans', 'waste-photos'));
  exception when duplicate_object then null; when others then raise notice 'storage insert policy: %', sqlerrm; end;
  begin
    create policy "kis update attachments" on storage.objects
      for update to authenticated
      using (bucket_id in ('invoice-scans', 'waste-photos'));
  exception when duplicate_object then null; when others then raise notice 'storage update policy: %', sqlerrm; end;
end $$;

-- URL columns on the records that carry a file.
alter table waste             add column if not exists photo_url text;
alter table supplier_invoices add column if not exists scan_url  text;
alter table deliveries        add column if not exists scan_url  text;
