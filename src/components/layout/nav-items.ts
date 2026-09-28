import { LayoutDashboard, CalendarDays, ListChecks, GraduationCap, User, Settings } from "lucide-react";

// Subjects/Lectures/Notes/Resources are reached by drilling into a
// semester -> subject rather than as standalone top-level routes (each
// belongs to exactly one subject), so "Semesters" is the entry point for
// all of them per the app's navigation hierarchy.
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/semesters", label: "Semesters", icon: GraduationCap },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
