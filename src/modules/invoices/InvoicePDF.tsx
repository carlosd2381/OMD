import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Invoice } from '../../types/invoice';
import type { Client } from '../../types/client';
import type { BrandingSettings } from '../../services/settingsService';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Times-Roman',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
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
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  billTo: {
    width: '45%',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    color: '#333',
  },
  clientName: {
    fontSize: 10,
    marginBottom: 4,
  },
  clientInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  invoiceDetails: {
    width: '45%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 2,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#666',
  },
  detailValue: {
    fontSize: 9,
    textAlign: 'right',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f0eb',
    padding: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 8,
  },
  colNo: { width: '10%', textAlign: 'center' },
  colDesc: { width: '60%' },
  colAmount: { width: '30%', textAlign: 'right' },
  
  totalsSection: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#f5f0eb',
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  thankYou: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#666',
    marginTop: 20,
    backgroundColor: '#f5f0eb',
    padding: 6,
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  client: Client;
  branding: BrandingSettings | null;
  displayId?: string;
}

export const InvoicePDF = ({ invoice, client, branding, displayId }: InvoicePDFProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MXN', // Assuming MXN for now, or pass currency prop
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.companyName}>{branding?.company_name || 'Oh My Desserts MX'}</Text>
            <Text style={styles.companyInfo}>{branding?.address || 'Priv. Palmilla, Jardines del Sur II, Benito Juarez, Quintana Roo, 77535'}</Text>
            <Text style={styles.companyInfo}>{branding?.website || 'www.ohmydessertsmx.com'} | {branding?.email || 'info@ohmydessertsmx.com'}</Text>
          </View>
          <View style={styles.logoContainer}>
            {branding?.logo_url ? (
              <Image src={branding.logo_url} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 8, color: '#ccc' }}>LOGO</Text>
            )}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.billTo}>
            <Text style={styles.sectionTitle}>BILL TO</Text>
            <Text style={styles.clientName}>{client.first_name} {client.last_name}</Text>
            <Text style={styles.clientInfo}>{client.email}</Text>
            <Text style={styles.clientInfo}>{client.phone}</Text>
          </View>
          <View style={styles.invoiceDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>INVOICE #:</Text>
              <Text style={styles.detailValue}>{displayId || invoice.invoice_number}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>DATE:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.created_at)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>DUE DATE:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.due_date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>STATUS:</Text>
              <Text style={styles.detailValue}>{invoice.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.sectionTitle, styles.colNo]}>NO</Text>
          <Text style={[styles.sectionTitle, styles.colDesc]}>DESCRIPTION</Text>
          <Text style={[styles.sectionTitle, styles.colAmount]}>AMOUNT</Text>
        </View>

        {/* Table Rows */}
        {invoice.items.map((item, index) => (
          <View style={styles.tableRow} key={index}>
            <Text style={[styles.detailValue, styles.colNo]}>{index + 1}</Text>
            <Text style={[styles.detailValue, styles.colDesc]}>{item.description}</Text>
            <Text style={[styles.detailValue, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.total_amount)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.thankYou}>THANK YOU FOR YOUR BUSINESS!</Text>
        </View>
      </Page>
    </Document>
  );
};
