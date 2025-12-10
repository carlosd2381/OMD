import { quoteService } from './quoteService';
import { questionnaireService } from './questionnaireService';
import { contractService } from './contractService';
import { invoiceService } from './invoiceService';
import { reviewService } from './reviewService';

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

  signContract: async (id: string) => {
    return contractService.updateStatus(id, 'signed');
  },

  payInvoice: async (id: string) => {
    return invoiceService.updateStatus(id, 'paid');
  },
};
