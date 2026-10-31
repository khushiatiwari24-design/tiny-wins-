import { NotificationItem, SavedRoute } from '../types';

export const INITIAL_SAVED_ROUTES: SavedRoute[] = [
  {
    id: 'fav-1',
    customName: 'Morning Borivali to Churchgate Fast',
    originId: 'borivali',
    destinationId: 'churchgate',
    preferredMode: 'train_fast',
    preferredTime: '08:45',
    notes: 'Southbound office rush — aim for coaches 4 or 8 for easier exit at Churchgate',
    createdAt: '2026-10-15',
    frequencyLabel: 'Daily (Mon-Fri)',
  },
  {
    id: 'fav-2',
    customName: 'Thane to CSMT AC Express',
    originId: 'thane',
    destinationId: 'csmt',
    preferredMode: 'train_ac',
    preferredTime: '09:15',
    notes: 'Comfortable air-conditioned option, lower crowd than general fast local',
    createdAt: '2026-10-18',
    frequencyLabel: 'Mon, Wed, Fri',
  },
  {
    id: 'fav-3',
    customName: 'Andheri to Ghatkopar Metro Cross-Over',
    originId: 'andheri',
    destinationId: 'ghatkopar',
    preferredMode: 'metro',
    preferredTime: '17:30',
    notes: 'East-West link skipping JVLR traffic bottlenecks entirely',
    createdAt: '2026-10-20',
    frequencyLabel: 'Daily',
  },
  {
    id: 'fav-4',
    customName: 'Vashi to BKC (Trans-Harbour & Feeder)',
    originId: 'vashi',
    destinationId: 'bkc',
    preferredMode: 'bus_ac',
    preferredTime: '09:00',
    notes: 'Direct AC route via Mankhurd flyover & BKC connector',
    createdAt: '2026-10-22',
    frequencyLabel: 'Weekdays',
  },
];

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High Crowding Advisory: Dadar Junction',
    message: 'Central & Western interchange footbridge experiencing peak transit volume. Consider Ghatkopar-Andheri Metro for East-West transit.',
    type: 'alert',
    time: '12m ago',
    corridor: 'Dadar Inter-rail Corridor',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'AC Fast Local Augmentation Active',
    message: '2 extra 12-car AC rakes introduced between Churchgate & Borivali to ease evening office rush.',
    type: 'tip',
    time: '45m ago',
    corridor: 'Western Railway',
    unread: true,
  },
  {
    id: 'notif-3',
    title: 'Metro Line 3 Phase-1 Frequency 4.5 Mins',
    message: 'Underground Aqua Line running at enhanced headway between BKC and Marol/SEEPZ with 100% step-free accessibility.',
    type: 'advisory',
    time: '2h ago',
    corridor: 'Aqua Line Underground',
    unread: false,
  },
  {
    id: 'notif-4',
    title: 'BEST AC-C40 Off-Peak Travel Discount',
    message: 'Occupancy is under 45% between 12:00 PM and 3:30 PM on the Western Express corridor.',
    type: 'tip',
    time: '4h ago',
    corridor: 'BEST Bus Express',
    unread: false,
  },
];

export const CONGESTION_RANKINGS = [
  { rank: 1, station: 'Dadar Junction', line: 'WR + CR Interchange', peakOccupancy: 96, avgWaitSec: 420, dailyFootfall: '680,000' },
  { rank: 2, station: 'Andheri West/East', line: 'WR + Metro Line 1', peakOccupancy: 93, avgWaitSec: 360, dailyFootfall: '590,000' },
  { rank: 3, station: 'Thane Central', line: 'CR Mainline + Trans-Harbour', peakOccupancy: 91, avgWaitSec: 330, dailyFootfall: '540,000' },
  { rank: 4, station: 'Kurla Junction', line: 'CR Mainline + Harbour', peakOccupancy: 89, avgWaitSec: 310, dailyFootfall: '470,000' },
  { rank: 5, station: 'Ghatkopar Station', line: 'CR + Metro 1 Interchange', peakOccupancy: 88, avgWaitSec: 280, dailyFootfall: '430,000' },
  { rank: 6, station: 'Borivali Main', line: 'Western Railway Terminal', peakOccupancy: 86, avgWaitSec: 240, dailyFootfall: '450,000' },
  { rank: 7, station: 'CSMT South', line: 'CR Terminal + Heritage Hub', peakOccupancy: 84, avgWaitSec: 210, dailyFootfall: '380,000' },
  { rank: 8, station: 'Churchgate Terminal', line: 'WR Terminal', peakOccupancy: 82, avgWaitSec: 190, dailyFootfall: '350,000' },
];

export const CORRIDOR_ANALYTICS = [
  { name: 'Western Fast (Borivali - Churchgate)', amPeak: 94, pmPeak: 92, offPeak: 48, punctuality: 96.2, capacityUtilization: 112 },
  { name: 'Central Fast (Thane - CSMT)', amPeak: 97, pmPeak: 95, offPeak: 52, punctuality: 94.8, capacityUtilization: 118 },
  { name: 'Harbour Line (Vashi - CSMT)', amPeak: 84, pmPeak: 82, offPeak: 41, punctuality: 93.4, capacityUtilization: 94 },
  { name: 'Metro Line 1 (Versova - Ghatkopar)', amPeak: 78, pmPeak: 76, offPeak: 38, punctuality: 99.4, capacityUtilization: 82 },
  { name: 'Metro Line 3 (BKC - Marol)', amPeak: 54, pmPeak: 52, offPeak: 26, punctuality: 99.8, capacityUtilization: 58 },
  { name: 'BEST AC Express Buses (WEH & EEH)', amPeak: 68, pmPeak: 64, offPeak: 35, punctuality: 86.5, capacityUtilization: 71 },
];
