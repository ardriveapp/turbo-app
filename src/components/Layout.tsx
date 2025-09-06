import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export function Layout() {
  return (
    <div className="min-h-screen bg-canvas text-fg-muted flex flex-col">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-canvas/95 backdrop-blur-sm border-b border-default/20">
        <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 w-full">
          <Header />
        </div>
      </div>
      
      {/* Main Content with proper spacing */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 w-full">
          <div className="py-3 sm:py-4 mb-6 sm:mb-8">
            <Outlet />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}