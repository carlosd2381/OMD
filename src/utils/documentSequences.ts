import type { Event } from '../types/event';
import { formatDocumentID, parseDateInput } from './formatters';

export type DocumentPrefix = 'QT' | 'INV' | 'CON' | 'QST';

export interface DocumentLike {
  id: string;
  event_id?: string | null;
  created_at: string;
}

export function buildEventsMap(events: Event[]): Record<string, Event> {
  return events.reduce<Record<string, Event>>((acc, event) => {
    acc[event.id] = event;
    return acc;
  }, {});
}

export function buildEventSequenceMap(events: Event[]): Record<string, number> {
  const grouped: Record<string, Event[]> = {};

  events.forEach((event) => {
    if (!event.date) return;
    const keyDate = parseDateInput(event.date);
    const key = `${keyDate.getFullYear()}-${String(keyDate.getMonth() + 1).padStart(2, '0')}-${String(keyDate.getDate()).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
  });

  const sequenceMap: Record<string, number> = {};
  Object.values(grouped).forEach((list) => {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    list.forEach((event, index) => {
      sequenceMap[event.id] = index + 1;
    });
  });
  return sequenceMap;
}

export function buildDocSequenceMap<T extends DocumentLike>(items: T[]): Record<string, number> {
  const grouped: Record<string, T[]> = {};

  items.forEach((item) => {
    const key = item.event_id || 'unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const sequenceMap: Record<string, number> = {};
  Object.values(grouped).forEach((list) => {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    list.forEach((item, index) => {
      sequenceMap[item.id] = index + 1;
    });
  });

  return sequenceMap;
}

interface ResolveDocumentIdOptions {
  eventsMap: Record<string, Event>;
  eventSequences: Record<string, number>;
  docSequences: Record<string, number>;
  fallbackEvent?: Event | null;
}

export function resolveDocumentId<T extends DocumentLike>(
  prefix: DocumentPrefix,
  item: T,
  { eventsMap, eventSequences, docSequences, fallbackEvent }: ResolveDocumentIdOptions
): string {
  const eventReference = (item.event_id && eventsMap[item.event_id]) || fallbackEvent || null;
  const eventDate = eventReference?.date || item.created_at;
  const eventSequence = item.event_id
    ? eventSequences[item.event_id] || 1
    : eventReference?.id
      ? eventSequences[eventReference.id] || 1
      : 1;
  const docSequence = docSequences[item.id] || 1;

  return formatDocumentID(prefix, eventDate, eventSequence, docSequence);
}
