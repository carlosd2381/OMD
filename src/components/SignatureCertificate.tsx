import type { SignatureMetadata, SignaturePartyMetadata } from '../types/contract';

interface PartyFallback extends Partial<SignaturePartyMetadata> {
  name?: string;
  email?: string;
  role?: string;
}

interface SignatureCertificateProps {
  metadata?: SignatureMetadata;
  clientFallback?: PartyFallback;
  providerFallback?: PartyFallback;
  fingerprint?: string;
}

const formatDateTime = (value?: string) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  return date.toLocaleString();
};

const renderPartyCard = (title: string, data?: SignaturePartyMetadata, fallbackRole?: string, fallbackFingerprint?: string) => {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white/50 p-4 text-sm text-gray-400">
        {title} details pending
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
      <dl className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between"><dt className="font-medium">Name</dt><dd>{data.name || '—'}</dd></div>
        <div className="flex justify-between"><dt className="font-medium">Email</dt><dd>{data.email || '—'}</dd></div>
        <div className="flex justify-between"><dt className="font-medium">Role</dt><dd>{data.role || fallbackRole || '—'}</dd></div>
        <div className="flex justify-between"><dt className="font-medium">Signed At</dt><dd>{formatDateTime(data.signed_at)}</dd></div>
        <div className="flex justify-between"><dt className="font-medium">IP Address</dt><dd>{data.ip_address || '—'}</dd></div>
        <div className="flex justify-between"><dt className="font-medium">User Agent</dt><dd className="text-right max-w-[180px] truncate" title={data.user_agent}>{data.user_agent || '—'}</dd></div>
      </dl>
      <div className="mt-3 rounded bg-gray-50 px-3 py-2 text-[11px] font-mono text-gray-500 break-all">
        Electronic Signature Fingerprint: {data.fingerprint || fallbackFingerprint || 'N/A'}
      </div>
    </div>
  );
};

export function SignatureCertificate({ metadata, clientFallback, providerFallback, fingerprint }: SignatureCertificateProps) {
  if (!metadata && !clientFallback && !providerFallback) return null;

  const clientData: SignaturePartyMetadata | undefined = metadata?.client || (clientFallback
    ? {
        name: clientFallback.name || '',
        email: clientFallback.email,
        role: clientFallback.role || 'Client',
        signed_at: clientFallback.signed_at,
        ip_address: clientFallback.ip_address,
        user_agent: clientFallback.user_agent,
        fingerprint: clientFallback.fingerprint,
      }
    : undefined);

  const providerData: SignaturePartyMetadata | undefined = metadata?.provider || (providerFallback
    ? {
        name: providerFallback.name || '',
        email: providerFallback.email,
        role: providerFallback.role || 'Service Provider',
        signed_at: providerFallback.signed_at,
        ip_address: providerFallback.ip_address,
        user_agent: providerFallback.user_agent,
        fingerprint: providerFallback.fingerprint,
      }
    : undefined);

  const transaction = metadata?.transaction;

  return (
    <section className="mt-10 space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Signature Certificate</p>
        <p className="text-sm text-gray-500">Audit-ready metadata for every electronically signed party.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {renderPartyCard('Client Signature', clientData, 'Client', fingerprint)}
        {renderPartyCard('Service Provider Signature', providerData, 'Service Provider', fingerprint)}
      </div>
      {transaction && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Transaction Metadata</h4>
          <dl className="grid gap-2 text-xs text-gray-600 md:grid-cols-2">
            <div>
              <dt className="font-medium">Method</dt>
              <dd>{transaction.method || 'Client Portal'}</dd>
            </div>
            <div>
              <dt className="font-medium">Reference</dt>
              <dd>{transaction.reference || 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-medium">Location</dt>
              <dd className="truncate" title={transaction.location}>{transaction.location || 'N/A'}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
