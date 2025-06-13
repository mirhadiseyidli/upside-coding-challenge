'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ActivityMinimap from './ActivityMinimap';
import ActivityTable from './ActivityTable';
import CustomerSelector from './CustomerSelector';
import { useActivityData } from '../hooks/useActivityData';
import { useCustomers } from '../hooks/useCustomers';

type DateRangeFilter = 'auto' | 'short' | 'medium' | 'long';

export default function ActivityTimeline() {
  const [visibleDateRange, setVisibleDateRange] = useState<{
    start: string | null;
    end: string | null;
  }>({ start: null, end: null });
  
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('auto');
  const [navigatingToDate, setNavigatingToDate] = useState(false);

  const tableRef = useRef<{ scrollToDate: (date: string) => void } | null>(null);

  // Customer selection
  const {
    customers,
    selectedCustomer,
    loading: customersLoading,
    error: customersError,
    selectCustomer
  } = useCustomers();

  const {
    events,
    loading,
    hasMore,
    loadMore,
    dailyCounts,
    firstTouchpoints,
    navigateToDate
  } = useActivityData({
    customerOrgId: selectedCustomer?.customer_org_id || '',
    accountId: selectedCustomer?.account_id || '',
  });

  const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
    setVisibleDateRange({ start, end });
  }, []);

  const handleMinimapClick = useCallback(async (date: string) => {
    console.log('Minimap clicked, navigating to date:', date);
    setNavigatingToDate(true);
    
    try {
      // First, call the hook's navigate function to ensure data is loaded
      await navigateToDate(date);
      
      // Small delay to ensure events are updated and rendered
      setTimeout(() => {
        if (tableRef.current) {
          console.log('Calling table scrollToDate for:', date);
          tableRef.current.scrollToDate(date);
        }
        setNavigatingToDate(false);
      }, 200);
    } catch (error) {
      console.error('Error navigating to date:', error);
      setNavigatingToDate(false);
    }
  }, [navigateToDate]);

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <CustomerSelector
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={selectCustomer}
        loading={customersLoading}
        error={customersError}
      />

      {/* Only show timeline if a customer is selected */}
      {selectedCustomer && (
        <>
          {/* Navigation Minimap - Sticky */}
          <div className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a] border border-black/[.08] dark:border-white/[.145] rounded-lg p-6 shadow-sm relative">
            {/* Navigation loading overlay */}
            {navigatingToDate && (
              <div className="absolute inset-0 bg-white/80 dark:bg-black/80 rounded-lg flex items-center justify-center z-20">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Navigating to date...</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Activity Overview</h2>
              <div className="flex items-center space-x-2">
                <label htmlFor="date-range-filter" className="text-sm text-foreground/70">
                  Range:
                </label>
                <select
                  id="date-range-filter"
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value as DateRangeFilter)}
                  className="text-sm border border-black/[.08] dark:border-white/[.145] rounded px-2 py-1 bg-white dark:bg-[#0a0a0a] text-foreground"
                  disabled={navigatingToDate}
                >
                  <option value="auto">Auto</option>
                  <option value="short">Short (Weekly)</option>
                  <option value="medium">Medium (Monthly)</option>
                  <option value="long">Long (Quarterly)</option>
                </select>
              </div>
            </div>
            <ActivityMinimap
              dailyCounts={dailyCounts}
              firstTouchpoints={firstTouchpoints}
              visibleDateRange={visibleDateRange}
              onDateClick={handleMinimapClick}
              dateRangeFilter={dateRangeFilter}
              onDateRangeFilterChange={setDateRangeFilter}
            />
          </div>

          {/* Activity Table */}
          <div className="bg-white dark:bg-[#0a0a0a] border border-black/[.08] dark:border-white/[.145] rounded-lg mt-6">
            <div className="p-6 border-b border-black/[.08] dark:border-white/[.145]">
              <h2 className="text-lg font-medium">Activity Timeline</h2>
              <p className="text-sm text-foreground/70 mt-1">
                Chronological list of all activity events
              </p>
            </div>
            
            <ActivityTable
              ref={tableRef}
              events={events}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onVisibleDateRangeChange={handleDateRangeChange}
            />
          </div>
        </>
      )}
    </div>
  );
} 