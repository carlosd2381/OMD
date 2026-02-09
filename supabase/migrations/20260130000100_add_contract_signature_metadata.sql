alter table public.contracts
  add column if not exists signature_metadata jsonb,
  add column if not exists document_version integer not null default 1;

comment on column public.contracts.signature_metadata is 'Audit details for signatures, including signer info, ip, and user agent.';
comment on column public.contracts.document_version is 'Version number for the generated contract document.';
