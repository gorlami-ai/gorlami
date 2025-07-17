import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import './MainLayout.css';

export function MainLayout() {
  return (
    <div className="main-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}