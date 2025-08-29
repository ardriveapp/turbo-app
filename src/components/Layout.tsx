import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Navigation } from './Navigation';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}