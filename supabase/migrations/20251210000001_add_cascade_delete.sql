-- Add ON DELETE CASCADE to foreign keys to allow deletion of clients and events

-- Events -> Clients
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_client_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Questionnaires -> Clients & Events
ALTER TABLE questionnaires DROP CONSTRAINT IF EXISTS questionnaires_client_id_fkey;
ALTER TABLE questionnaires ADD CONSTRAINT questionnaires_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE questionnaires DROP CONSTRAINT IF EXISTS questionnaires_event_id_fkey;
ALTER TABLE questionnaires ADD CONSTRAINT questionnaires_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Contracts -> Clients & Events
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_client_id_fkey;
ALTER TABLE contracts ADD CONSTRAINT contracts_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_event_id_fkey;
ALTER TABLE contracts ADD CONSTRAINT contracts_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Quotes -> Clients & Events
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_event_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_parent_quote_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_parent_quote_id_fkey 
    FOREIGN KEY (parent_quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- Invoices -> Clients & Events
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_event_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Invoice Items -> Invoices
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

-- Tasks -> Clients
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Client Files -> Clients
ALTER TABLE client_files DROP CONSTRAINT IF EXISTS client_files_client_id_fkey;
ALTER TABLE client_files ADD CONSTRAINT client_files_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Reviews -> Clients & Events
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_client_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_event_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Event Timeline Items -> Events
ALTER TABLE event_timeline_items DROP CONSTRAINT IF EXISTS event_timeline_items_event_id_fkey;
ALTER TABLE event_timeline_items ADD CONSTRAINT event_timeline_items_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
