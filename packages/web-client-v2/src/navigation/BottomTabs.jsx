// Edited by Claude.
// BottomTabs: sticky footer navigation with declarative tab configuration
// Uses react-router-dom NavLink for active state management
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BottomTabs = ({ tabs, className }) => {
  return (
    <nav
      className={cn(
        'sticky bottom-0 z-50 border-t border-border bg-background',
        className
      )}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.name}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
              aria-label={tab.label}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="text-xs font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabs;
