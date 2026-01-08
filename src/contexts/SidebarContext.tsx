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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Load collapse preference from localStorage (desktop only)
  useEffect(() => {
    if (isMobile) return;
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved === '1') setIsCollapsed(true);
      if (saved === '0') setIsCollapsed(false);
    } catch {
      // ignore
    }
  }, [isMobile]);

  // Persist collapse preference (desktop only)
  useEffect(() => {
    if (isMobile) return;
    try {
      localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [isCollapsed, isMobile]);

  // Reset collapsed state on mobile
  useEffect(() => {
    if (isMobile) setIsCollapsed(false);
  }, [isMobile]);

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
