'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type SidebarContextType = {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Initialize collapsed state from localStorage (lazy initialization)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === '1';
    } catch {
      return false;
    }
  });
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      // Reset collapsed state on mobile
      if (mobile) {
        setIsCollapsed(false);
      }
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Persist collapse preference (desktop only) - combined into single effect
  useEffect(() => {
    if (isMobile) return;
    try {
      localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [isCollapsed, isMobile]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleSidebar, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
