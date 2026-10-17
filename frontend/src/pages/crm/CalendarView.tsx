import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, 
  Phone, ClipboardCheck
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return today;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch Followups
  const { data: followups, isLoading: followupsLoading } = useQuery({
    queryKey: ['calendar-followups'],
    queryFn: async () => {
      const response = await api.get('/followups');
      return response.data.data;
    }
  });

  // Fetch Tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['calendar-tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks');
      return response.data.data;
    }
  });

  const isLoading = followupsLoading || tasksLoading;

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDate = (dateNum: number) => {
    const checkDate = new Date(year, month, dateNum);
    checkDate.setHours(0,0,0,0);

    const checkTime = checkDate.getTime();

    const dayFollowups = followups?.filter((f: any) => {
      const fDate = new Date(f.date);
      fDate.setHours(0,0,0,0);
      return fDate.getTime() === checkTime;
    }) || [];

    const dayTasks = tasks?.filter((t: any) => {
      if (!t.dueDate) return false;
      const tDate = new Date(t.dueDate);
      tDate.setHours(0,0,0,0);
      return tDate.getTime() === checkTime;
    }) || [];

    return { followups: dayFollowups, tasks: dayTasks };
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Agenda list filter based on selected date
  const selectedTime = selectedDate.getTime();
  const agendaFollowups = followups?.filter((f: any) => {
    const fDate = new Date(f.date);
    fDate.setHours(0,0,0,0);
    return fDate.getTime() === selectedTime;
  }) || [];

  const agendaTasks = tasks?.filter((t: any) => {
    if (!t.dueDate) return false;
    const tDate = new Date(t.dueDate);
    tDate.setHours(0,0,0,0);
    return tDate.getTime() === selectedTime;
  }) || [];

  const renderCells = () => {
    const cells = [];
    
    // Blank padding cells for weekdays before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 border border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-950/20"></div>);
    }

    // Days in active month
    for (let day = 1; day <= daysInMonth; day++) {
      const { followups: dayF, tasks: dayT } = getEventsForDate(day);
      const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
      const totalEvents = dayF.length + dayT.length;

      cells.push(
        <div
          key={`day-${day}`}
          onClick={() => {
            const clickDate = new Date(year, month, day);
            clickDate.setHours(0,0,0,0);
            setSelectedDate(clickDate);
          }}
          className={`h-24 border border-slate-100 dark:border-dark-800 p-2 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-dark-800/40 relative ${
            isSelected ? 'bg-primary-50/30 dark:bg-primary-950/20 ring-1 ring-primary-500' : 'bg-white dark:bg-dark-900'
          }`}
        >
          <span className={`text-xs font-bold ${
            isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-800 dark:text-dark-200'
          }`}>
            {day}
          </span>

          {/* Render event preview tags */}
          <div className="mt-1.5 space-y-1 overflow-hidden max-h-[52px]">
            {dayF.slice(0, 2).map((f: any) => (
              <div key={f._id} className="text-[9px] truncate bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 px-1 py-0.5 rounded font-medium">
                📞 {f.time} {f.type}
              </div>
            ))}
            {dayT.slice(0, 2).map((t: any) => (
              <div key={t._id} className="text-[9px] truncate bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 px-1 py-0.5 rounded font-medium">
                📝 {t.title}
              </div>
            ))}
            {totalEvents > 4 && (
              <div className="text-[8px] text-slate-400 text-center font-bold">
                +{totalEvents - 4} more events
              </div>
            )}
          </div>
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Workspace Calendar</h1>
        <p className="text-xs text-slate-500 dark:text-dark-400">Review scheduled reminders, touchpoint calls, meetings, and project deadlines.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Column: Monthly Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              {monthNames[month]} {year}
            </h2>
            <div className="flex space-x-1.5">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 border border-slate-200 dark:border-dark-800 rounded-lg hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 border border-slate-200 dark:border-dark-800 rounded-lg hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 dark:border-dark-800 overflow-hidden shadow-xs">
              {/* Weekday columns */}
              <div className="grid grid-cols-7 bg-slate-50 dark:bg-dark-950 text-center py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-dark-800">
                {weekdayNames.map(d => <div key={d}>{d}</div>)}
              </div>
              
              {/* Day cells grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-dark-800">
                {renderCells()}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Daily Agenda Inspector Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center space-x-2">
              <CalendarIcon className="h-4.5 w-4.5 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Agenda: {selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </h3>
            </div>

            {/* List of day events */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              
              {/* Followups section */}
              <div className="space-y-2">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Scheduled Follow-ups</span>
                {agendaFollowups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No communication scheduled.</p>
                ) : (
                  agendaFollowups.map((f: any) => (
                    <div key={f._id} className="p-3.5 bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 rounded-xl flex items-start space-x-2.5">
                      <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-xs">
                        <div className="flex items-center space-x-1.5 font-semibold text-blue-800 dark:text-blue-400">
                          <span>{f.time}</span>
                          <span className="uppercase text-[9px] bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">{f.type}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-white mt-1">
                          {f.leadId ? f.leadId.name : f.customerId ? f.customerId.name : 'Unknown Contact'}
                        </p>
                        {f.notes && <p className="text-slate-550 dark:text-dark-400 mt-0.5 font-light">{f.notes}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tasks section */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-dark-800/80">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Checklist Tasks</span>
                {agendaTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No tasks due.</p>
                ) : (
                  agendaTasks.map((t: any) => (
                    <div key={t._id} className="p-3.5 bg-orange-50/50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30 rounded-xl flex items-start space-x-2.5">
                      <ClipboardCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-semibold text-orange-850 dark:text-orange-450 uppercase text-[9px]">
                          {t.priority} priority
                        </div>
                        <p className="font-bold text-slate-800 dark:text-white mt-0.5">{t.title}</p>
                        {t.description && <p className="text-slate-550 dark:text-dark-400 mt-0.5 font-light">{t.description}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
