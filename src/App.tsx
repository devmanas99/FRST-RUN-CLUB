/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ClubProvider } from './context/ClubContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RunsPage } from './pages/RunsPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { RecordPage } from './pages/RecordPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { RunnerProfilePage } from './pages/RunnerProfilePage';
import { RewardsPage } from './pages/RewardsPage';
import { LoginPage } from './pages/LoginPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <ClubProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="runs/:id" element={<RunDetailPage />} />
            <Route path="record" element={<RecordPage />} />
            <Route path="board" element={<LeaderboardPage />} />
            <Route path="runner/:uid" element={<RunnerProfilePage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClubProvider>
  );
}
