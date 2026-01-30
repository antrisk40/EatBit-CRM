'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Video,
  Plus,
  Filter,
  Check,
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: string;
  color: string;
  status: string;
  attendee_count: number;
  location?: string;
  meeting_link?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: () => void;
  loading?: boolean;
}

export default function Calendar({ 
  events = [], 
  onDateClick, 
  onEventClick,
  onCreateEvent,
  loading = false 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [filterType, setFilterType] = useState<string>('all');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, date) && (filterType === 'all' || event.type === filterType);
    });
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      meeting: 'bg-blue-500',
      training: 'bg-purple-500',
      demo: 'bg-green-500',
      review: 'bg-orange-500',
      planning: 'bg-pink-500',
      call: 'bg-cyan-500',
      site_visit: 'bg-indigo-500',
      other: 'bg-gray-500'
    };
    return colors[type] || 'bg-blue-500';
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CalendarIcon className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <p className="text-blue-100 text-sm">
                {events.length} events this month
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-medium"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {onCreateEvent && (
              <button
                onClick={onCreateEvent}
                className="ml-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                New Event
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-white" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filterType === 'all' 
                ? 'bg-white text-blue-600' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            All
          </button>
          {['meeting', 'training', 'demo', 'review', 'planning'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors ${
                filterType === type 
                  ? 'bg-white text-blue-600' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-bold text-gray-600 text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day)}
                    className={`
                      min-h-[100px] p-2 rounded-xl border-2 transition-all cursor-pointer
                      ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                      ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
                      ${isTodayDate ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                      hover:border-blue-300 hover:shadow-md
                    `}
                  >
                    {/* Date Number */}
                    <div className={`
                      text-sm font-bold mb-1 flex items-center justify-center w-7 h-7 rounded-full
                      ${isTodayDate ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    `}>
                      {format(day, 'd')}
                    </div>

                    {/* Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className={`
                            text-xs p-1 rounded truncate cursor-pointer
                            ${getEventTypeColor(event.type)} text-white
                            hover:opacity-80 transition-opacity
                          `}
                          title={event.title}
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate font-medium">{event.title}</span>
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500 font-bold pl-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Event Types</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { type: 'meeting', label: 'Meeting' },
              { type: 'call', label: 'Phone Call' },
              { type: 'demo', label: 'Demo' },
              { type: 'site_visit', label: 'Site Visit' },
              { type: 'training', label: 'Training' },
              { type: 'review', label: 'Review' },
              { type: 'planning', label: 'Planning' }
            ].map(({ type, label }) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getEventTypeColor(type)}`}></div>
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
