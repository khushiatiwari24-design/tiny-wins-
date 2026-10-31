import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { JourneyPlannerPage } from './pages/JourneyPlannerPage';
import { CrowdForecastPage } from './pages/CrowdForecastPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SavedRoutesPage } from './pages/SavedRoutesPage';
import { AccessibilityPage } from './pages/AccessibilityPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/plan" element={<JourneyPlannerPage />} />
        <Route path="/forecast" element={<CrowdForecastPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/saved" element={<SavedRoutesPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
