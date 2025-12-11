import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Quote, QuoteItem } from '../../types/quote';
import type { Client } from '../../types/client';
import type { BrandingSettings } from '../../services/settingsService';

// Register fonts if needed, otherwise use standard fonts
// Font.register({ family: 'Open Sans', src: '...' });

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
    fontFamily: 'Times-Roman', // Serif font for "PRICE QUOTE"
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
    backgroundColor: '#f5f0eb', // Light beige background for logo placeholder
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  logoText: {
    fontSize: 8,
    textAlign: 'center',
    color: '#999',
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
  quoteDetails: {
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
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f0eb', // Light beige
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  colNo: { width: '8%', textAlign: 'center' },
  colDesc: { width: '52%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colAmount: { width: '15%', textAlign: 'right' },
  
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#555',
  },
  tableCell: {
    fontSize: 9,
    color: '#333',
  },
  
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  termsBox: {
    width: '55%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
    backgroundColor: '#f5f0eb',
    paddingVertical: 4,
  },
  termsText: {
    fontSize: 8,
    color: '#666',
    lineHeight: 1.4,
  },
  totalsSection: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#f5f0eb',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 9,
    textAlign: 'right',
  },
  
  signatureSection: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '30%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#666',
  },
  
  bottomBranding: {
    marginTop: 40,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 14,
    fontFamily: 'Times-Roman',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  thankYou: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    backgroundColor: '#f5f0eb',
    paddingVertical: 6,
  }
});

interface QuotePDFProps {
  quote: Quote;
  client: Client;
  branding: BrandingSettings | null;
  items: QuoteItem[];
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
  quoteNumber: string;
}

export const QuotePDF = ({ quote, client, branding, items, totals, quoteNumber }: QuotePDFProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>PRICE QUOTE</Text>
            <Text style={styles.companyName}>{branding?.company_name || 'Oh My Desserts MX'}</Text>
            <Text style={styles.companyInfo}>Gran Santa Fe III, Benito Juarez, Quintana Roo, 77535</Text>
            <Text style={styles.companyInfo}>www.ohmydessertsmx.com | info@ohmydessertsmx.com</Text>
          </View>
          <View style={styles.logoContainer}>
            {branding?.logo_url ? (
              <Image src={branding.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.logoText}>insert company logo</Text>
            )}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.billTo}>
            <Text style={styles.sectionTitle}>BILL TO</Text>
            <Text style={styles.clientName}>{client.first_name} {client.last_name}</Text>
            {client.company_name && <Text style={styles.clientInfo}>{client.company_name}</Text>}
            {client.address && <Text style={styles.clientInfo}>{client.address}</Text>}
            {client.city && <Text style={styles.clientInfo}>{client.city}, {client.state} {client.zip_code}</Text>}
            <Text style={styles.clientInfo}>{client.email}</Text>
          </View>
          <View style={styles.quoteDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>QUOTE #:</Text>
              <Text style={styles.detailValue}>{quoteNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>QUOTE DATE:</Text>
              <Text style={styles.detailValue}>{formatDate(quote.created_at)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PREPARED BY:</Text>
              <Text style={styles.detailValue}>Admin User</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VALID UNTIL:</Text>
              <Text style={styles.detailValue}>{formatDate(quote.valid_until)}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colNo, styles.tableHeaderText]}>NO</Text>
            <Text style={[styles.colDesc, styles.tableHeaderText]}>DESCRIPTION</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>QTY</Text>
            <Text style={[styles.colPrice, styles.tableHeaderText]}>PRICE</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>AMOUNT</Text>
          </View>
          {items.map((item, index) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.colNo, styles.tableCell]}>{index + 1}</Text>
              <Text style={[styles.colDesc, styles.tableCell]}>{item.description}</Text>
              <Text style={[styles.colQty, styles.tableCell]}>{item.quantity}</Text>
              <Text style={[styles.colPrice, styles.tableCell]}>{formatCurrency(item.unit_price, quote.currency)}</Text>
              <Text style={[styles.colAmount, styles.tableCell]}>{formatCurrency(item.total, quote.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.termsBox}>
            <Text style={styles.termsTitle}>TERMS & CONDITIONS</Text>
            <Text style={styles.termsText}>
              This quotation is not a Contract/Receipt/Invoice. It's our best guess of the Total Prices for the Products/Services described above. The customer will be charged after the acceptance of this quote. Payment will be due before delivery of Products/Services.
            </Text>
          </View>
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SUBTOTAL</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.subtotal, quote.currency)}</Text>
            </View>
            
            {quote.taxes && quote.taxes.length > 0 ? (
              quote.taxes.map((tax, index) => (
                <View style={styles.totalRow} key={index}>
                  <Text style={styles.totalLabel}>{tax.name} ({tax.rate}%)</Text>
                  <Text style={styles.totalValue}>
                    {tax.is_retention ? '-' : ''}{formatCurrency(tax.amount, quote.currency)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TAX</Text>
                <Text style={styles.totalValue}>{formatCurrency(totals.tax, quote.currency)}</Text>
              </View>
            )}

            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabel}>AMOUNT DUE</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.total, quote.currency)}</Text>
            </View>
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Name:</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature:</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Date:</Text>
          </View>
        </View>

        {/* Bottom Branding */}
        <View style={styles.bottomBranding}>
          <Text style={styles.bottomText}>{branding?.company_name || 'Company Name'}</Text>
        </View>

        <Text style={styles.thankYou}>THANK YOU FOR YOUR BUSINESS!</Text>
      </Page>
    </Document>
  );
};
