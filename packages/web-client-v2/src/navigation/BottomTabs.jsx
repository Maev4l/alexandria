// Edited by Claude.
// Floating navigation pill with glassmorphism effect
// Centered floating design with sliding active indicator
import { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BottomTabs = ({ tabs, className }) => {
  const location = useLocation();
  const navRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Find active tab index
  const activeIndex = tabs.findIndex((tab) => {
    // Check exact match or if current path starts with tab path (for nested routes)
    return location.pathname === tab.path ||
      (tab.path !== '/' && location.pathname.startsWith(tab.path + '/'));
  });

  // Update sliding indicator position when active tab changes
  useEffect(() => {
    if (navRef.current && activeIndex >= 0) {
      const navEl = navRef.current;
      const buttons = navEl.querySelectorAll('[data-tab-button]');
      const activeButton = buttons[activeIndex];

      if (activeButton) {
        const navRect = navEl.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        setIndicatorStyle({
          left: buttonRect.left - navRect.left,
          width: buttonRect.width,
        });
      }
    }
  }, [activeIndex, tabs]);

  return (
    <div className={cn(
      'sticky bottom-0 z-50 flex justify-center pb-6 pt-2 pointer-events-none',
      className
    )}>
      <nav
        ref={navRef}
        className={cn(
          'relative flex items-center gap-1 px-2 py-2 pointer-events-auto',
          // Glassmorphism pill
          'rounded-2xl',
          'bg-[var(--glass-bg)] backdrop-blur-xl',
          'border border-[var(--glass-border)]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_0_var(--glass-border)]'
        )}
      >
        {/* Sliding active indicator - behind buttons */}
        <div
          className="absolute top-2 bottom-2 rounded-xl bg-primary/15 transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
        />

        {/* Tab buttons */}
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.name}
              to={tab.path}
              data-tab-button
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center gap-0.5 px-5 py-2 rounded-xl',
                  'transition-colors duration-200',
                  'z-10', // Above the sliding indicator
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground active:text-foreground'
                )
              }
              aria-label={tab.label}
            >
              {Icon && (
                <Icon className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  // Subtle scale on active
                  location.pathname === tab.path && 'scale-110'
                )} />
              )}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomTabs;
