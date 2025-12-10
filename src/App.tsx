import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { Toaster } from 'react-hot-toast';
import ClientList from './modules/clients/ClientList';
import ClientForm from './modules/clients/ClientForm';
import ClientDetails from './modules/clients/ClientDetails';

import VenueList from './modules/venues/VenueList';
import VenueForm from './modules/venues/VenueForm';
import VenueDetails from './modules/venues/VenueDetails';

import PlannerList from './modules/planners/PlannerList';
import PlannerForm from './modules/planners/PlannerForm';
import PlannerDetails from './modules/planners/PlannerDetails';

import LeadList from './modules/leads/LeadList';
import LeadForm from './modules/leads/LeadForm';
import LeadDetails from './modules/leads/LeadDetails';

import EventList from './modules/events/EventList';
import EventForm from './modules/events/EventForm';
import EventDetails from './modules/events/EventDetails';

import SettingsPage from './modules/settings/SettingsPage';
import BrandingSettings from './modules/settings/BrandingSettings';
import CalendarSettings from './modules/settings/CalendarSettings';
import FinancialSettings from './modules/settings/FinancialSettings';
import PaymentMethodSettings from './modules/settings/PaymentMethodSettings';
import PaymentScheduleSettings from './modules/settings/PaymentScheduleSettings';
import ContactFormSettings from './modules/settings/ContactFormSettings';
import ExpenseCategorySettings from './modules/settings/ExpenseCategorySettings';
import UserManagementSettings from './modules/settings/UserManagementSettings';
import RolesPermissionsSettings from './modules/settings/RolesPermissionsSettings';
import TokenManagementSettings from './modules/settings/TokenManagementSettings';
import TemplateSettings from './modules/settings/TemplateSettings';
import EmailMessagingSettings from './modules/settings/EmailMessagingSettings';
import AutomationSettings from './modules/settings/AutomationSettings';
import ClientPortal from './modules/portal/ClientPortal';
import QuoteBuilder from './modules/quotes/QuoteBuilder';
import ProductList from './modules/products/ProductList';

// Placeholder components for routes
const Dashboard = () => <h1 className="text-2xl font-bold">Dashboard</h1>;
const Documents = () => <h1 className="text-2xl font-bold">Documents</h1>;

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public/External Routes */}
        <Route path="/portal/:clientId" element={<ClientPortal />} />

        {/* Admin Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="leads">
            <Route index element={<LeadList />} />
            <Route path="new" element={<LeadForm />} />
            <Route path=":id" element={<LeadDetails />} />
            <Route path=":id/edit" element={<LeadForm />} />
          </Route>
          <Route path="clients">
            <Route index element={<ClientList />} />
            <Route path="new" element={<ClientForm />} />
            <Route path=":id" element={<ClientDetails />} />
            <Route path=":id/edit" element={<ClientForm />} />
          </Route>
          <Route path="venues">
            <Route index element={<VenueList />} />
            <Route path="new" element={<VenueForm />} />
            <Route path=":id" element={<VenueDetails />} />
            <Route path=":id/edit" element={<VenueForm />} />
          </Route>
          <Route path="planners">
            <Route index element={<PlannerList />} />
            <Route path="new" element={<PlannerForm />} />
            <Route path=":id" element={<PlannerDetails />} />
            <Route path=":id/edit" element={<PlannerForm />} />
          </Route>
          <Route path="events">
            <Route index element={<EventList />} />
            <Route path="new" element={<EventForm />} />
            <Route path=":id" element={<EventDetails />} />
            <Route path=":id/edit" element={<EventForm />} />
          </Route>
          <Route path="quotes">
            <Route path="new" element={<QuoteBuilder />} />
            <Route path=":id" element={<QuoteBuilder />} />
            <Route path=":id/edit" element={<QuoteBuilder />} />
          </Route>
          <Route path="products" element={<ProductList />} />
          <Route path="documents/*" element={<Documents />} />
          <Route path="settings">
            <Route index element={<SettingsPage />} />
            <Route path="branding" element={<BrandingSettings />} />
            <Route path="calendar" element={<CalendarSettings />} />
            <Route path="financial" element={<FinancialSettings />} />
            <Route path="payment-methods" element={<PaymentMethodSettings />} />
            <Route path="payment-schedules" element={<PaymentScheduleSettings />} />
            <Route path="contact-forms" element={<ContactFormSettings />} />
            <Route path="expense-categories" element={<ExpenseCategorySettings />} />
            <Route path="user-management" element={<UserManagementSettings />} />
            <Route path="roles-permissions" element={<RolesPermissionsSettings />} />
            <Route path="tokens" element={<TokenManagementSettings />} />
            <Route path="templates" element={<TemplateSettings />} />
            <Route path="email-messaging" element={<EmailMessagingSettings />} />
            <Route path="automations" element={<AutomationSettings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
