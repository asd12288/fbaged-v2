select to_regclass('public.lead_import_batches') as batches_table;
select to_regclass('public.leads') as leads_table;
select to_regclass('public.lead_import_rejections') as rejections_table;
select to_regprocedure('public.admin_leads_import_confirm(uuid,bigint,text,jsonb)') as confirm_function;
