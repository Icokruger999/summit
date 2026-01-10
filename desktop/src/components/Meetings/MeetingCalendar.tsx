import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO, subWeeks, addWeeks, startOfDay } from "date-fns";
import CreateMeetingModal from "./CreateMeetingModal";
import { Calendar, Plus, Clock, Users, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { sounds } from "../../lib/sounds";
import { SkeletonMeetingCard, SkeletonText } from "../ui/Skeleton";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  room_id: string;
  created_by: string;
}

interface MeetingCalendarProps {
  userId: string;
  onJoinMeeting: (roomName: string) => void;
}

export default function MeetingCalendar({
  userId,
  onJoinMeeting,
}: MeetingCalendarProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date()); // The week being viewed
  const [selectedDay, setSelectedDay] = useState<Date | null>(null); // The specific day selected
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, [userId]);

  const loadMeetings = async () => {
    try {
      const { meetingsApi } = await import("../../lib/api");
      const data = await meetingsApi.getAll();
      setMeetings(data);
    } catch (error) {
      console.error("Error loading meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    setViewDate(subWeeks(viewDate, 1));
  };

  const goToNextWeek = () => {
    setViewDate(addWeeks(viewDate, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDay(today);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };

  const meetingsForDate = (date: Date) => {
    return meetings.filter((meeting) =>
      isSameDay(parseISO(meeting.start_time), date)
    );
  };

  if (loading) {
    return (
      <div className="p-8 bg-white min-h-full">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <SkeletonText lines={2} className="max-w-md" />
          </div>
          <div className="space-y-4">
            <SkeletonMeetingCard />
            <SkeletonMeetingCard />
            <SkeletonMeetingCard />
            <SkeletonMeetingCard />
            <SkeletonMeetingCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Meetings</h2>
            <p className="text-gray-500">Schedule and join your video meetings</p>
          </div>
          <button
            onClick={() => {
              // If no day is selected, select today
              if (!selectedDay) {
                setSelectedDay(new Date());
              }
              setShowCreateModal(true);
            }}
            className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Schedule Meeting{selectedDay ? ` for ${format(selectedDay, "MMM d")}` : ""}
          </button>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Today
            </button>
            <div className="text-lg font-semibold text-gray-900">
              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const dayMeetings = meetingsForDate(day);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`p-4 text-center bg-white hover:bg-gray-50 transition-all cursor-pointer ${
                    isToday
                      ? "bg-gradient-to-br from-blue-50 to-sky-50 font-semibold"
                      : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-blue-500 ring-inset bg-blue-100"
                      : ""
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">{format(day, "EEE")}</div>
                  <div className={`text-lg mb-2 ${
                    isToday
                      ? "text-blue-600"
                      : isSelected
                      ? "text-blue-700 font-bold"
                      : "text-gray-900"
                  }`}>
                    {format(day, "d")}
                  </div>
                  {dayMeetings.length > 0 && (
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">{dayMeetings.length}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meetings List */}
        <div className="space-y-4">
          {selectedDay && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Meetings for {format(selectedDay, "EEEE, MMMM d, yyyy")}
              </h3>
              <p className="text-sm text-gray-600">
                {meetingsForDate(selectedDay).length} meeting{meetingsForDate(selectedDay).length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          )}
          
          {(() => {
            const meetingsToShow = selectedDay ? meetingsForDate(selectedDay) : meetings;
            
            if (meetingsToShow.length === 0) {
              return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No meetings scheduled</h3>
              <p className="text-gray-500 mb-6">Create your first meeting to get started!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                Schedule Meeting
              </button>
            </div>
              );
            }
            
            return meetingsToShow.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {meeting.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(meeting.start_time), "MMM d, yyyy h:mm a")}
                          </div>
                        </div>
                      </div>
                    </div>
                    {meeting.description && (
                      <p className="text-gray-600 mb-4 ml-16">
                        {meeting.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      sounds.callInitiated();
                      onJoinMeeting(meeting.room_id);
                    }}
                    className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium ml-4"
                  >
                    <Video className="w-4 h-4" />
                    Join
                  </button>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {showCreateModal && (
        <CreateMeetingModal
          userId={userId}
          initialDate={selectedDay || undefined}
          onClose={() => {
            setShowCreateModal(false);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            loadMeetings();
          }}
        />
      )}
    </div>
  );
}
