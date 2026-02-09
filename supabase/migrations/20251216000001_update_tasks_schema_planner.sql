-- Add planner_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN planner_id UUID REFERENCES planners(id) ON DELETE CASCADE;

-- Add an index for planner_id for better query performance
CREATE INDEX idx_tasks_planner_id ON tasks(planner_id);
