import { supabase } from '../lib/supabase';
import { settingsService } from './settingsService';
import { templateService } from './templateService';
import { eventService } from './eventService';
import { clientService } from './clientService';
import { venueService } from './venueService';
import { tokenService } from './tokenService';
import { invoiceService } from './invoiceService';
import type { Quote } from '../types/quote';

export const bookingService = {
  /**
   * Generates all downstream booking documents (Invoices, Contract, Questionnaire)
   * based on the Quote's configuration.
   * 
   * This is idempotent: it checks if documents already exist for this quote_id
   * to avoid duplicates, unless forceRegenerate is true.
   */
  generateBookingDocuments: async (quote: Quote, forceRegenerate = false) => {
    console.log('Generating booking documents for quote:', quote.id);

    try {
      // 1. Generate Invoices (if Payment Plan selected)
      if (quote.payment_plan_template_id) {
        await generateInvoices(quote, forceRegenerate);
      }

      // 2. Generate Contract (if Contract Template selected)
      if (quote.contract_template_id) {
        await generateContract(quote, forceRegenerate);
      }

      // 3. Generate Questionnaire (if Questionnaire Template selected)
      if (quote.questionnaire_template_id) {
        await generateQuestionnaire(quote, forceRegenerate);
      }

      return { success: true };
    } catch (error) {
      console.error('Error generating booking documents:', error);
      throw error;
    }
  }
};

async function generateInvoices(quote: Quote, forceRegenerate: boolean) {
  // Check existing
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('quote_id', quote.id);

  if (count && count > 0 && !forceRegenerate) {
    console.log('Invoices already exist for this quote. Skipping.');
    return;
  }

  if (forceRegenerate && count && count > 0) {
    // Delete existing draft invoices? 
    // Dangerous if some are paid. For now, let's only delete if ALL are draft.
    // Implementation skipped for safety in this iteration.
    console.warn('Force regenerate not fully implemented for invoices to prevent data loss.');
    return;
  }

  // Fetch Payment Schedule
  const schedules = await settingsService.getPaymentSchedules();
  const schedule = schedules.find(s => s.id === quote.payment_plan_template_id);
  
  if (!schedule) {
    console.error('Payment schedule not found');
    return;
  }

  // Fetch Event Date for calculations
  const event = await eventService.getEvent(quote.event_id);
  if (!event) return;
  const eventDate = new Date(event.date);
  const safeRate = quote.exchange_rate && quote.exchange_rate > 0 ? quote.exchange_rate : 1;
  const quoteTotalMXN = quote.currency === 'MXN' ? quote.total_amount : quote.total_amount * safeRate;

  // Calculate Invoices
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoicesToInsert = (schedule.milestones as any[]).map((milestone, index) => {
    let amount = 0;
    
    // Handle structure from PaymentScheduleSettings.tsx
    if (typeof milestone.percentage === 'number') {
      amount = (quoteTotalMXN * milestone.percentage) / 100;
    } 
    // Handle potential alternative structure (future proofing or legacy)
    else if (milestone.type === 'percentage' && milestone.value) {
      amount = (quoteTotalMXN * milestone.value) / 100;
    } else if (milestone.value) {
      amount = milestone.value;
    }

    // Ensure amount is valid
    if (isNaN(amount) || amount === null) {
      console.error('Invalid amount calculated for invoice:', amount, milestone);
      amount = 0;
    }

    // Calculate Due Date
    let dueDate = new Date();
    if (milestone.dueType === 'on_booking') {
      dueDate = new Date(); // Now
    } else if (milestone.dueType === 'before_event') {
      dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - milestone.daysOffset);
    } else if (milestone.dueType === 'after_event') {
      dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() + milestone.daysOffset);
    }

    return {
      client_id: quote.client_id,
      event_id: quote.event_id,
      quote_id: quote.id,
      invoice_number: `${quote.id.slice(0, 4)}-${index + 1}`, // Simple number generation
      items: [{
        id: crypto.randomUUID(),
        description: milestone.name,
        amount: amount
      }],
      total_amount: amount,
      status: 'draft' as const,
      due_date: dueDate.toISOString().split('T')[0],
      type: 'standard' as const // Add default type
    };
  });

  const { error } = await supabase.from('invoices').insert(invoicesToInsert);
  if (error) throw error;
  console.log(`Generated ${invoicesToInsert.length} invoices.`);
}

async function generateContract(quote: Quote, forceRegenerate: boolean) {
  // Check existing
  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('quote_id', quote.id)
    .single();

  if (existing && !forceRegenerate) return;

  // Fetch Template
  const templates = await templateService.getTemplates('contract');
  const template = templates.find(t => t.id === quote.contract_template_id);
  if (!template) return;

  // Fetch Context Data for Token Replacement
  const client = await clientService.getClient(quote.client_id);
  const event = await eventService.getEvent(quote.event_id);
  let venue = undefined;
  if (event?.venue_id) {
    venue = await venueService.getVenue(event.venue_id);
  }
  const invoices = await invoiceService.getInvoicesByQuote(quote.id);

  // Replace Tokens
  const processedContent = await tokenService.replaceTokens(template.content, {
    client: client || undefined,
    event: event || undefined,
    venue: venue || undefined,
    quote: quote,
    invoices
  });

  // Create Contract
  const { error } = await supabase.from('contracts').insert({
    client_id: quote.client_id,
    event_id: quote.event_id,
    quote_id: quote.id,
    template_id: template.id,
    content: processedContent, // Use processed content
    status: 'draft',
    document_version: 1
  });

  if (error) throw error;
  console.log('Generated contract.');
}

async function generateQuestionnaire(quote: Quote, forceRegenerate: boolean) {
  // Check existing
  const { data: existing } = await supabase
    .from('questionnaires')
    .select('id')
    .eq('quote_id', quote.id)
    .single();

  if (existing && !forceRegenerate) return;

  // Fetch Template
  // Note: If it's the system template, we still create a record, but maybe with empty content?
  // The Client Portal will handle the rendering logic based on template_id.
  
  let title = 'Event Questionnaire';
  
  if (quote.questionnaire_template_id !== 'system_booking_questionnaire') {
     const templates = await templateService.getTemplates('questionnaire');
     const template = templates.find(t => t.id === quote.questionnaire_template_id);
     if (template) title = template.name;
  } else {
    title = 'New Booking Questionnaire';
  }

  // Create Questionnaire
  const { error } = await supabase.from('questionnaires').insert({
    client_id: quote.client_id,
    event_id: quote.event_id,
    quote_id: quote.id,
    template_id: quote.questionnaire_template_id,
    title: title,
    status: 'pending'
  });

  if (error) throw error;
  console.log('Generated questionnaire.');
}
