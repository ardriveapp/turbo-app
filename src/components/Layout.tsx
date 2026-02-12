import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Banner from './Banner';

export function Layout() {
  return (
    <div
      className="min-h-screen text-foreground flex flex-col"
      style={{
        // Page background: white fading to lavender (matches ar.io public site)
        // 4-stop gradient: white solid (0-33%), transition (33-66%), lavender solid (66-100%)
        background: 'linear-gradient(to bottom, rgb(255 255 255) 0%, rgb(255 255 255) 33%, rgb(223 214 247) 66%, rgb(223 214 247) 100%)',
      }}
    >
      {/* Announcement Banner */}
      <Banner />

      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border/20">
        <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 w-full">
          <Header />
        </div>
      </div>

      {/* Main Content with proper spacing */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 w-full">
          <div className="pt-6 sm:pt-8 pb-3 sm:pb-4 mb-6 sm:mb-8">
            <Outlet />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}