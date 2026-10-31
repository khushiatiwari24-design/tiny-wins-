import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  Users,
  Clock,
  Layers,
  ShieldCheck,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CORRIDOR_ANALYTICS, CONGESTION_RANKINGS } from '../data/demoData';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { MetricCard } from '../components/common/MetricCard';

export const AnalyticsPage: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<'peak' | 'utilization'>('peak');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      corridors: CORRIDOR_ANALYTICS,
      stationCongestion: CONGESTION_RANKINGS,
      generatedAt: new Date().toISOString(),
      city: 'Mumbai',
      version: 'CrowdSense v2.4 Demo Dataset',
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `crowdsense_mumbai_analytics_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <DemoDataNotice />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-teal-600" />
            <span>Transit Analytics & Congestion Insights</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cross-corridor load distribution, rush hour comparisons, and station congestion benchmarks
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloadSuccess ? 'Exported JSON!' : 'Export Dataset'}</span>
        </button>
      </div>

      {/* High-level summary metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Busiest Inter-rail Hub"
          value="Dadar Jct."
          icon={<Flame className="w-4 h-4 text-rose-500" />}
          changeLabel="96% Peak Volume"
          changePositive={false}
          tooltip="Dadar connects Central & Western Railways with the highest pedestrian transfer volume"
          subtext="680k daily footfalls"
        />

        <MetricCard
          title="Most Punctual Line"
          value="99.8%"
          unit="on-time"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
          changeLabel="Metro Line 3"
          changePositive={true}
          tooltip="Underground Aqua line with CBTC automation"
          subtext="BKC to SEEPZ corridor"
        />

        <MetricCard
          title="Peak Overcrowding Rate"
          value="118%"
          icon={<Users className="w-4 h-4 text-amber-500" />}
          changeLabel="Central Fast"
          changePositive={false}
          tooltip="Calculated vs nominal seated+standing passenger capacity during 08:30-10:00 AM"
          subtext="Thane - CSMT Trunk"
        />

        <MetricCard
          title="Avg Commute Dwell"
          value="48s"
          unit="per halt"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          changeLabel="Standardized"
          changePositive={true}
          tooltip="Average platform dwell time at major junctions"
          subtext="Suburban EMU fleet"
        />
      </section>

      {/* Corridor Rush Comparison Chart (Recharts) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Corridor Passenger Density: AM vs PM Rush
            </h2>
            <p className="text-xs text-slate-500">
              Comparative occupancy percentages across Mumbai’s key arterial transit lines
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedMetric('peak')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedMetric === 'peak'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs font-bold'
                  : 'text-slate-500'
              }`}
            >
              Peak Occupancy %
            </button>
            <button
              onClick={() => setSelectedMetric('utilization')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedMetric === 'utilization'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs font-bold'
                  : 'text-slate-500'
              }`}
            >
              Capacity Utilization %
            </button>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={CORRIDOR_ANALYTICS}
              margin={{ top: 20, right: 20, left: -10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-15}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={[0, selectedMetric === 'peak' ? 100 : 130]}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
                        <div className="font-bold text-teal-400">{d.name}</div>
                        <div className="pt-1 flex justify-between gap-4">
                          <span className="text-slate-400">AM Peak Load:</span>
                          <span className="font-semibold text-rose-300">{d.amPeak}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">PM Peak Load:</span>
                          <span className="font-semibold text-amber-300">{d.pmPeak}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Off-Peak Load:</span>
                          <span className="font-semibold text-emerald-300">{d.offPeak}%</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 text-[11px]">
                          <span className="text-slate-400">Punctuality:</span>
                          <span className="font-semibold text-white">{d.punctuality}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              {selectedMetric === 'peak' ? (
                <>
                  <Bar dataKey="amPeak" name="AM Morning Rush (08:30-10:30)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pmPeak" name="PM Evening Rush (17:30-20:30)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="offPeak" name="Off-Peak Valley (12:00-16:00)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </>
              ) : (
                <Bar dataKey="capacityUtilization" name="Design Capacity Utilization (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Station Congestion Index Ranking Table */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Mumbai Station Congestion Index Ranking
            </h2>
            <p className="text-xs text-slate-500">
              Ranked by peak passenger crush load and platform turnaround congestion
            </p>
          </div>
          <span className="text-xs text-slate-400">Updated from synthetic station models</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Station Name</th>
                <th className="py-3 px-3">Corridor Lines</th>
                <th className="py-3 px-3">Peak Occupancy</th>
                <th className="py-3 px-3">Avg Platform Delay</th>
                <th className="py-3 px-3">Est. Daily Footfall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {CONGESTION_RANKINGS.map((item) => (
                <tr key={item.rank} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                    #{item.rank}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {item.station}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">{item.line}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        item.peakOccupancy >= 90
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {item.peakOccupancy}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {item.avgWaitSec}s
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {item.dailyFootfall}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
