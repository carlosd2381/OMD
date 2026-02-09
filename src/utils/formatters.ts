const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const padSequence = (value: string | number | undefined, size = 2) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value).padStart(size, '0');
  }

  if (typeof value === 'string') {
    const numeric = parseInt(value, 10);
    if (!Number.isNaN(numeric)) {
      return String(numeric).padStart(size, '0');
    }
    return value.padStart(size, '0');
  }

  return String(value ?? '').padStart(size, '0');
};

export const parseDateInput = (value: string): Date => {
  if (!value) return new Date();
  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }
  return new Date(value);
};

export const formatDocumentID = (
  prefix: 'QT' | 'INV' | 'CON' | 'QST',
  eventDate: string,
  eventNumber: string | number = 1,
  documentNumber: string | number = 1
): string => {
  if (!eventDate) {
    return `${prefix}-UNKNOWN-${padSequence(eventNumber)}-${padSequence(documentNumber)}`;
  }

  const date = parseDateInput(eventDate);
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${prefix}-${yy}${mm}${dd}-${padSequence(eventNumber)}-${padSequence(documentNumber)}`;
};

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it matches the pattern for Mexico numbers (assuming 10 digits + optional country code)
  // Case 1: 12 digits starting with 52 (e.g. 529982217621)
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    const areaCode = cleaned.substring(2, 5);
    const numberPart1 = cleaned.substring(5, 8);
    const numberPart2 = cleaned.substring(8, 12);
    return `+52 (${areaCode}) ${numberPart1}-${numberPart2}`;
  }
  
  // Case 2: 10 digits (e.g. 9982217621) - Assume Mexico +52
  if (cleaned.length === 10) {
    const areaCode = cleaned.substring(0, 3);
    const numberPart1 = cleaned.substring(3, 6);
    const numberPart2 = cleaned.substring(6, 10);
    return `+52 (${areaCode}) ${numberPart1}-${numberPart2}`;
  }

  // Case 3: US/Canada 11 digits starting with 1 (e.g. 15551234567)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.substring(1, 4);
    const numberPart1 = cleaned.substring(4, 7);
    const numberPart2 = cleaned.substring(7, 11);
    return `+1 (${areaCode}) ${numberPart1}-${numberPart2}`;
  }

  // Fallback: Return original if it doesn't match expected patterns
  return phone;
};
