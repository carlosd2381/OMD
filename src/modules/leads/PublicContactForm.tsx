import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { settingsService } from '../../services/settingsService';
import { leadService } from '../../services/leadService';
import { venueService } from '../../services/venueService';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle } from 'lucide-react';

const VENUE_LABEL_REGEX = /\bvenue\b/i;
const OTHER_VENUE_VALUE = '__other_venue__';
const OTHER_VENUE_LABEL = 'Add my venue';

const isVenueFieldLabel = (label?: string) => Boolean(label && VENUE_LABEL_REGEX.test(label));
const normalizeLabel = (label?: string) => (label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const createAliasList = (labels: string[]) => labels.map(normalizeLabel).filter(Boolean);
const FIELD_ALIASES = {
  fullName: createAliasList(['Full Name', 'Name']),
  firstName: createAliasList(['First Name', 'Given Name', 'Primary Contact First Name']),
  lastName: createAliasList(['Last Name', 'Surname', 'Primary Contact Last Name']),
  email: createAliasList(['Email', 'Email Address']),
  phone: createAliasList(['Phone', 'Phone Number', 'Phone #', 'Phone No', 'Mobile', 'Mobile Phone']),
  eventType: createAliasList(['Event Type', 'Type of Event']),
  eventDate: createAliasList(['Event Date', 'Date of Event', 'Event Day']),
  guestCount: createAliasList(['Guest Count', 'Guests', 'Estimated Guest Count', 'Approximate Guest Count', 'Number of Guests']),
  services: createAliasList(['Services Interested', 'Services', 'What services are you interested in?']),
  leadSource: createAliasList(['Lead Source', 'How did you hear about us?', 'How did you find us?', 'Referral Source']),
  role: createAliasList(['Role', 'I am the', 'Relationship to Event']),
  budget: createAliasList(['Budget', 'Estimated Budget', 'Event Budget', 'Spend']),
  notes: createAliasList(['Message', 'Notes', 'Anything else', 'Details', 'Additional Info'])
} as const;

const toTrimmedString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const str = typeof value === 'string' ? value : String(value);
  const trimmed = str.trim();
  return trimmed.length ? trimmed : undefined;
};

const parseIntegerValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  const match = String(value).match(/[-+]?[\d,]+/);
  if (!match) return undefined;
  const parsed = parseInt(match[0].replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseCurrencyValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const match = String(value).match(/[-+]?[\d.,]+/);
  if (!match) return undefined;
  const parsed = parseFloat(match[0].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeServices = (value: unknown): string[] => {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => toTrimmedString(item))
      .filter((item): item is string => Boolean(item));
  }
  const text = toTrimmedString(value);
  if (!text) return [];
  return text
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export default function PublicLeadForm() {
  const { formId } = useParams<{ formId: string }>();
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [venueOptions, setVenueOptions] = useState<{ preferred: string[]; others: string[] }>({ preferred: [], others: [] });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formId) {
      loadFormConfig();
    }
  }, [formId]);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadFormConfig = async () => {
    try {
      const forms = await settingsService.getContactForms();
      const form = forms.find((f: any) => f.id === formId);
      if (form) {
        setFormConfig(form);
      } else {
        toast.error('Form not found');
      }
    } catch (error) {
      console.error('Error loading form:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    try {
      const venues = await venueService.getVenues();
      const preferred = venues
        .filter((venue) => venue.is_preferred)
        .map((venue) => venue.name)
        .sort((a, b) => a.localeCompare(b));
      const others = venues
        .filter((venue) => !venue.is_preferred)
        .map((venue) => venue.name)
        .sort((a, b) => a.localeCompare(b));
      setVenueOptions({ preferred, others });
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const handleSelectChange = (field: any, value: string) => {
    setFormData((prev) => ({ ...prev, [field.label]: value }));
    if (value !== OTHER_VENUE_VALUE) {
      setCustomFieldValues((prev) => {
        if (!(field.id in prev)) return prev;
        const next = { ...prev };
        delete next[field.id];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fields = formConfig?.fields || [];
      const fieldMap = new Map<string, any>();
      const normalizedFields: { field: any; normalizedLabel: string }[] = fields.map((field: any) => {
        if (field?.label) {
          fieldMap.set(field.label, field);
        }
        return {
          field,
          normalizedLabel: normalizeLabel(field.label)
        };
      });

      const lookupField = (aliases: string[]) => {
        for (const alias of aliases) {
          const exact = normalizedFields.find((entry) => entry.normalizedLabel === alias);
          if (exact) {
            return { field: exact.field, value: formData[exact.field.label] };
          }
        }
        for (const alias of aliases) {
          if (alias.length < 4) continue;
          const fuzzy = normalizedFields.find((entry) => entry.normalizedLabel.includes(alias));
          if (fuzzy) {
            return { field: fuzzy.field, value: formData[fuzzy.field.label] };
          }
        }
        return { field: undefined, value: undefined };
      };

      const { value: fullNameValue } = lookupField(FIELD_ALIASES.fullName);
      const fullNameParts = toTrimmedString(fullNameValue)?.split(/\s+/) || [];
      const { value: firstNameValue } = lookupField(FIELD_ALIASES.firstName);
      const { value: lastNameValue } = lookupField(FIELD_ALIASES.lastName);

      const leadFirstName = toTrimmedString(firstNameValue) || fullNameParts[0] || 'Inquiry';
      const leadLastName = toTrimmedString(lastNameValue) || fullNameParts.slice(1).join(' ') || 'From Web';

      const emailValue = toTrimmedString(lookupField(FIELD_ALIASES.email).value) || '';
      const phoneValue = toTrimmedString(lookupField(FIELD_ALIASES.phone).value) || '';
      const eventTypeValue = toTrimmedString(lookupField(FIELD_ALIASES.eventType).value);
      const eventDateValue = toTrimmedString(lookupField(FIELD_ALIASES.eventDate).value);
      const guestCountValue = lookupField(FIELD_ALIASES.guestCount).value;
      const roleValue = toTrimmedString(lookupField(FIELD_ALIASES.role).value);
      const budgetValue = lookupField(FIELD_ALIASES.budget).value;
      const leadSourceValue = toTrimmedString(lookupField(FIELD_ALIASES.leadSource).value);
      const servicesValue = lookupField(FIELD_ALIASES.services).value ?? formData['Services Interested'];

      const guest_count = parseIntegerValue(guestCountValue);
      const budget = parseCurrencyValue(budgetValue);
      const services_interested = normalizeServices(servicesValue);
      const resolvedLeadSource = leadSourceValue || 'Website';

      const venueField = fields.find((field: any) => field?.type === 'select' && isVenueFieldLabel(field.label));
      const venueSelectionLabel = venueField?.label;
      const venueSelectionValue = venueSelectionLabel ? formData[venueSelectionLabel] : undefined;
      const venueCustomValue = venueField ? customFieldValues[venueField.id]?.trim() : '';
      const venueFromOtherField = formData['Venue'] || formData['Venue Name'];
      const resolvedVenueName = venueSelectionValue === OTHER_VENUE_VALUE
        ? venueCustomValue || undefined
        : venueSelectionValue || venueFromOtherField || undefined;

      // Map form fields to lead fields
      // This is a simplified mapping. In a real app, you'd want to map specific field IDs 
      // or labels to the core lead entity fields.
      const leadData: any = {
        first_name: leadFirstName,
        last_name: leadLastName,
        email: emailValue,
        phone: phoneValue,
        role: roleValue,
        event_type: eventTypeValue || undefined,
        event_date: eventDateValue || undefined,
        guest_count,
        budget,
        venue_name: resolvedVenueName,
        services_interested,
        notes: Object.entries(formData)
          .map(([label, value]) => {
            const field = fieldMap.get(label);
            const displayValue = value === OTHER_VENUE_VALUE && field
              ? (customFieldValues[field.id]?.trim() || 'Other (not listed)')
              : value;
            return `${label}: ${Array.isArray(displayValue) ? displayValue.join(', ') : displayValue}`;
          })
          .join('\n'),
        lead_source: resolvedLeadSource,
        status: 'New'
      };

      await leadService.createLead(leadData);
      setSubmitted(true);
      
        if (formConfig?.settings?.successAction === 'redirect' && formConfig?.settings?.redirectUrl) {
          setTimeout(() => {
            window.location.href = formConfig.settings.redirectUrl;
          }, 2000);
          return;
        }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="p-8 text-center text-gray-500">
        Form not found or unavailable.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
            {formConfig.settings?.successMessage || 'Thank you!'}
        </h2>
        <p className="text-gray-600">
            Your inquiry has been received. We will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {formConfig.name}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {formConfig.fields.map((field: any) => {
          const isVenueSelect = field.type === 'select' && isVenueFieldLabel(field.label);
          const showCustomVenueInput = isVenueSelect && formData[field.label] === OTHER_VENUE_VALUE;

          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {field.type === 'textarea' ? (
              <textarea
                required={field.required}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                rows={4}
                onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
              />
            ) : field.type === 'select' ? (
              <>
                <select
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  onChange={(e) => handleSelectChange(field, e.target.value)}
                  value={formData[field.label] || ''}
                >
                  <option value="">Select an option...</option>
                  {isVenueSelect ? (
                    <>
                      {venueOptions.preferred.length > 0 && (
                        <optgroup label="Preferred Venues">
                          {venueOptions.preferred.map((name) => (
                            <option key={`preferred-${name}`} value={name}>{name}</option>
                          ))}
                        </optgroup>
                      )}
                      {venueOptions.others.length > 0 && (
                        <optgroup label="Other Venues">
                          {venueOptions.others.map((name) => (
                            <option key={`other-${name}`} value={name}>{name}</option>
                          ))}
                        </optgroup>
                      )}
                      <option value={OTHER_VENUE_VALUE}>{OTHER_VENUE_LABEL}</option>
                    </>
                  ) : (
                    field.options?.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))
                  )}
                </select>
                {showCustomVenueInput && (
                  <input
                    type="text"
                    required={field.required && showCustomVenueInput}
                    placeholder="Enter your venue name"
                    className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    value={customFieldValues[field.id] || ''}
                    onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                )}
              </>
            ) : field.type === 'multiselect' ? (
              <div className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                {field.options?.map((opt: string) => (
                  <label key={opt} className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      onChange={(e) => {
                        const current = formData[field.label] || [];
                        const updated = e.target.checked 
                          ? [...current, opt]
                          : current.filter((item: string) => item !== opt);
                        setFormData({ ...formData, [field.label]: updated });
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type={field.type === 'multiselect' ? 'text' : field.type}
                required={field.required}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
              />
            )}
            </div>
          );
        })}
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Send Message'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
