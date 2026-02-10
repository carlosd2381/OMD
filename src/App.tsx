import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import { BrandingProvider } from './contexts/BrandingContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

const AuthLayout = lazy(() => import('./modules/auth/AuthLayout'));
const LoginPage = lazy(() => import('./modules/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./modules/auth/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('./modules/auth/UpdatePasswordPage'));

const MainLayout = lazy(() => import('./components/layout/MainLayout'));
const Dashboard = lazy(() => import('./modules/dashboard/Dashboard'));
const Calendar = lazy(() => import('./modules/calendar/Calendar'));
const TaskList = lazy(() => import('./modules/tasks/TaskList'));
const MessagesPage = lazy(() => import('./modules/messages/MessagesPage'));

const ClientPortal = lazy(() => import('./modules/portal/ClientPortal'));
const PublicContactForm = lazy(() => import('./modules/leads/PublicContactForm'));

const ClientList = lazy(() => import('./modules/clients/ClientList'));
const ClientForm = lazy(() => import('./modules/clients/ClientForm'));
const ClientDetails = lazy(() => import('./modules/clients/ClientDetails'));

const VenueList = lazy(() => import('./modules/venues/VenueList'));
const VenueForm = lazy(() => import('./modules/venues/VenueForm'));
const VenueDetails = lazy(() => import('./modules/venues/VenueDetails'));

const PlannerList = lazy(() => import('./modules/planners/PlannerList'));
const PlannerForm = lazy(() => import('./modules/planners/PlannerForm'));
const PlannerDetails = lazy(() => import('./modules/planners/PlannerDetails'));

const LeadList = lazy(() => import('./modules/leads/LeadList'));
const LeadForm = lazy(() => import('./modules/leads/LeadForm'));
const LeadDetails = lazy(() => import('./modules/leads/LeadDetails'));

const EventList = lazy(() => import('./modules/events/EventList'));
const EventForm = lazy(() => import('./modules/events/EventForm'));
const EventDetails = lazy(() => import('./modules/events/EventDetails'));
const BookingQuestionnaire = lazy(() => import('./modules/questionnaires/BookingQuestionnaire'));

const QuoteBuilder = lazy(() => import('./modules/quotes/QuoteBuilder'));
const QuoteViewer = lazy(() => import('./modules/quotes/QuoteViewer'));
const ContractViewer = lazy(() => import('./modules/contracts/ContractViewer'));
const InvoiceViewer = lazy(() => import('./modules/invoices/InvoiceViewer'));
const QuestionnaireViewer = lazy(() => import('./modules/questionnaires/QuestionnaireViewer'));

const ProductList = lazy(() => import('./modules/products/ProductList'));

const StaffList = lazy(() => import('./modules/staff/StaffList'));
const StaffProfileDetails = lazy(() => import('./modules/staff/StaffProfileDetails'));
const PayrollList = lazy(() => import('./modules/payroll/PayrollList'));
const PayrollRunDetails = lazy(() => import('./modules/payroll/PayrollRunDetails'));

const SettingsPage = lazy(() => import('./modules/settings/SettingsPage'));
const CompanySettings = lazy(() => import('./modules/settings/CompanySettings'));
const BrandingSettings = lazy(() => import('./modules/settings/BrandingSettings'));
const DeliverySettings = lazy(() => import('./modules/settings/DeliverySettings'));
const CalendarSettings = lazy(() => import('./modules/settings/CalendarSettings'));
const FinancialSettings = lazy(() => import('./modules/settings/FinancialSettings'));
const PaymentMethodSettings = lazy(() => import('./modules/settings/PaymentMethodSettings'));
const PaymentScheduleSettings = lazy(() => import('./modules/settings/PaymentScheduleSettings'));
const ContactFormSettings = lazy(() => import('./modules/settings/ContactFormSettings'));
const ExpenseCategorySettings = lazy(() => import('./modules/settings/ExpenseCategorySettings'));
const UserManagementSettings = lazy(() => import('./modules/settings/UserManagementSettings'));
const RolesPermissionsSettings = lazy(() => import('./modules/settings/RolesPermissionsSettings'));
const TokenManagementSettings = lazy(() => import('./modules/settings/TokenManagementSettings'));
const TemplateSettings = lazy(() => import('./modules/settings/TemplateSettings'));
const EmailMessagingSettings = lazy(() => import('./modules/settings/EmailMessagingSettings'));
const AutomationSettings = lazy(() => import('./modules/settings/AutomationSettings'));

function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <ConfirmProvider>
          <Router>
            <Toaster position="top-right" />
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading...</div>}>
            <Routes>
            {/* Public/External Routes */}
            <Route path="/portal/:clientId" element={<ClientPortal />} />
            <Route path="/forms/:formId" element={<PublicContactForm />} />

          {/* Auth Routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="update-password" element={<UpdatePasswordPage />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="messages" element={<MessagesPage />} />
          <Route path="staff">
            <Route index element={<StaffList />} />
            <Route path=":id" element={<StaffProfileDetails />} />
          </Route>
          <Route path="payroll">
            <Route index element={<PayrollList />} />
            <Route path=":id" element={<PayrollRunDetails />} />
          </Route>
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
            <Route path=":eventId/questionnaire" element={<BookingQuestionnaire />} />
          </Route>
          <Route path="calendar" element={<Calendar />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="quotes">
            <Route path="new" element={<QuoteBuilder />} />
            <Route path=":id" element={<QuoteViewer />} />
            <Route path=":id/edit" element={<QuoteBuilder />} />
          </Route>
          <Route path="contracts/:id" element={<ContractViewer />} />
          <Route path="invoices/:id" element={<InvoiceViewer />} />
          <Route path="questionnaires/:id" element={<QuestionnaireViewer />} />
          <Route path="products" element={<ProductList />} />
          <Route path="settings">
            <Route index element={<SettingsPage />} />
            <Route path="company" element={<CompanySettings />} />
            <Route path="branding" element={<BrandingSettings />} />
            <Route path="delivery" element={<DeliverySettings />} />
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
      </Suspense>
      </Router>
      </ConfirmProvider>
    </BrandingProvider>
  </AuthProvider>
  );
}

export default App;
