import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Plus
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO, 
  isToday 
} from 'date-fns';
import { calendarService, type CalendarItem } from '../../services/calendarService';
import { settingsService } from '../../services/settingsService';
import toast from 'react-hot-toast';

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [showEvents, setShowEvents] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [weekStart, setWeekStart] = useState<'sunday' | 'monday'>('sunday');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getCalendarSettings();
      if (settings) {
        setWeekStart(settings.week_start_day as 'sunday' | 'monday');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCalendarData = async () => {
    try {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: weekStart === 'monday' ? 1 : 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: weekStart === 'monday' ? 1 : 0 });
      
      const data = await calendarService.getCalendarItems(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setItems(data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const jumpToToday = () => setCurrentDate(new Date());

  // Calendar Grid Generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: weekStart === 'monday' ? 1 : 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStart === 'monday' ? 1 : 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = weekStart === 'monday' 
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDayItems = (day: Date) => {
    return items.filter(item => {
      const itemDate = item.type === 'event' ? item.date : item.due_date;
      if (!itemDate) return false;
      return isSameDay(parseISO(itemDate), day);
    }).filter(item => {
      if (item.type === 'event' && !showEvents) return false;
      if (item.type === 'task' && !showTasks) return false;
      return true;
    });
  };

  const handleItemClick = (item: CalendarItem) => {
    if (item.type === 'event') {
      navigate(`/events/${item.id}`);
    } else {
      // Navigate to task context if possible, or just show toast for now
      // Since tasks can be on clients, venues, etc., it's harder to link directly without more context
      // For now, we'll just show a toast or maybe navigate to the parent entity if we had that info easily
      // But we do have client_id, venue_id etc.
      if (item.client_id) navigate(`/clients/${item.client_id}`);
      else if (item.venue_id) navigate(`/venues/${item.venue_id}`);
      else if (item.planner_id) navigate(`/planners/${item.planner_id}`);
      else toast('Task details not available');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h1>
          <div className="flex items-center rounded-md shadow-sm bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-300">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 rounded-l-md border-r border-gray-300">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={jumpToToday} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
              Today
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 rounded-r-md border-l border-gray-300">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 dark:bg-gray-800 p-1 rounded-md border border-gray-300">
            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center ${
                showEvents ? 'bg-pink-100 text-pink-800' : 'text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700'
              }`}
            >
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Events
            </button>
            <button
              onClick={() => setShowTasks(!showTasks)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center ${
                showTasks ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700'
              }`}
            >
              <CheckSquare className="h-4 w-4 mr-1.5" />
              Tasks
            </button>
          </div>
          
          <button
            onClick={() => navigate('/events/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white dark:bg-gray-800 dark:bg-gray-800 shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
          {weekDays.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6 divide-x divide-gray-200">
          {calendarDays.map((day) => {
            const dayItems = getDayItems(day);
            const isSelectedMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toString()}
                className={`min-h-[100px] p-2 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 transition-colors relative ${
                  !isSelectedMonth ? 'bg-gray-50 dark:bg-gray-700 dark:bg-gray-700/50' : ''
                }`}
              >
                <time
                  dateTime={format(day, 'yyyy-MM-dd')}
                  className={`
                    flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium
                    ${isToday(day) ? 'bg-primary text-white' : isSelectedMonth ? 'text-gray-900 dark:text-white dark:text-white' : 'text-gray-400'}
                  `}
                >
                  {format(day, 'd')}
                </time>
                
                <div className="mt-2 space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                  {dayItems.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      className={`
                        w-full text-left px-2 py-1 text-xs rounded-md truncate border
                        ${item.type === 'event' 
                          ? item.status === 'confirmed' 
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : item.status === 'inquiry'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                              : 'bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-700 border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:bg-gray-100'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }
                      `}
                    >
                      <div className="font-medium truncate">
                        {item.type === 'task' && <CheckSquare className="inline h-3 w-3 mr-1 -mt-0.5" />}
                        {item.type === 'event' ? item.name : item.title}
                      </div>
                      {item.type === 'event' && (
                        <div className="text-[10px] opacity-75 truncate">
                          {item.venue_name || 'No Venue'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
