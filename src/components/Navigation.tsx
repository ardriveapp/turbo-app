import { NavLink } from 'react-router-dom';
import {
  Home,
  CreditCard,
  Gift,
  Upload,
  Globe,
  Share2,
  Ticket
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/top-up', label: 'Top Up', icon: CreditCard },
  { path: '/gift', label: 'Gift', icon: Gift },
  { path: '/redeem', label: 'Redeem', icon: Ticket },
  { path: '/share', label: 'Share', icon: Share2 },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/arns', label: 'ArNS', icon: Globe },
];

export function Navigation() {
  return (
    <nav className="border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex space-x-1 overflow-x-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'tab-active' 
                    : 'tab-inactive'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}