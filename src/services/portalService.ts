import { quoteService } from './quoteService';
import { questionnaireService } from './questionnaireService';
import { contractService } from './contractService';
import { invoiceService } from './invoiceService';
import { reviewService } from './reviewService';
import type { SignatureMetadata } from '../types/contract';

export const portalService = {
  getPortalStatus: async (clientId: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const [quotes, questionnaires, contracts, invoices, reviews] = await Promise.all([
      quoteService.getQuotesByClient(clientId),
      questionnaireService.getQuestionnairesByClient(clientId),
      contractService.getContractsByClient(clientId),
      invoiceService.getInvoicesByClient(clientId),
      reviewService.getReviewsByClient(clientId),
    ]);

    // For the portal, we typically show the "active" or latest one
    // In a real app, we might have logic to pick the specific one related to the active event
    return {
      quotes,
      questionnaires,
      contracts,
      invoices,
      reviews,
      quote: quotes[0],
      questionnaire: questionnaires[0],
      contract: contracts[0],
      invoice: invoices[0],
      review: reviews[0],
    };
  },

  // Actions to simulate flow
  acceptQuote: async (quoteId: string) => {
    return quoteService.updateQuoteStatus(quoteId, 'accepted');
  },

  completeQuestionnaire: async (id: string) => {
    return questionnaireService.updateStatus(id, 'completed');
  },

  signContract: async (id: string, signedBy?: string, metadata?: SignatureMetadata) => {
    return contractService.updateStatus(id, 'signed', signedBy, metadata);
  },

  payInvoice: async (id: string) => {
    return invoiceService.updateStatus(id, 'paid');
  },

  resetPortalData: async (clientId: string) => {
    const status = await portalService.getPortalStatus(clientId);
    
    const promises = [];
    if (status.quote) promises.push(quoteService.updateQuoteStatus(status.quote.id, 'sent'));
    if (status.questionnaire) promises.push(questionnaireService.updateStatus(status.questionnaire.id, 'pending'));
    if (status.contract) promises.push(contractService.updateStatus(status.contract.id, 'sent'));
    if (status.invoice) promises.push(invoiceService.updateStatus(status.invoice.id, 'sent'));
    
    await Promise.all(promises);
  },
};
