import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Mail, 
  CheckSquare, 
  ChevronLeft, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import StaffDashboard from '../staff/StaffDashboard';
import { dashboardService, type DashboardStats } from '../../services/dashboardService';
import type { Event } from '../../types/event';
import type { Task } from '../../types/task';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ newLeads: 0, newEmails: 0, pendingTasks: 0 });
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isStaffView, setIsStaffView] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [currentDate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [statsData, tasksData, upcomingData, calendarData] = await Promise.all([
        dashboardService.getStats(),
        user ? dashboardService.getMyTasks(user.id) : Promise.resolve([]),
        dashboardService.getUpcomingEvents(10),
        dashboardService.getMonthEvents(currentDate.getFullYear(), currentDate.getMonth())
      ]);

      setStats(statsData);
      setMyTasks(tasksData);
      setUpcomingEvents(upcomingData);
      setCalendarEvents(calendarData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (isStaffView) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Staff Dashboard</h1>
          <button 
            onClick={() => setIsStaffView(false)} 
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            Switch to Admin View
          </button>
        </div>
        <StaffDashboard />
      </div>
    );
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Calendar Grid Generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  if (loading && !stats.newLeads) { // Initial loading
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Dashboard</h1>
        <button 
          onClick={() => setIsStaffView(true)} 
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Switch to Staff View
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">New Leads</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">{stats.newLeads}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/leads" className="font-medium text-primary hover:text-primary/80">
                View all
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">New Emails</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">{stats.newEmails}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Check inbox</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">Pending Tasks (All)</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">{stats.pendingTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/tasks" className="font-medium text-primary hover:text-primary/80">
                View all
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agenda & Tasks */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upcoming Agenda */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Upcoming Agenda</h3>
            </div>
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <li className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">No upcoming events.</li>
              ) : (
                upcomingEvents.map((event) => (
                  <li key={event.id} className="px-4 py-4 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                    <Link to={`/events/${event.id}`} className="block">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-primary truncate">{event.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{format(parseISO(event.date), 'MMM d')}</p>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">{event.venue_name || 'No Venue'}</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          event.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                          event.status === 'inquiry' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* My Tasks */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">My Tasks</h3>
            </div>
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {myTasks.length === 0 ? (
                <li className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">No tasks assigned to you.</li>
              ) : (
                myTasks.map((task) => (
                  <li key={task.id} className="px-4 py-4 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{task.title}</p>
                        {task.due_date && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            Due: {format(parseISO(task.due_date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Right Column: Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <div className="flex space-x-2">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full">
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full">
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const dayEvents = calendarEvents.filter(e => isSameDay(parseISO(e.date), day));
                  return (
                    <div
                      key={day.toString()}
                      className={`min-h-[100px] bg-white dark:bg-gray-800 dark:bg-gray-800 p-2 relative ${
                        !isSameMonth(day, currentDate) ? 'bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-400' : 'text-gray-900 dark:text-white dark:text-white'
                      }`}
                    >
                      <time
                        dateTime={format(day, 'yyyy-MM-dd')}
                        className={`
                          flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
                          ${isToday(day) ? 'bg-primary text-white' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </time>
                      <div className="mt-1 space-y-1">
                        {dayEvents.map((event) => (
                          <Link
                            key={event.id}
                            to={`/events/${event.id}`}
                            className="block px-1 py-0.5 text-xs rounded bg-green-100 text-green-800 truncate hover:bg-green-200"
                            title={event.name}
                          >
                            {event.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
