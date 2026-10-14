import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Flame,
  FolderKanban,
  Home,
  ListTodo,
  Tags,
  Timer,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const navLinks: NavItem[] = [
  { label: "Dashboard", to: "/", icon: Home },
  { label: "My Day", to: "/my-day", icon: ListTodo },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Upcoming", to: "/upcoming", icon: Timer },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Categories", to: "/categories", icon: Tags },
  { label: "Completed", to: "/completed", icon: CheckCircle2 },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Streaks", to: "/streaks", icon: Flame },
];
