import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Route as RouteIcon,
  Activity,
  BarChart3,
  Bookmark,
  Accessibility,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  MapPin,
  Sun,
  Moon,
  CloudRain,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { getNotifications, getSettings, markNotificationAsRead, saveSettings } from '../../services/storage';
import { NotificationItem, UserSettings } from '../../types';
import { MUMBAI_STATIONS } from '../../data/routes';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettingsState] = useState<UserSettings>(getSettings());

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setNotifications(getNotifications());
    const curSettings = getSettings();
    setSettingsState(curSettings);
    if (curSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const toggleTheme = () => {
    const nextTheme: 'light' | 'dark' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: UserSettings = { ...settings, theme: nextTheme };
    setSettingsState(updated);
    saveSettings(updated);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Plan a Journey', path: '/plan', icon: RouteIcon },
    { name: 'Crowd Forecast', path: '/forecast', icon: Activity },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Saved Routes', path: '/saved', icon: Bookmark },
    { name: 'Accessibility', path: '/accessibility', icon: Accessibility },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const filteredStations = MUMBAI_STATIONS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lines.some((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Banner Alert if Monsoon Simulation Active */}
      {settings.monsoonMultiplier !== 'normal' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 text-center">
          <CloudRain className="w-3.5 h-3.5" />
          <span>
            Active Simulation: {settings.monsoonMultiplier === 'heavy_rain' ? 'Heavy Waterlogging Surge' : 'Monsoon Light Rain'} mode. Crowd densities calibrated for rain conditions.
          </span>
          <button
            onClick={() => navigate('/settings')}
            className="underline ml-1 hover:text-white transition-colors"
          >
            Adjust
          </button>
        </div>
      )}

      {/* Main Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & City Selector */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                    Crowd<span className="text-teal-600 dark:text-teal-400">Sense</span>
                  </span>
                  <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                    Urban Transit
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium hidden sm:block">
                  Predictive Mobility Intelligence
                </div>
              </div>
            </NavLink>

            {/* City Selector Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Mumbai MMR</span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 bg-teal-100/70 dark:bg-teal-950 px-1.5 rounded-full font-semibold">
                Live Model
              </span>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 transition-all text-left group"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                <span>Search stations, corridors, or routes (e.g. Dadar, Borivali)...</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Actions: Theme Toggle, Notifications, User/Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors"
                title="Transit Advisories & Alerts"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              {/* Notifications Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        Transit Bulletins
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-full font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        notifications.forEach((n) => markNotificationAsRead(n.id));
                        setNotifications(getNotifications());
                      }}
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto mt-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">No active alerts</div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`py-3 px-1 transition-colors ${
                            item.unread ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {item.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-[10px]">
                            <span className="text-teal-700 dark:text-teal-400 font-medium">
                              {item.corridor}
                            </span>
                            {item.unread && (
                              <button
                                onClick={() => {
                                  markNotificationAsRead(item.id);
                                  setNotifications(getNotifications());
                                }}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate('/forecast');
                      }}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium flex items-center justify-center gap-1 w-full"
                    >
                      <span>Explore all live corridor forecasts</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Plan CTA */}
            <button
              onClick={() => navigate('/plan')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Plan Trip</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout: Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Left Sidebar Navigation */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mb-2">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            {/* Corridor Status Quick Card in Sidebar */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="bg-slate-100/70 dark:bg-slate-900/70 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Mumbai Corridor Status
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mb-2">
                  Western Fast running on 4m peak frequency. Metro Line 1 smooth.
                </p>
                <button
                  onClick={() => navigate('/forecast')}
                  className="text-teal-600 dark:text-teal-400 font-semibold hover:underline text-[11px] flex items-center gap-1"
                >
                  <span>View 24h curve</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Out Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col z-50 border-r border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    CrowdSense
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-6 space-y-1.5 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <div>Mumbai Predictive Model v2.4</div>
                <div className="text-[10px] mt-0.5">Deterministic Synthetic Forecaster</div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Quick Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stations, corridors, or codes (e.g. Borivali, Dadar, CCG)..."
                autoFocus
                className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStations.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No matching Mumbai stations found for "{searchQuery}".
                </div>
              ) : (
                filteredStations.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => {
                      setSearchModalOpen(false);
                      navigate(`/plan?origin=${station.id}`);
                    }}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{station.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({station.code})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {station.lines.join(', ')} • {station.zone}
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                      Plan from here →
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span>Select any station to jump directly to Journey Planner</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
