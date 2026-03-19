"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ScheduleEntry {
  day: number;
  startHour: number;
  endHour: number;
}

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  schedule: ScheduleEntry[];
  isAvailableToday: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulesPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/barbers`);
      if (!response.ok) {
        throw new Error(`Failed to fetch barbers: ${response.statusText}`);
      }
      const data = await response.json();
      setBarbers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (schedule: ScheduleEntry[]) => {
    if (!schedule || schedule.length === 0) return "No schedule set";
    
    const days = schedule.map((s) => DAYS[s.day]);
    return days.join(", ");
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Schedule Management</h1>
        <p>Loading barbers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Schedule Management</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
        <button
          onClick={fetchBarbers}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Schedule Management</h1>

      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Working Today</h2>
        <div className="flex flex-wrap gap-2">
          {barbers.filter((b) => b.isAvailableToday).length > 0 ? (
            barbers
              .filter((b) => b.isAvailableToday)
              .map((barber) => (
                <span
                  key={barber.id}
                  className="bg-green-500 text-white px-3 py-1 rounded-full text-sm"
                >
                  {barber.name}
                </span>
              ))
          ) : (
            <span className="text-gray-500">No barbers available today</span>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Barber</th>
              <th className="text-left px-6 py-3 font-semibold">Specialty</th>
              <th className="text-left px-6 py-3 font-semibold">Working Days</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="text-right px-6 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {barbers.map((barber) => (
              <tr key={barber.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{barber.name}</td>
                <td className="px-6 py-4 text-gray-600">
                  {barber.specialty || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatSchedule(barber.schedule)}
                </td>
                <td className="px-6 py-4">
                  {barber.isAvailableToday ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      Available
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                      Off Today
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/schedules/${barber.id}`}
                    className="text-blue-500 hover:underline font-medium"
                  >
                    Edit Schedule →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {barbers.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No barbers found
          </div>
        )}
      </div>
    </div>
  );
}
