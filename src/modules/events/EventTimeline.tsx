import { useState } from 'react';
import { 
  Package, 
  Car, 
  MapPin, 
  Wrench, 
  PartyPopper, 
  Flag, 
  Calculator, 
  Edit, 
  Save
} from 'lucide-react';
import type { Event } from '../../types/event';
import toast from 'react-hot-toast';

interface EventTimelineProps {
  event: Event;
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  offsetMinutes: number; // Relative to event start
  icon: 'package' | 'car' | 'pin' | 'wrench' | 'party' | 'flag';
  isAnchor?: boolean; // The main event start
}

const DEFAULT_ITEMS: TimelineItem[] = [
  {
    id: '1',
    title: 'Meet & Load',
    description: 'Team meets and loads equipment (15 min before leaving)',
    offsetMinutes: -135, // 2h 15m before start
    icon: 'package'
  },
  {
    id: '2',
    title: 'Leave to Event',
    description: 'Depart for venue (55 min travel: max 25 + 30 min buffer)',
    offsetMinutes: -120, // 2h before start
    icon: 'car'
  },
  {
    id: '3',
    title: 'Arrive at Venue',
    description: 'Arrival at event location (25 min before setup)',
    offsetMinutes: -65, // 1h 5m before start
    icon: 'pin'
  },
  {
    id: '4',
    title: 'Setup Time',
    description: 'Equipment setup and preparation (40 min before event)',
    offsetMinutes: -40,
    icon: 'wrench'
  },
  {
    id: '5',
    title: 'Event Start',
    description: 'Event begins - PRIMARY TIME',
    offsetMinutes: 0,
    icon: 'party',
    isAnchor: true
  },
  {
    id: '6',
    title: 'Event End',
    description: 'Event concludes (+120 min)',
    offsetMinutes: 120,
    icon: 'flag'
  }
];

export default function EventTimeline({ event }: EventTimelineProps) {
  const [items] = useState<TimelineItem[]>(DEFAULT_ITEMS);
  const [isEditing, setIsEditing] = useState(false);

  // Helper to calculate time based on event start time and offset
  const calculateTime = (_baseTimeStr: string, offsetMinutes: number) => {
    // Assuming baseTimeStr is "HH:mm" or "HH:mm:ss"
    // If event.date is just a date string "YYYY-MM-DD", we might need a separate time field.
    // For this mock, let's assume event.date includes time or we default to a time.
    
    // Let's try to parse event.date. If it's just YYYY-MM-DD, default to 23:00 for the demo matching the image.
    let baseDate = new Date();
    if (event.date && event.date.includes('T')) {
        baseDate = new Date(event.date);
    } else {
        // Mock base time 23:00:00 if no specific time is found
        baseDate.setHours(23, 0, 0, 0);
    }

    const itemDate = new Date(baseDate.getTime() + offsetMinutes * 60000);
    
    return itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'package': return <Package className="h-5 w-5 text-amber-600" />;
      case 'car': return <Car className="h-5 w-5 text-red-500" />;
      case 'pin': return <MapPin className="h-5 w-5 text-red-600" />;
      case 'wrench': return <Wrench className="h-5 w-5 text-gray-500" />;
      case 'party': return <PartyPopper className="h-5 w-5 text-white" />;
      case 'flag': return <Flag className="h-5 w-5 text-gray-600" />;
      default: return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getIconBg = (_iconName: string, isAnchor?: boolean) => {
    if (isAnchor) return 'bg-sky-500';
    return 'bg-gray-100';
  };

  const formatOffset = (minutes: number) => {
    if (minutes === 0) return '00:00';
    const sign = minutes > 0 ? '+' : '';
    if (Math.abs(minutes) >= 60) {
        const hrs = Math.floor(Math.abs(minutes) / 60);
        return `${sign}${hrs} hrs`;
    }
    return `${sign}${minutes} min`;
  };

  const getBadgeColor = (minutes: number, isAnchor?: boolean) => {
    if (isAnchor) return 'bg-sky-200 text-sky-800';
    if (minutes > 0) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success('Timeline saved successfully');
  };

  const handleAutoCalculate = () => {
    toast.success('Timeline recalculated based on travel & setup times');
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Event Timeline</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleAutoCalculate}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Auto Calculate
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? 'Cancel Edit' : 'Edit Timeline'}
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Timeline
          </button>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {items.map((item, itemIdx) => (
              <li key={item.id}>
                <div className="relative pb-8">
                  {itemIdx !== items.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getIconBg(item.icon, item.isAnchor)}`}>
                        {getIcon(item.icon)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <div className="flex items-center space-x-2">
                            <p className={`text-sm font-medium ${item.isAnchor ? 'text-sky-600' : 'text-gray-900'}`}>
                                {item.title}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(item.offsetMinutes, item.isAnchor)}`}>
                                {formatOffset(item.offsetMinutes)}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      </div>
                      <div className="text-right whitespace-nowrap text-sm text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 self-start">
                        {calculateTime(event.date, item.offsetMinutes)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
