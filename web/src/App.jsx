import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './auth/Login';
import Signup from './auth/Signup';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import TrackDetail from './pages/TrackDetail';
import Companies from './pages/Companies';
import Contacts from './pages/Contacts';
import Opportunities from './pages/Opportunities';
import Matches from './pages/Matches';
import Outreach from './pages/Outreach';
import Deals from './pages/Deals';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/:id" element={<TrackDetail />} />
        <Route path="companies" element={<Companies />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="matches" element={<Matches />} />
        <Route path="outreach" element={<Outreach />} />
        <Route path="deals" element={<Deals />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
