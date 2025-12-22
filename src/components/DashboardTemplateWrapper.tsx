'use client';

import { ReactNode, useState, useEffect } from 'react';

type DashboardTemplateWrapperProps = {
  widgetType: keyof WidgetVisibility;
  children: ReactNode;
};

type WidgetVisibility = {
  showMetrics: boolean;
  showCharts: boolean;
  showTimeline: boolean;
  showActivity: boolean;
  showServiceHealth: boolean;
  showPerformance: boolean;
  showComparison: boolean;
};

// Default visibility - show all widgets
const defaultVisibility: WidgetVisibility = {
  showMetrics: true,
  showCharts: true,
  showTimeline: true,
  showActivity: true,
  showServiceHealth: true,
  showPerformance: true,
  showComparison: true,
};

export default function DashboardTemplateWrapper({ widgetType, children }: DashboardTemplateWrapperProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Read visibility from localStorage
    const savedVisibility = localStorage.getItem('dashboard-widget-visibility');
    if (savedVisibility) {
      try {
        const visibility: WidgetVisibility = JSON.parse(savedVisibility);
        setIsVisible(visibility[widgetType] ?? true);
      } catch (e) {
        // If parsing fails, use default
        setIsVisible(defaultVisibility[widgetType] ?? true);
      }
    } else {
      // No saved visibility, show widget by default
      setIsVisible(defaultVisibility[widgetType] ?? true);
    }

    // Listen for template changes
    const handleTemplateChange = () => {
      const savedVisibility = localStorage.getItem('dashboard-widget-visibility');
      if (savedVisibility) {
        try {
          const visibility: WidgetVisibility = JSON.parse(savedVisibility);
          setIsVisible(visibility[widgetType] ?? true);
        } catch (e) {
          setIsVisible(defaultVisibility[widgetType] ?? true);
        }
      } else {
        setIsVisible(defaultVisibility[widgetType] ?? true);
      }
    };

    window.addEventListener('dashboard-template-changed', handleTemplateChange);
    return () => window.removeEventListener('dashboard-template-changed', handleTemplateChange);
  }, [widgetType]);

  // During SSR, show widget to prevent layout shift
  if (!isMounted) {
    return <>{children}</>;
  }

  // Only hide widget if explicitly set to false
  if (!isVisible) {
    return null;
  }

  return <>{children}</>;
}

