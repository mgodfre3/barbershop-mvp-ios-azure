"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ScheduleEntry {
  day: number;
  startHour: number;
  endHour: number;
}

interface TimeOffEntry {
  id: string;
  barberId: string;
  date: string;
  reason?: string;
}

interface OverrideEntry {
  id: string;
  barberId: string;
  date: string;
  startHour: number;
  endHour: number;
  reason?: string;
}

interface AvailabilitySlot {
  barberId: string;
  barberName: string;
  date: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
}

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  schedule: ScheduleEntry[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BarberSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const barberId = params.barberId as string;

  const [barber, setBarber] = useState<Barber | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([]);
  const [overrides, setOverrides] = useState<OverrideEntry[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Time off form
  const [newTimeOffDate, setNewTimeOffDate] = useState("");
  const [newTimeOffReason, setNewTimeOffReason] = useState("");

  // Override form
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideStartHour, setNewOverrideStartHour] = useState(9);
  const [newOverrideEndHour, setNewOverrideEndHour] = useState(17);
  const [newOverrideReason, setNewOverrideReason] = useState("");

  useEffect(() => {
    fetchBarberData();
  }, [barberId]);

  const fetchBarberData = async () => {
    try {
      setLoading(true);
      const [barberRes, timeOffRes, overridesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/barbers`),
        fetch(`${API_BASE_URL}/barbers/${barberId}/time-off`),
        fetch(`${API_BASE_URL}/barbers/${barberId}/overrides`),
      ]);

      if (!barberRes.ok) throw new Error("Failed to fetch barber data");
      
      const barbers = await barberRes.json();
      const currentBarber = barbers.find((b: Barber) => b.id === barberId);
      
      if (!currentBarber) throw new Error("Barber not found");

      setBarber(currentBarber);
      setSchedule(currentBarber.schedule || []);

      if (timeOffRes.ok) {
        const timeOffData = await timeOffRes.json();
        setTimeOff(timeOffData);
      }

      if (overridesRes.ok) {
        const overridesData = await overridesRes.json();
        setOverrides(overridesData);
      }

      await fetchAvailability();
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/availability?barberId=${barberId}&days=7`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (err) {
      console.error("Failed to fetch availability:", err);
    }
  };

  const saveSchedule = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/barbers/${barberId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      });

      if (!response.ok) throw new Error("Failed to save schedule");

      setSuccessMessage("Schedule saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const addTimeOff = async () => {
    if (!newTimeOffDate) {
      alert("Please select a date");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/barbers/${barberId}/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newTimeOffDate,
          reason: newTimeOffReason || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to add time off");

      setNewTimeOffDate("");
      setNewTimeOffReason("");
      setSuccessMessage("Time off added successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      
      const timeOffRes = await fetch(`${API_BASE_URL}/barbers/${barberId}/time-off`);
      if (timeOffRes.ok) {
        setTimeOff(await timeOffRes.json());
      }
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add time off");
    }
  };

  const addOverride = async () => {
    if (!newOverrideDate) {
      alert("Please select a date");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/barbers/${barberId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newOverrideDate,
          startHour: newOverrideStartHour,
          endHour: newOverrideEndHour,
          reason: newOverrideReason || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to add override");

      setNewOverrideDate("");
      setNewOverrideStartHour(9);
      setNewOverrideEndHour(17);
      setNewOverrideReason("");
      setSuccessMessage("Override added successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);

      const overridesRes = await fetch(`${API_BASE_URL}/barbers/${barberId}/overrides`);
      if (overridesRes.ok) {
        setOverrides(await overridesRes.json());
      }
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add override");
    }
  };

  const deleteOverride = async (overrideId: string) => {
    if (!confirm("Delete this override?")) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/barbers/${barberId}/overrides/${overrideId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete override");

      setSuccessMessage("Override deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);

      const overridesRes = await fetch(`${API_BASE_URL}/barbers/${barberId}/overrides`);
      if (overridesRes.ok) {
        setOverrides(await overridesRes.json());
      }
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete override");
    }
  };

  const toggleDay = (day: number) => {
    const exists = schedule.find((s) => s.day === day);
    if (exists) {
      setSchedule(schedule.filter((s) => s.day !== day));
    } else {
      setSchedule([...schedule, { day, startHour: 9, endHour: 17 }]);
    }
  };

  const updateScheduleEntry = (
    day: number,
    field: "startHour" | "endHour",
    value: number
  ) => {
    setSchedule(
      schedule.map((s) =>
        s.day === day ? { ...s, [field]: value } : s
      )
    );
  };

  const groupAvailabilityByDate = () => {
    const grouped: Record<string, AvailabilitySlot[]> = {};
    availability.forEach((slot) => {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading barber schedule...</p>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="p-8">
        <p>Barber not found</p>
        <Link href="/schedules" className="text-blue-500 hover:underline">
          ← Back to Schedules
        </Link>
      </div>
    );
  }

  const groupedAvailability = groupAvailabilityByDate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/schedules" className="text-blue-500 hover:underline">
          ← Back to Schedules
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{barber.name}</h1>
      {barber.specialty && (
        <p className="text-gray-600 mb-6">{barber.specialty}</p>
      )}

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Weekly Schedule */}
      <section className="mb-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Weekly Schedule</h2>
        <div className="space-y-3">
          {DAYS.map((dayName, dayIndex) => {
            const entry = schedule.find((s) => s.day === dayIndex);
            const isActive = !!entry;

            return (
              <div
                key={dayIndex}
                className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleDay(dayIndex)}
                  className="w-5 h-5"
                />
                <span className="w-28 font-medium">{dayName}</span>
                
                {isActive && entry && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Start:</label>
                      <select
                        value={entry.startHour}
                        onChange={(e) =>
                          updateScheduleEntry(dayIndex, "startHour", Number(e.target.value))
                        }
                        className="border rounded px-2 py-1"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">End:</label>
                      <select
                        value={entry.endHour}
                        onChange={(e) =>
                          updateScheduleEntry(dayIndex, "endHour", Number(e.target.value))
                        }
                        className="border rounded px-2 py-1"
                      >
                        {Array.from({ length: 25 }, (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {!isActive && (
                  <span className="text-gray-400 italic">Day off</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={saveSchedule}
          disabled={saving}
          className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </section>

      {/* Time Off */}
      <section className="mb-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Time Off</h2>
        
        <div className="mb-4 p-4 bg-gray-50 rounded border">
          <h3 className="font-semibold mb-3">Add Time Off</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={newTimeOffDate}
                onChange={(e) => setNewTimeOffDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={newTimeOffReason}
                onChange={(e) => setNewTimeOffReason(e.target.value)}
                placeholder="e.g., Vacation"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <button
              onClick={addTimeOff}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add
            </button>
          </div>
        </div>

        {timeOff.length > 0 ? (
          <div className="space-y-2">
            {timeOff.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center p-3 border rounded"
              >
                <div>
                  <span className="font-medium">{entry.date}</span>
                  {entry.reason && (
                    <span className="ml-3 text-gray-600">— {entry.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No time off scheduled</p>
        )}
      </section>

      {/* Overrides */}
      <section className="mb-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Schedule Overrides</h2>
        
        <div className="mb-4 p-4 bg-gray-50 rounded border">
          <h3 className="font-semibold mb-3">Add Override</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={newOverrideDate}
                onChange={(e) => setNewOverrideDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={newOverrideReason}
                onChange={(e) => setNewOverrideReason(e.target.value)}
                placeholder="e.g., Extended hours"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Hour</label>
              <select
                value={newOverrideStartHour}
                onChange={(e) => setNewOverrideStartHour(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Hour</label>
              <select
                value={newOverrideEndHour}
                onChange={(e) => setNewOverrideEndHour(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={addOverride}
            className="mt-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add Override
          </button>
        </div>

        {overrides.length > 0 ? (
          <div className="space-y-2">
            {overrides.map((override) => (
              <div
                key={override.id}
                className="flex justify-between items-center p-3 border rounded"
              >
                <div>
                  <span className="font-medium">{override.date}</span>
                  <span className="ml-3 text-gray-600">
                    {override.startHour.toString().padStart(2, "0")}:00 –{" "}
                    {override.endHour.toString().padStart(2, "0")}:00
                  </span>
                  {override.reason && (
                    <span className="ml-3 text-gray-600">— {override.reason}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteOverride(override.id)}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No schedule overrides</p>
        )}
      </section>

      {/* Availability Preview */}
      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Availability Preview (Next 7 Days)</h2>
        
        {Object.keys(groupedAvailability).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedAvailability).map(([date, slots]) => (
              <div key={date} className="border rounded p-4">
                <h3 className="font-semibold mb-2">{date}</h3>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="bg-green-100 border border-green-300 rounded px-3 py-2 text-sm text-center"
                    >
                      {new Date(slot.startAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(slot.endAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No availability in the next 7 days</p>
        )}
      </section>
    </div>
  );
}
