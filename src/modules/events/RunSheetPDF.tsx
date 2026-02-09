import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Event } from '../../types/event';
import type { Venue, VenueContact } from '../../types/venue';
import type { RunSheet } from '../../types/runSheet';
import type { Client } from '../../types/client';
import type { Planner } from '../../types/planner';
import type { StaffProfile } from '../../types/staff';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col2: {
    width: '50%',
    paddingRight: 10,
  },
  col3: {
    width: '33.33%',
    paddingRight: 10,
  },
  col4: {
    width: '25%',
    paddingRight: 10,
  },
  label: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  notesBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    minHeight: 60,
    fontSize: 10,
  },
});

interface RunSheetPDFProps {
  event: Event;
  venue: Venue | null;
  venueContact?: VenueContact | null;
  runSheet: RunSheet | null;
  client: Client | null;
  planner: Planner | null;
  staffList?: StaffProfile[];
}

export default function RunSheetPDF({ event, venue, venueContact, runSheet, client, planner, staffList }: RunSheetPDFProps) {
  const getStaffDisplay = (val?: string) => {
    if (!val) return '-';
    const match = staffList?.find(s => s.user_id === val || s.id === val);
    if (match) return `${match.first_name} ${match.last_name}`;
    return val;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Event Run Sheet</Text>
          <Text style={styles.subtitle}>{event.name} - {event.date}</Text>
        </View>

        {/* Venue Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Details</Text>
          <View style={styles.grid}>
            <View style={styles.col2}>
              <Text style={styles.label}>Venue Name</Text>
              <Text style={styles.value}>{venue?.name || 'N/A'}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Venue Area</Text>
              <Text style={styles.value}>{venue?.venue_area || 'N/A'}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{venue?.address || 'N/A'}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Venue Contact</Text>
              <Text style={styles.value}>
                {venueContact 
                  ? `${venueContact.first_name} ${venueContact.last_name}${venueContact.phone ? ` - ${venueContact.phone}` : ''}`
                  : (venue?.phone || venue?.email || 'N/A')}
              </Text>
            </View>
          </View>
        </View>

        {/* External Planner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>External Planner</Text>
          <View style={styles.grid}>
            <View style={styles.col3}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{planner?.first_name} {planner?.last_name || 'N/A'}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{planner?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{planner?.email || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Client Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <View style={styles.grid}>
            <View style={styles.col2}>
              <Text style={styles.label}>Client 1</Text>
              <Text style={styles.value}>{client?.first_name} {client?.last_name}</Text>
              <Text style={styles.value}>{client?.phone}</Text>
              <Text style={styles.value}>{client?.email}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Client 2</Text>
              <Text style={styles.value}>{event.secondary_client_id ? 'Secondary Client Info' : 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Event Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Schedule</Text>
          <View style={styles.grid}>
            <View style={styles.col4}>
              <Text style={styles.label}>Event Date</Text>
              <Text style={styles.value}>{event.date}</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Guest Count</Text>
              <Text style={styles.value}>{event.guest_count || 'N/A'}</Text>
            </View>
            <View style={styles.col4} />
            <View style={styles.col4} />

            <View style={styles.col4}>
              <Text style={styles.label}>Meet & Load</Text>
              <Text style={styles.value}>{runSheet?.meet_load_time || '-'}</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Leave to Event</Text>
              <Text style={styles.value}>{runSheet?.leave_time || '-'}</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Arrive at Venue</Text>
              <Text style={styles.value}>{runSheet?.arrive_time || '-'}</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Setup Time</Text>
              <Text style={styles.value}>{runSheet?.setup_time || '-'}</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Event Start</Text>
              <Text style={styles.value}>{runSheet?.event_start_time || '-'}</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Event End</Text>
              <Text style={styles.value}>{runSheet?.event_end_time || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Staff Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staff Details</Text>
          <View style={styles.grid}>
            <View style={styles.col4}>
              <Text style={styles.label}>Driver A</Text>
              <Text style={styles.value}>{getStaffDisplay(runSheet?.driver_a)}</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Driver B</Text>
              <Text style={styles.value}>{getStaffDisplay(runSheet?.driver_b)}</Text>
            </View>
            {[1, 2, 3, 4, 5, 6].map(num => {
              const key = `operator_${num}` as keyof RunSheet;
              const val = runSheet?.[key];
              if (!val) return null;
              return (
                <View key={key} style={styles.col4}>
                  <Text style={styles.label}>Operator {num}</Text>
                  <Text style={styles.value}>{getStaffDisplay(String(val))}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Equipment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          <View style={styles.grid}>
            {runSheet?.cart_1 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Cart 1</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.cart_2 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Cart 2</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.booth_1 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Booth 1</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.booth_2 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Booth 2</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.freezer_1 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Freezer 1</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.freezer_2 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Freezer 2</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.rollz_1 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Rollz 1</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.pancake_1 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Pancake 1</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.pancake_2 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Pancake 2</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.waffle_1 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Waffle 1</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
            {runSheet?.waffle_2 && (
              <View style={styles.col4}>
                <Text style={styles.label}>Waffle 2</Text>
                <Text style={styles.value}>Required</Text>
              </View>
            )}
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Event Info - Issues - Problems</Text>
          <View style={styles.notesBox}>
            <Text>{runSheet?.notes || 'No additional notes.'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
