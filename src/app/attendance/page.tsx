import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";

export const metadata = { title: "Attendance" };

export default function AttendancePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <AttendanceDashboard />
    </main>
  );
}
