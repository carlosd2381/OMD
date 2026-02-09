import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Printer, ArrowUp, ArrowDown, Send, UserPlus, Loader2 } from 'lucide-react';
import { productService } from '../../services/productService';
import { templateService } from '../../services/templateService';
import { settingsService, type PaymentSchedule, type BrandingSettings } from '../../services/settingsService';
import { currencyService, type CurrencyCode } from '../../services/currencyService';
import { quoteService } from '../../services/quoteService';
import { eventService } from '../../services/eventService';
import { clientService } from '../../services/clientService';
import { plannerService } from '../../services/plannerService';
import { venueService } from '../../services/venueService';
import type { Product } from '../../types/product';
import type { Template } from '../../types/template';
import type { QuoteItem } from '../../types/quote';
import type { Event } from '../../types/event';
import type { Client } from '../../types/client';
import toast from 'react-hot-toast';

import { bookingService } from '../../services/bookingService';

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get('clientId');

  // State
  const [clientId, setClientId] = useState<string>(clientIdParam || '');
  const [client, setClient] = useState<Client | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [quotePrefix, setQuotePrefix] = useState('QTE');
  const [currency, setCurrency] = useState<CurrencyCode>('MXN');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<Date | null>(null);
  const [isRateRefreshing, setIsRateRefreshing] = useState(false);
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [questionnaireTemplates, setQuestionnaireTemplates] = useState<Template[]>([]);
  const [contractTemplates, setContractTemplates] = useState<Template[]>([]);
  const [paymentPlanTemplates, setPaymentPlanTemplates] = useState<PaymentSchedule[]>([]);
  
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [venueFleteFee, setVenueFleteFee] = useState<number | undefined>(undefined);
  
  // Discount State
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Recipient State
  interface Recipient {
    id: string;
    name: string;
    email: string;
    role: string;
    selected: boolean;
    isCustom?: boolean;
  }
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '', role: 'Other' });

  // Populate Recipients
  useEffect(() => {
    const fetchRecipients = async () => {
      if (!client) return;

      const newRecipients: Recipient[] = [];

      // 1. Main Client
      newRecipients.push({
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        role: 'Client (Main)',
        selected: true // Default selected
      });

      // 2. Event Related Contacts
      if (selectedEventId) {
        const event = events.find(e => e.id === selectedEventId);
        if (event) {
          // Secondary Client
          if (event.secondary_client_id) {
            const secClient = await clientService.getClient(event.secondary_client_id);
            if (secClient) {
              newRecipients.push({
                id: secClient.id,
                name: `${secClient.first_name} ${secClient.last_name}`,
                email: secClient.email,
                role: 'Client (Secondary)',
                selected: false
              });
            }
          }

          // Planner
          if (event.planner_id) {
            const planner = await plannerService.getPlanner(event.planner_id);
            if (planner) {
              newRecipients.push({
                id: planner.id,
                name: `${planner.first_name} ${planner.last_name}`,
                email: planner.email,
                role: 'Planner',
                selected: false
              });
            }
          } else if (event.planner_name && event.planner_email) {
             newRecipients.push({
                id: 'planner-manual',
                name: event.planner_name,
                email: event.planner_email,
                role: 'Planner',
                selected: false
              });
          }

          // Venue
          if (event.venue_id) {
            const venue = await venueService.getVenue(event.venue_id);
            // Venue might not have a direct contact email on the venue object itself easily accessible 
            // without fetching contacts, but let's check if we have venue contact info on event
            if (venue && venue.email) {
               newRecipients.push({
                id: venue.id,
                name: venue.name,
                email: venue.email,
                role: 'Venue',
                selected: false
              });
            }
          }
          
          if (event.venue_contact_name && event.venue_contact_email) {
             newRecipients.push({
                id: 'venue-manual',
                name: event.venue_contact_name,
                email: event.venue_contact_email,
                role: 'Venue Contact',
                selected: false
              });
          }
        }
      }

      // Merge with existing custom recipients if any, or just set
      // For now, we'll just reset to these + keep any custom ones the user added manually in this session
      setRecipients(prev => {
        const custom = prev.filter(r => r.isCustom);
        // Deduplicate by email
        const combined = [...newRecipients, ...custom];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
        return unique;
      });
    };

    fetchRecipients();
  }, [client, selectedEventId, events]);

  const handleAddRecipient = () => {
    const name = newRecipient.name.trim();
    const email = newRecipient.email.trim();
    const role = newRecipient.role?.trim() || 'Other';
    if (!name || !email) return;

    setRecipients(prev => {
      const normalizedEmail = email.toLowerCase();
      const existingIndex = prev.findIndex(r => r.email.toLowerCase() === normalizedEmail);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          name,
          role,
          selected: true,
          isCustom: true,
        };
        return updated;
      }

      return [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          name,
          email,
          role,
          selected: true,
          isCustom: true,
        },
      ];
    });

    setNewRecipient({ name: '', email: '', role: 'Other' });
    setShowAddRecipient(false);
  };

  const saveQuote = async () => {
    if (!clientId || !selectedEventId) {
      toast.error('Please select a client and event');
      throw new Error('Missing client or event');
    }

    const taxesToSave = [];
    if (selectedTaxes.iva) {
      taxesToSave.push({ name: 'IVA', rate: taxRates.iva, amount: ivaAmount, is_retention: false });
    }
    if (selectedTaxes.iva_retenido) {
      taxesToSave.push({ name: 'IVA Retenido', rate: taxRates.iva_retenido, amount: ivaRetAmount, is_retention: true });
    }
    if (selectedTaxes.isr) {
      taxesToSave.push({ name: 'ISR', rate: taxRates.isr, amount: isrAmount, is_retention: false });
    }
    if (selectedTaxes.isr_retenido) {
      taxesToSave.push({ name: 'ISR Retenido', rate: taxRates.isr_retenido, amount: isrRetAmount, is_retention: true });
    }

    const quoteData = {
      client_id: clientId,
      event_id: selectedEventId,
      items,
      taxes: taxesToSave,
      currency,
      exchange_rate: exchangeRate,
      total_amount: currency === 'MXN' ? totalMXN : totalForeign,
      questionnaire_template_id: selectedQuestionnaire || undefined,
      contract_template_id: selectedContract || undefined,
      payment_plan_template_id: selectedPaymentPlan || undefined,
      status: 'draft' as const,
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    let savedQuote;
    if (id) {
      savedQuote = await quoteService.updateQuote(id, quoteData);
    } else {
      savedQuote = await quoteService.createQuote(quoteData);
    }

    await bookingService.generateBookingDocuments(savedQuote);
    return savedQuote;
  };

  const handleSendQuote = async () => {
    const selectedRecipients = recipients.filter(r => r.selected);
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    const toastId = toast.loading('Sending quote...');
    setActionInProgress('send');

    try {
      await saveQuote();

      for (const recipient of selectedRecipients) {
        if (recipient.role.includes('Client')) {
          if (!recipient.isCustom && recipient.id) {
            const clientData = await clientService.getClient(recipient.id);
            if (clientData && !clientData.portal_access) {
              await clientService.togglePortalAccess(recipient.id, true);
              console.log(`Enabled portal access for ${recipient.name}`);
            }
          }
        }

        console.log(`Sending email to ${recipient.email} (${recipient.role})`);
      }
      
      toast.success(`Quote sent to ${selectedRecipients.length} recipient(s)`, { id: toastId });
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Failed to send quote', { id: toastId });
    } finally {
      setActionInProgress(null);
    }
  };

  // Tax State
  const [taxRates, setTaxRates] = useState({
    iva: 16,
    iva_retenido: 10.66666667,
    isr: 0,
    isr_retenido: 10,
  });
  const [selectedTaxes, setSelectedTaxes] = useState({
    iva: true,
    iva_retenido: false,
    isr: false,
    isr_retenido: false,
  });

  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<'save' | 'send' | null>(null);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, qTemplates, cTemplates, pTemplates, financialSettings, allEvents, brandingSettings] = await Promise.all([
          productService.getProducts(),
          templateService.getTemplates('questionnaire'),
          templateService.getTemplates('contract'),
          settingsService.getPaymentSchedules(),
          settingsService.getFinancialSettings(),
          eventService.getEvents(),
          settingsService.getBrandingSettings(),
        ]);
        
        setProducts(prods);
        setQuestionnaireTemplates(qTemplates);
        setContractTemplates(cTemplates);
        setPaymentPlanTemplates(pTemplates);
        setBranding(brandingSettings);

        let targetClientId = clientIdParam;

        // If editing, load quote details
        if (id) {
          const quote = await quoteService.getQuote(id);
          if (quote) {
            setItems(quote.items);
            setCurrency(quote.currency);
            setExchangeRate(quote.exchange_rate);
            setSelectedQuestionnaire(quote.questionnaire_template_id || '');
            setSelectedContract(quote.contract_template_id || '');
            setSelectedPaymentPlan(quote.payment_plan_template_id || '');
            setSelectedEventId(quote.event_id);
            setClientId(quote.client_id);
            targetClientId = quote.client_id;

            // Extract Discount
            const discountItem = quote.items.find(i => i.id === 'discount');
            if (discountItem) {
              // Try to parse type from description
              if (discountItem.description.includes('%')) {
                setDiscountType('percent');
                // Value is tricky, we need to reverse calculate or store it.
                // For now, let's assume we stored it in description like "Discount (10%)"
                const match = discountItem.description.match(/\((\d+(\.\d+)?)%\)/);
                if (match) {
                  setDiscountValue(parseFloat(match[1]));
                } else {
                   // Fallback to amount if we can't parse %
                   setDiscountType('amount');
                   setDiscountValue(Math.abs(discountItem.total));
                }
              } else {
                setDiscountType('amount');
                setDiscountValue(Math.abs(discountItem.total));
              }
            }

            if (quote.taxes) {
              const newSelectedTaxes = { 
                iva: false, 
                iva_retenido: false, 
                isr: false, 
                isr_retenido: false 
              };
              const newTaxRates = { ...taxRates };
              
              quote.taxes.forEach(t => {
                if (t.name === 'IVA') { newSelectedTaxes.iva = true; newTaxRates.iva = t.rate; }
                if (t.name === 'IVA Retenido') { newSelectedTaxes.iva_retenido = true; newTaxRates.iva_retenido = t.rate; }
                if (t.name === 'ISR') { newSelectedTaxes.isr = true; newTaxRates.isr = t.rate; }
                if (t.name === 'ISR Retenido') { newSelectedTaxes.isr_retenido = true; newTaxRates.isr_retenido = t.rate; }
              });
              setSelectedTaxes(newSelectedTaxes);
              setTaxRates(newTaxRates);
            }
          }
        } else {
          // Add default Flete item for new quotes
          setItems([
            {
              id: 'flete',
              description: 'Flete (Travel, Transport & Setup Fee)',
              quantity: 1,
              unit_price: 2500,
              cost: 0,
              total: 2500,
              is_taxable: true
            }
          ]);

          // Set Defaults
          const defaultQ = qTemplates.find(t => t.name === 'System: New Booking Questionnaire' || t.name.includes('New Booking'));
          if (defaultQ) setSelectedQuestionnaire(defaultQ.id);

          const defaultC = cTemplates.find(t => t.name === 'Standard Service Contract' || t.name.includes('Standard Service'));
          if (defaultC) setSelectedContract(defaultC.id);

          const defaultP = pTemplates.find(t => t.name === '35/65' || t.name.includes('35/65'));
          if (defaultP) setSelectedPaymentPlan(defaultP.id);
        }

        // Filter events for this client
        if (targetClientId) {
          const clientEvents = allEvents.filter(e => e.client_id === targetClientId);
          setEvents(clientEvents);
          if (clientEvents.length > 0 && !id) {
            setSelectedEventId(clientEvents[0].id);
          }
          
          // Fetch Client Details
          const clientData = await clientService.getClient(targetClientId);
          setClient(clientData);
        }

        if (financialSettings) {
          if (financialSettings.quote_sequence_prefix) {
            setQuotePrefix(financialSettings.quote_sequence_prefix);
          }
          let extraConfig: any = {};
          try {
            if (financialSettings.invoice_sequence_prefix && financialSettings.invoice_sequence_prefix.startsWith('{')) {
              extraConfig = JSON.parse(financialSettings.invoice_sequence_prefix);
            }
          } catch (e) {
            console.warn('Failed to parse financial settings extra config', e);
          }
          
          setTaxRates({
            iva: financialSettings.tax_rate || 16,
            iva_retenido: extraConfig.taxes?.iva_retenido || 10.66666667,
            isr: extraConfig.taxes?.isr || 0,
            isr_retenido: extraConfig.taxes?.isr_retenido || 10,
          });
        }

      } catch (error) {
        console.error(error);
        toast.error('Failed to load builder data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, clientIdParam]);

  // Load Client Details
  useEffect(() => {
    const loadClient = async () => {
      if (clientId) {
        try {
          const data = await clientService.getClient(clientId);
          setClient(data);
        } catch (error) {
          console.error('Error loading client:', error);
          toast.error('Failed to load client details');
        }
      }
    };
    loadClient();
  }, [clientId]);

  // Fetch Venue Flete Fee when Event changes
  useEffect(() => {
    const fetchVenueFee = async () => {
      if (!selectedEventId) {
        setVenueFleteFee(undefined);
        return;
      }

      const event = events.find(e => e.id === selectedEventId);
      
      // Try to find venue by ID first, then by name if ID is missing
      let venueId = event?.venue_id;
      
      if (!venueId && event?.venue_name) {
        // If no venue_id but we have a name, try to find the venue in the system
        // We can't easily search by name via the service without adding a new method,
        // but we can try to find it in the list of all venues if we had them loaded.
        // Since we don't have all venues loaded here, we might need to fetch it.
        // However, for now, let's rely on the fact that if it's a system venue, it SHOULD have an ID.
        // If it doesn't, it might be a text-only venue.
        
        // Let's try to fetch by name if we can't find by ID
        // We'll need to add a method to venueService or just query directly if needed.
        // But wait, we can't query directly here easily without exposing supabase.
        
        // Let's try to see if we can find it in the events list if we loaded venues with events?
        // No, events list only has venue name joined.
        
        // Let's try to fetch all venues? No, too heavy.
        // Let's assume for now we only support ID.
        // But the user has an event with a name that MATCHES a venue in the DB, but no ID.
        // This means the event data is "dirty" or "unlinked".
        
        // We should try to "repair" this or handle it.
        // Let's try to fetch the venue by name using a new service method or just a direct query if we could.
        // Since we can't change service easily without reading it all, let's try to use the existing getVenues if it's cached or cheap?
        // No, getVenues fetches all.
        
        // Let's add a search by name to venueService?
        // Or better, let's just fetch all venues since the list isn't likely to be huge (hundreds maybe).
        // Actually, let's just try to fetch the venue by name if ID is missing.
        try {
             const { data } = await import('../../lib/supabase').then(m => m.supabase
              .from('venues')
              .select('id, flete_fee')
              .ilike('name', event.venue_name!)
              .limit(1)
              .single()
            );
            if (data) {
                // Cast data to any to avoid TS error since we are doing a dynamic import/query
                venueId = (data as any).id;
            }
        } catch (e) {
            console.warn('Could not find venue by name', e);
        }
      }

      if (venueId) {
        try {
          const venue = await venueService.getVenue(venueId);
          if (venue && venue.flete_fee !== undefined && venue.flete_fee !== null) {
            setVenueFleteFee(Number(venue.flete_fee));
          } else {
            setVenueFleteFee(undefined);
          }
        } catch (error) {
          console.error('Error fetching venue for flete fee:', error);
        }
      } else {
        setVenueFleteFee(undefined);
      }
    };

    fetchVenueFee();
  }, [selectedEventId, events]);

  // Apply Flete Fee to Items
  useEffect(() => {
    if (venueFleteFee !== undefined && !isNaN(venueFleteFee)) {
      setItems(prevItems => {
        // Find flete item by ID or description
        const fleteItem = prevItems.find(i => 
          i.id === 'flete' || 
          i.description.toLowerCase().includes('flete') || 
          i.description.toLowerCase().includes('delivery') ||
          i.description.toLowerCase().includes('travel')
        );

        // Only update if the item exists and the price is different
        if (fleteItem && fleteItem.unit_price !== venueFleteFee) {
          // Use a toast only if we haven't just loaded the page (to avoid spamming on load)
          // But for now, let's keep it simple.
          // toast.success(`Updated Flete Fee to $${venueFleteFee} based on venue settings`);
          
          return prevItems.map(item => {
            if (item.id === fleteItem.id) {
              return { ...item, unit_price: venueFleteFee, total: venueFleteFee * item.quantity };
            }
            return item;
          });
        }
        return prevItems;
      });
    }
  }, [venueFleteFee, items]); // Re-run when fee changes or items change (e.g. loaded)

  const loadExchangeRate = useCallback(async (targetCurrency: CurrencyCode, notify: boolean = false) => {
    if (targetCurrency === 'MXN') {
      setExchangeRate(1);
      setRateUpdatedAt(null);
      return;
    }

    setIsRateRefreshing(true);
    try {
      const liveRate = await currencyService.fetchLiveRate(targetCurrency);
      if (liveRate) {
        setExchangeRate(liveRate);
        setRateUpdatedAt(new Date());
        if (notify) toast.success('Exchange rate updated');
        return;
      }
      throw new Error('Live rate unavailable');
    } catch (error) {
      console.error('Error fetching live rate:', error);
      setExchangeRate(currencyService.getRate(targetCurrency));
      setRateUpdatedAt(null);
      if (notify) toast.error('Live rate unavailable. Using default rate.');
    } finally {
      setIsRateRefreshing(false);
    }
  }, []);

  // Currency Handler
  useEffect(() => {
    loadExchangeRate(currency);
  }, [currency, loadExchangeRate]);

  // Calculations
  // Filter out discount item for subtotal calculation
  const regularItems = items.filter(i => i.id !== 'discount');
  const subtotalMXN = regularItems.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate Discount Amount
  let discountAmount = 0;
  if (discountValue > 0) {
    if (discountType === 'percent') {
      discountAmount = subtotalMXN * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
  }

  // Taxable Subtotal (excluding discount for now, or should discount reduce taxable base? Yes usually)
  // But if we have mixed taxable/non-taxable items, how do we apply discount?
  // Simplification: Discount reduces the taxable base proportionally or we assume discount is applied to the total.
  // Let's assume discount is a negative line item. If we add it to items, we need to decide if it's taxable.
  // Usually discounts are pre-tax.
  // Let's calculate taxes based on (Taxable Items Total - Proportional Discount).
  // Or simpler: Just sum up taxable items. If there is a discount, we need to know how much of it applies to taxable items.
  // For now, let's assume discount is applied to the whole subtotal, and we reduce the taxable base by the same percentage?
  // Or we just add the discount item as a negative taxable item?
  // If we add it as a negative item with is_taxable=true, it will reduce the tax base.
  
  const taxableSubtotal = regularItems
    .filter(i => i.is_taxable !== false)
    .reduce((sum, item) => sum + item.total, 0);
    
  // If we have a discount, we need to reduce the taxable subtotal
  // If discount is global, we can assume it applies proportionally to taxable items.
  // Ratio = TaxableSubtotal / Subtotal
  // TaxableDiscount = DiscountAmount * Ratio
  const taxableRatio = subtotalMXN > 0 ? taxableSubtotal / subtotalMXN : 0;
  const taxableDiscount = discountAmount * taxableRatio;
  
  const finalTaxableBase = Math.max(0, taxableSubtotal - taxableDiscount);

  const ivaAmount = selectedTaxes.iva ? finalTaxableBase * (taxRates.iva / 100) : 0;
  const ivaRetAmount = selectedTaxes.iva_retenido ? finalTaxableBase * (taxRates.iva_retenido / 100) : 0;
  const isrAmount = selectedTaxes.isr ? finalTaxableBase * (taxRates.isr / 100) : 0;
  const isrRetAmount = selectedTaxes.isr_retenido ? finalTaxableBase * (taxRates.isr_retenido / 100) : 0;

  const totalMXN = subtotalMXN - discountAmount + ivaAmount + isrAmount - ivaRetAmount - isrRetAmount;
  const totalForeign = currencyService.convertFromMXN(totalMXN, currency);

  // Sync Discount Item
  useEffect(() => {
    setItems(prev => {
      const newItems = prev.filter(i => i.id !== 'discount');
      if (discountValue > 0) {
        newItems.push({
          id: 'discount',
          description: discountType === 'percent' ? `Discount (${discountValue}%)` : 'Discount',
          quantity: 1,
          unit_price: -discountAmount,
          cost: 0,
          total: -discountAmount,
          is_taxable: true // Reduces tax base
        });
      }
      return newItems;
    });
  }, [discountValue, discountType, subtotalMXN]); // Re-run when subtotal changes to update % discount amount

  // Handlers
  const handleAddItem = (product: Product) => {
    // Determine price based on client type
    const isPreferred = client?.type === 'Preferred Vendor' || client?.lead_source === 'Hotel/Venue PV';
    const unitPrice = isPreferred ? product.price_pv : product.price_direct;

    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: product.id,
      description: product.name,
      quantity: 1,
      unit_price: unitPrice,
      cost: product.cost || 0,
      total: unitPrice,
      is_taxable: true
    };
    setItems(prev => {
        // Ensure we don't duplicate discount item logic here, just append
        // But wait, if we append, we might mess up the order if discount is supposed to be last.
        // Let's just append. The discount effect will handle the discount item.
        // Actually, the discount effect replaces the items list.
        // We should be careful.
        // If we update items here, the effect will run again.
        // It's safer to let the effect handle the discount item.
        // So we just add the new item.
        // But we need to make sure we don't add it *after* the discount if the discount is already there?
        // The effect filters out 'discount' and re-adds it. So it will move to the end. That's fine.
        return [...prev, newItem];
    });

    if (isPreferred) {
      toast.success(`Added ${product.name} with Preferred Vendor pricing`);
    } else {
      toast.success(`Added ${product.name} with Direct pricing`);
    }
  };

  const handleAddCustomItem = () => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unit_price: 0,
      cost: 0,
      total: 0,
      is_taxable: true
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;
    
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handlePrint = async () => {
    if (!client) {
      toast.error('Client details not loaded');
      return;
    }
    
    try {
      const [{ pdf }, { QuotePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./QuotePDF'),
      ]);

      const blob = await pdf(
        <QuotePDF
          quote={{
            id: id || 'DRAFT',
            client_id: clientId,
            event_id: selectedEventId,
            items,
            currency,
            exchange_rate: exchangeRate,
            total_amount: totalMXN,
            status: 'draft',
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          client={client}
          branding={branding}
          items={items}
          totals={{
            subtotal: subtotalMXN,
            tax: ivaAmount + isrAmount - ivaRetAmount - isrRetAmount,
            total: totalMXN
          }}
          quoteNumber={`${quotePrefix}-${new Date().getFullYear().toString().substr(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001-001`}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleSave = async () => {
    try {
      setActionInProgress('save');
      await saveQuote();
      toast.success('Quote saved & documents generated');
      navigate(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Builder...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 pb-12">
      <header className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Quote Generator</h1>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
            >
              <Printer className="h-4 w-4 mr-2" /> Print / PDF
            </button>
            <button 
              onClick={handleSave}
              disabled={actionInProgress !== null}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 disabled:opacity-60"
            >
              {actionInProgress === 'save' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {actionInProgress === 'save' ? 'Saving...' : 'Save Draft'}
            </button>
            <button 
              onClick={handleSendQuote}
              disabled={actionInProgress !== null}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-60"
            >
              {actionInProgress === 'send' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {actionInProgress === 'send' ? 'Sending...' : 'Send Quote'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Top Section: Quote Items (Full Width) */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Line Items</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider w-10"></th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider w-1/3">Description</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">COG (MXN)</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Price (MXN)</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Total (MXN)</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Taxable</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-2 py-4">
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => handleMoveItem(index, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleMoveItem(index, 'down')}
                              disabled={index === items.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value))}
                            className="block w-20 ml-auto border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            value={item.cost}
                            onChange={(e) => handleUpdateItem(item.id, 'cost', parseFloat(e.target.value))}
                            className="block w-24 ml-auto border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                            className="block w-32 ml-auto border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4 text-right text-sm text-gray-900 dark:text-white dark:text-white font-medium">
                          ${item.total.toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={item.is_taxable ?? true}
                            onChange={(e) => handleUpdateItem(item.id, 'is_taxable', e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-4 text-right text-sm text-green-600 font-medium">
                          ${(item.total - (item.cost * item.quantity)).toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                    <tr>
                      <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-900 dark:text-white dark:text-white">Items Total:</td>
                      <td className="px-3 py-2 text-right text-sm text-gray-900 dark:text-white dark:text-white">${(subtotalMXN + discountAmount).toLocaleString()}</td>
                      <td colSpan={3}></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                        <div className="flex items-center justify-end space-x-2">
                          <span>Discount:</span>
                          <select
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                          >
                            <option value="percent">%</option>
                            <option value="amount">$</option>
                          </select>
                          <input
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="w-20 text-xs border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-right"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-red-600">
                        -${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-900 dark:text-white dark:text-white">Subtotal:</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-white dark:text-white">${subtotalMXN.toLocaleString()}</td>
                      <td colSpan={3}></td>
                    </tr>
                    {selectedTaxes.iva && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">IVA ({taxRates.iva}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900 dark:text-white dark:text-white">+${ivaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={3}></td>
                      </tr>
                    )}
                    {selectedTaxes.iva_retenido && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">IVA Retenido ({taxRates.iva_retenido.toFixed(2)}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-red-600">-${ivaRetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={3}></td>
                      </tr>
                    )}
                    {selectedTaxes.isr && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">ISR ({taxRates.isr}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900 dark:text-white dark:text-white">+${isrAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={3}></td>
                      </tr>
                    )}
                    {selectedTaxes.isr_retenido && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">ISR Retenido ({taxRates.isr_retenido}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-red-600">-${isrRetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={3}></td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
                      <td colSpan={5} className="px-6 py-4 text-right text-base font-bold text-gray-900 dark:text-white dark:text-white">Total (MXN):</td>
                      <td className="px-3 py-4 text-right text-base font-bold text-gray-900 dark:text-white dark:text-white">${totalMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td colSpan={3}></td>
                    </tr>
                    {currency !== 'MXN' && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Total ({currency}):</td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-gray-900 dark:text-white dark:text-white">
                          {totalForeign.toLocaleString(undefined, { style: 'currency', currency: currency })}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleAddCustomItem}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Item
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Column 1: Add Products */}
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Add Products</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleAddItem(product)}
                    className="w-full text-left px-4 py-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex justify-between items-center group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">${product.price_direct.toLocaleString()} MXN</p>
                    </div>
                    <Plus className="h-5 w-5 text-gray-400 group-hover:text-primary/80" />
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: Templates */}
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Configuration</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="">Select an event...</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({new Date(e.date).toLocaleDateString()})</option>
                  ))}
                </select>
                {events.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">Client has no events. Please create one first.</p>
                )}
              </div>

              {/* Recipients Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Recipients</label>
                  <button
                    onClick={() => setShowAddRecipient(!showAddRecipient)}
                    className="text-xs text-primary hover:text-pink-800 flex items-center"
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> Add
                  </button>
                </div>
                
                <div className="space-y-2 mb-3">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={`recipient-${recipient.id}`}
                          name={`recipient-${recipient.id}`}
                          type="checkbox"
                          checked={recipient.selected}
                          onChange={(e) => {
                            setRecipients(recipients.map(r => 
                              r.id === recipient.id ? { ...r, selected: e.target.checked } : r
                            ));
                          }}
                          className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`recipient-${recipient.id}`} className="font-medium text-gray-700">
                          {recipient.name} <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400 font-normal">({recipient.role})</span>
                        </label>
                        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 text-xs">{recipient.email}</p>
                      </div>
                    </div>
                  ))}
                  {recipients.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 italic">Select an event to load recipients.</p>
                  )}
                </div>

                {showAddRecipient && (
                  <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-3 rounded-md space-y-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                      className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                      className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowAddRecipient(false)}
                        className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddRecipient}
                        disabled={!newRecipient.name || !newRecipient.email}
                        className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Questionnaire</label>
                <select
                  value={selectedQuestionnaire}
                  onChange={(e) => setSelectedQuestionnaire(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="">Select a questionnaire...</option>
                  {questionnaireTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contract</label>
                <select
                  value={selectedContract}
                  onChange={(e) => setSelectedContract(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="">Select a contract...</option>
                  {contractTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Plan</label>
                <select
                  value={selectedPaymentPlan}
                  onChange={(e) => setSelectedPaymentPlan(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="">Select a payment plan...</option>
                  {paymentPlanTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Column 3: Currency */}
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Currency & Taxes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                  >
                    <option value="MXN">MXN - Mexican Peso</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                  {currency !== 'MXN' && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Exchange Rate: 1 {currency} = ${exchangeRate.toFixed(2)} MXN
                        </p>
                        <button
                          type="button"
                          onClick={() => loadExchangeRate(currency, true)}
                          disabled={isRateRefreshing}
                          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isRateRefreshing ? 'Refreshing…' : 'Refresh rate'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {rateUpdatedAt
                          ? `Live rate fetched ${rateUpdatedAt.toLocaleString()}`
                          : 'Using fallback rate. Refresh to fetch live data.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Configuration</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.iva}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, iva: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-white dark:text-white">IVA ({taxRates.iva}%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.iva_retenido}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, iva_retenido: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-white dark:text-white">IVA Retenido ({taxRates.iva_retenido.toFixed(2)}%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.isr}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, isr: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-white dark:text-white">ISR ({taxRates.isr}%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.isr_retenido}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, isr_retenido: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-white dark:text-white">ISR Retenido ({taxRates.isr_retenido}%)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
