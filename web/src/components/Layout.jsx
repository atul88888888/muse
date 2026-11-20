import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getTenant, clearSession } from '../api';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/companies', label: 'Companies' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/matches', label: 'Matches' },
  { to: '/outreach', label: 'Outreach' },
  { to: '/deals', label: 'Deals & Royalties' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const tenant = getTenant();
  const navigate = useNavigate();

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="app">
      <div className="sidebar">
        <h1>{tenant?.name || 'Sync Licensing'}</h1>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}>
            {l.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <button className="secondary" onClick={logout}>Log out</button>
      </div>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
