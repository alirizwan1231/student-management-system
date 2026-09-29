import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Settings,
  User,
  Users,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/semesters", label: "Semesters", icon: GraduationCap },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/instructors", label: "Instructors", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
