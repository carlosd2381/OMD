import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Contract, SignatureMetadata } from '../../types/contract';
import type { Client } from '../../types/client';
import type { Event } from '../../types/event';
import type { BrandingSettings } from '../../services/settingsService';
import type { Quote, QuoteItem } from '../../types/quote';

export interface ContractInvoiceScheduleItem {
  label: string;
  dueDateLabel: string;
  amount: number;
  status?: string;
}

export interface ContractTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type ContractContentBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'rich'; segments: ContractTextSegment[] }
  | { type: 'list'; ordered: boolean; items: string[] };

interface ContractPDFProps {
  contract: Contract;
  client: Client;
  branding: BrandingSettings | null;
  event: Event | null;
  documentId: string;
  contentBlocks: ContractContentBlock[];
  invoiceSchedule: ContractInvoiceScheduleItem[];
  fingerprint?: string;
  signatureMetadata?: SignatureMetadata;
  quoteItems?: QuoteItem[];
  quote?: Quote | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#2f2f2f',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Times-Roman',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#5f5f5f',
    marginBottom: 2,
  },
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 28,
  },
  heroEyebrow: {
    fontSize: 10,
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'Times-Roman',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroDivider: {
    width: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginVertical: 6,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f0eb',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  partyColumn: {
    width: '42%',
  },
  partyColumnRight: {
    width: '42%',
    alignItems: 'flex-end',
  },
  partiesLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  partyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partyText: {
    fontSize: 10,
    color: '#4b5563',
    marginBottom: 2,
  },
  partyTextRight: {
    textAlign: 'right',
  },
  partyNote: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 6,
  },
  andBadge: {
    width: '12%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
  },
  andText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#d1d5db',
  },
  eventSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  eventColumn: {
    width: '48%',
  },
  eventField: {
    marginBottom: 18,
  },
  eventLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  eventValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2933',
  },
  eventSubValue: {
    fontSize: 10,
    color: '#4b5563',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    color: '#333',
  },
  heading: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    color: '#1f2933',
  },
  subheading: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    color: '#374151',
  },
  paragraph: {
    fontSize: 10,
    color: '#333',
    marginBottom: 8,
    textAlign: 'justify',
  },
  paragraphSpan: {
    fontSize: 10,
    color: '#333',
  },
  paragraphBold: {
    fontSize: 10,
    color: '#333',
    fontWeight: 'bold',
  },
  paragraphItalic: {
    fontSize: 10,
    color: '#333',
    fontStyle: 'italic',
  },
  paragraphUnderline: {
    fontSize: 10,
    color: '#333',
    textDecoration: 'underline',
  },
  listItem: {
    fontSize: 10,
    color: '#333',
    marginBottom: 4,
    paddingLeft: 12,
  },
  orderedItem: {
    fontSize: 10,
    color: '#333',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 9,
    color: '#666',
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalsTable: {
    width: '50%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    padding: 10,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  totalsValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2933',
  },
  scheduleHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f0eb',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  colPayment: { width: '45%' },
  colDue: { width: '30%' },
  colAmount: { width: '25%', textAlign: 'right' },
  scheduleText: {
    fontSize: 9,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 6,
    minHeight: 20,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#555',
    textTransform: 'uppercase',
  },
  certificate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  certificateCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 6,
    padding: 10,
  },
  certificateHeading: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  certificateMeta: {
    fontSize: 9,
    color: '#555',
    marginBottom: 2,
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#555',
  },
});

const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number, currency: string = 'MXN') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const buildClientAddress = (client: Client) => {
  if (client.address) return client.address;
  const parts = [client.city, client.state, client.country].filter(Boolean);
  if (client.zip_code) parts.push(client.zip_code);
  return parts.join(', ') || 'Address on file';
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  const normalize = (value?: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (trimmed.length >= 5 && trimmed.includes(':')) {
      return trimmed.slice(0, 5);
    }
    return trimmed;
  };
  const startText = normalize(start);
  const endText = normalize(end);
  if (startText && endText) return `${startText} - ${endText}`;
  return startText || endText || 'Scheduled';
};

const summarizeQuote = (quote?: Quote | null, fallbackItems?: QuoteItem[]) => {
  const items = quote?.items || fallbackItems || [];
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxes = quote?.taxes?.map(tax => ({
    label: `${tax.name}${typeof tax.rate === 'number' ? ` (${tax.rate}%)` : ''}`,
    amount: tax.is_retention ? -tax.amount : tax.amount,
  })) || [];
  const grandTotal = subtotal + taxes.reduce((sum, tax) => sum + tax.amount, 0);
  return {
    subtotal,
    taxes,
    grandTotal,
    currency: quote?.currency || 'MXN',
  };
};

const renderSignatureParty = (label: string, party?: SignatureMetadata['client']) => (
  <View style={styles.certificateCard}>
    <Text style={styles.certificateHeading}>{label}</Text>
    <Text style={styles.certificateMeta}>{party?.name || 'Pending'}</Text>
    {party?.email && <Text style={styles.certificateMeta}>{party.email}</Text>}
    {party?.role && <Text style={styles.certificateMeta}>{party.role}</Text>}
    {party?.signed_at && (
      <Text style={styles.certificateMeta}>Signed: {formatDate(party.signed_at)}</Text>
    )}
    {party?.ip_address && (
      <Text style={styles.certificateMeta}>IP: {party.ip_address}</Text>
    )}
    {party?.fingerprint && (
      <Text style={styles.certificateMeta}>Fingerprint: {party.fingerprint}</Text>
    )}
  </View>
);

export const ContractPDF = ({
  contract,
  client,
  branding,
  event,
  documentId,
  contentBlocks,
  invoiceSchedule,
  fingerprint,
  signatureMetadata,
  quoteItems,
  quote,
}: ContractPDFProps) => {
  const versionLabel = `v${contract.document_version || 1}.0`;
  const summary = summarizeQuote(quote, quoteItems);
  const displayCurrency = summary.currency || 'MXN';
  const clientAddress = buildClientAddress(client);
  const venueName = event?.venue_name || event?.name || 'Venue TBD';
  const venueSubLocation = event?.venue_sub_location || '[Venue Sub-Location]';
  const venueAddress = event?.venue_address || 'Address to be confirmed';
  const eventTime = formatTimeRange(event?.start_time, event?.end_time);
  const providerAddressLines = (
    branding?.address ? branding.address.split('\n').filter(Boolean) : null
  ) || ['Priv. Palmilla, Jardines del Sur II', 'Cancun, Mexico'];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>SERVICE CONTRACT</Text>
            <Text style={styles.companyName}>{branding?.company_name || 'Oh My Desserts MX'}</Text>
            <Text style={styles.companyInfo}>{branding?.address || 'Priv. Palmilla, Jardines del Sur II, Benito Juarez, Quintana Roo, 77535'}</Text>
            <Text style={styles.companyInfo}>{branding?.website || 'www.ohmydessertsmx.com'} | {branding?.email || 'info@ohmydessertsmx.com'}</Text>
          </View>
          <View style={styles.logoContainer}>
            {branding?.logo_url ? (
              <Image src={branding.logo_url} style={styles.logo} />
            ) : (
              <Text>LOGO</Text>
            )}
          </View>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Dessert Catering Service</Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroSubtitle}>Contract Agreement</Text>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyColumn}>
            <Text style={styles.partiesLabel}>Contract Between:</Text>
            <Text style={styles.partyName}>{client.first_name} {client.last_name}</Text>
            <Text style={styles.partyText}>{clientAddress}</Text>
            <Text style={styles.partyNote}>Hereby known as 'CLIENT'.</Text>
          </View>
          <View style={styles.andBadge}>
            <Text style={styles.andText}>AND</Text>
          </View>
          <View style={styles.partyColumnRight}>
            <Text style={[styles.partiesLabel, { textAlign: 'right' }]}>Service Provider:</Text>
            <Text style={[styles.partyName, { textAlign: 'right' }]}>{branding?.company_name || 'Oh My Desserts MX'}</Text>
            {providerAddressLines.map((line, index) => (
              <Text key={`address-line-${index}`} style={[styles.partyText, styles.partyTextRight]}>
                {line}
              </Text>
            ))}
            <Text style={[styles.partyNote, { textAlign: 'right' }]}>Hereby known as 'OMD'.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Information</Text>
          <View style={styles.eventSection}>
            <View style={styles.eventColumn}>
              <View style={styles.eventField}>
                <Text style={styles.eventLabel}>Venue</Text>
                <Text style={styles.eventValue}>{venueName}</Text>
                <Text style={styles.eventSubValue}>{venueSubLocation}</Text>
              </View>
              <View style={styles.eventField}>
                <Text style={styles.eventLabel}>Address</Text>
                <Text style={styles.eventSubValue}>{venueAddress}</Text>
              </View>
            </View>
            <View style={styles.eventColumn}>
              <View style={styles.eventField}>
                <Text style={styles.eventLabel}>Date</Text>
                <Text style={styles.eventValue}>{formatDate(event?.date)}</Text>
              </View>
              <View style={styles.eventField}>
                <Text style={styles.eventLabel}>Time</Text>
                <Text style={styles.eventValue}>{eventTime}</Text>
              </View>
            </View>
          </View>
        </View>

        {quoteItems && quoteItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleText, { width: '50%' }]}>Description</Text>
              <Text style={[styles.scheduleText, { width: '15%', textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.scheduleText, { width: '15%', textAlign: 'right' }]}>Unit</Text>
              <Text style={[styles.scheduleText, { width: '20%', textAlign: 'right' }]}>Total</Text>
            </View>
            {quoteItems.map(item => (
              <View key={item.id} style={styles.scheduleRow}>
                <Text style={[styles.scheduleText, { width: '50%' }]}>{item.description}</Text>
                <Text style={[styles.scheduleText, { width: '15%', textAlign: 'center' }]}>{item.quantity}</Text>
                <Text style={[styles.scheduleText, { width: '15%', textAlign: 'right' }]}>{formatCurrency(item.unit_price, displayCurrency)}</Text>
                <Text style={[styles.scheduleText, { width: '20%', textAlign: 'right' }]}>{formatCurrency(item.total, displayCurrency)}</Text>
              </View>
            ))}
            <View style={styles.totalsContainer}>
              <View style={styles.totalsTable}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Subtotal</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(summary.subtotal, displayCurrency)}</Text>
                </View>
                {summary.taxes.map(tax => (
                  <View key={tax.label} style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>{tax.label}</Text>
                    <Text style={styles.totalsValue}>{formatCurrency(tax.amount, displayCurrency)}</Text>
                  </View>
                ))}
                <View style={[styles.totalsRow, { marginTop: 4 }]}> 
                  <Text style={[styles.totalsLabel, { fontWeight: 'bold', color: '#111827' }]}>Grand Total</Text>
                  <Text style={[styles.totalsValue, { fontSize: 11 }]}>{formatCurrency(summary.grandTotal, displayCurrency)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          {(contentBlocks.length
            ? contentBlocks
            : ([{ type: 'paragraph', text: 'Contract content pending.' }] as ContractContentBlock[])
          ).map((block, index) => {
            switch (block.type) {
              case 'heading': {
                const headingStyle = block.level <= 2 ? styles.heading : styles.subheading;
                return (
                  <Text key={`heading-${index}`} style={headingStyle}>
                    {block.text}
                  </Text>
                );
              }
              case 'list': {
                return (
                  <View key={`list-${index}`} style={{ marginBottom: 8 }}>
                    {block.items.map((item: string, itemIndex: number) => (
                      <Text
                        key={`list-${index}-item-${itemIndex}`}
                        style={block.ordered ? styles.orderedItem : styles.listItem}
                      >
                        {block.ordered ? `${itemIndex + 1}. ${item}` : `• ${item}`}
                      </Text>
                    ))}
                  </View>
                );
              }
              case 'paragraph':
                return (
                  <Text key={`paragraph-${index}`} style={styles.paragraph}>
                    {block.text}
                  </Text>
                );
              case 'rich':
                return (
                  <Text key={`rich-${index}`} style={styles.paragraph}>
                    {block.segments.map((segment, segIndex) => {
                      const spanStyles = [styles.paragraphSpan];
                      if (segment.bold) spanStyles.push(styles.paragraphBold);
                      if (segment.italic) spanStyles.push(styles.paragraphItalic);
                      if (segment.underline) spanStyles.push(styles.paragraphUnderline);
                      return (
                        <Text key={`rich-${index}-seg-${segIndex}`} style={spanStyles}>
                          {segment.text}
                        </Text>
                      );
                    })}
                  </Text>
                );
              default:
                return null;
            }
          })}
        </View>

        {invoiceSchedule.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleText, styles.colPayment]}>Payment</Text>
              <Text style={[styles.scheduleText, styles.colDue]}>Due Date</Text>
              <Text style={[styles.scheduleText, styles.colAmount]}>Amount</Text>
            </View>
            {invoiceSchedule.map((entry, idx) => (
              <View key={`${entry.label}-${idx}`} style={styles.scheduleRow}>
                <Text style={[styles.scheduleText, styles.colPayment]}>{entry.label}</Text>
                <Text style={[styles.scheduleText, styles.colDue]}>{entry.dueDateLabel}</Text>
                <Text style={[styles.scheduleText, styles.colAmount]}>{formatCurrency(entry.amount, displayCurrency)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          <View style={styles.signatureSection}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine}>
                {contract.signed_by && (
                  <Text>{contract.signed_by}</Text>
                )}
              </View>
              <Text style={styles.signatureLabel}>Client Signature</Text>
              {contract.signed_at && (
                <Text style={styles.infoLabel}>Signed {formatDate(contract.signed_at)}</Text>
              )}
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine}>
                <Text>{branding?.company_name || 'Oh My Desserts MX'}</Text>
              </View>
              <Text style={styles.signatureLabel}>Provider Representative</Text>
              <Text style={styles.infoLabel}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

        {signatureMetadata && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signature Certificate</Text>
            <View style={styles.certificate}>
              {renderSignatureParty('Client', signatureMetadata.client)}
              {renderSignatureParty('Provider', signatureMetadata.provider)}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Document ID {documentId} • Version {versionLabel} • Fingerprint {fingerprint || 'pending'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
