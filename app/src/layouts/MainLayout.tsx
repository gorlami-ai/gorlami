import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export function MainLayout() {
  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-950 scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}