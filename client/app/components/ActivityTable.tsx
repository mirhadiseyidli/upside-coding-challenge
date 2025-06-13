'use client';

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ActivityEvent } from '../hooks/useActivityData';
import { parseAsLocalDate } from '../utils/dateUtils';

interface ActivityTableProps {
  events: ActivityEvent[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onVisibleDateRangeChange: (start: string | null, end: string | null) => void;
}

// Helper function to format relative time
function getRelativeTime(current: string, previous?: string): string {
  const currentDate = new Date(current);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - currentDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (previous) {
    const prevDate = new Date(previous);
    const daysDiff = Math.abs(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 1) {
      return `${Math.ceil(daysDiff)} day gap`;
    }
  }

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return `${Math.ceil(diffDays / 30)} months ago`;
}

// Helper function to format people names
function formatPeople(people: ActivityEvent['people']): { name: string; email?: string }[] {
  if (!people || people.length === 0) return [];
  
  return people.map(person => ({
    name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown',
    email: person.email_address
  }));
}

const ActivityTable = forwardRef<
  { scrollToDate: (date: string) => void },
  ActivityTableProps
>(function ActivityTable({
  events,
  loading,
  hasMore,
  onLoadMore,
  onVisibleDateRangeChange
}, ref) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose scrollToDate function via ref
  useImperativeHandle(ref, () => ({
    scrollToDate: (targetDate: string) => {
      console.log('ScrollToDate called with:', targetDate);
      
      if (!tableRef.current || events.length === 0) {
        console.log('No table ref or events available');
        return;
      }
      
      // Create a date map for faster lookups
      const eventsByDate = new Map<string, { event: ActivityEvent; index: number }[]>();
      events.forEach((event, index) => {
        const eventDateStr = new Date(event.timestamp).toDateString();
        if (!eventsByDate.has(eventDateStr)) {
          eventsByDate.set(eventDateStr, []);
        }
        eventsByDate.get(eventDateStr)!.push({ event, index });
      });
      
      // Look for exact date match first
      const targetDateStr = new Date(targetDate).toDateString();
      const exactMatches = eventsByDate.get(targetDateStr);
      
      let targetIndex = 0;
      
      if (exactMatches && exactMatches.length > 0) {
        console.log(`Found ${exactMatches.length} events for exact date:`, targetDateStr);
        // Use the first event of that date
        targetIndex = exactMatches[0].index;
      } else {
        console.log('No exact date match, finding closest event');
        // Find the closest event by timestamp
        const targetTime = new Date(targetDate).getTime();
        let closestTimeDiff = Infinity;
        
        events.forEach((event, index) => {
          const eventTime = new Date(event.timestamp).getTime();
          const timeDiff = Math.abs(eventTime - targetTime);
          if (timeDiff < closestTimeDiff) {
            closestTimeDiff = timeDiff;
            targetIndex = index;
          }
        });
        
        console.log(`Closest event found at index ${targetIndex}, time diff: ${closestTimeDiff}ms`);
      }
      
      // Scroll to the target event row
      const tbody = tableRef.current.querySelector('tbody');
      if (tbody && tbody.children[targetIndex]) {
        const targetRow = tbody.children[targetIndex] as HTMLElement;
        console.log(`Scrolling to row ${targetIndex}`);
        
        targetRow.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Highlight the row briefly
        targetRow.style.backgroundColor = '#3b82f6';
        targetRow.style.color = 'white';
        targetRow.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
          targetRow.style.backgroundColor = '';
          targetRow.style.color = '';
        }, 2000);
        
        console.log('Navigation completed to row:', targetIndex);
      } else {
        console.log('Could not find row element for index:', targetIndex);
      }
    }
  }));

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log('Intersection detected - hasMore:', hasMore, 'loading:', loading, 'events length:', events.length);
          
          // Clear any existing timeout
          if (loadMoreTimeoutRef.current) {
            clearTimeout(loadMoreTimeoutRef.current);
          }
          
          // Debounce the load more call
          loadMoreTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to load more - hasMore:', hasMore, 'loading:', loading);
            if (hasMore && !loading) {
              console.log('Calling onLoadMore()');
              onLoadMore();
            } else {
              console.log('Not loading more:', { hasMore, loading });
            }
          }, 500); // 500ms debounce
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, [hasMore, loading, onLoadMore, events.length]); // Include dependencies so observer gets fresh values

  // Track visible date range
  const updateVisibleDateRange = useCallback(() => {
    console.log('updateVisibleDateRange called', { 
      hasTableRef: !!tableRef.current, 
      eventsLength: events.length 
    });
    
    if (!tableRef.current || events.length === 0) return;

    const container = tableRef.current;
    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    const containerRect = container.getBoundingClientRect();
    const visibleEvents: ActivityEvent[] = [];

    console.log('Container bounds:', {
      top: containerRect.top,
      bottom: containerRect.bottom,
      height: containerRect.height
    });

    // Check each row to see if it's visible
    Array.from(tbody.children).forEach((row, index) => {
      const rowRect = row.getBoundingClientRect();
      // Check if row intersects with the visible container area (more lenient)
      const isVisible = rowRect.bottom > containerRect.top && 
                       rowRect.top < containerRect.bottom;
      
      if (index < 5) { // Debug first few rows
        console.log(`Row ${index} visibility:`, {
          rowTop: rowRect.top,
          rowBottom: rowRect.bottom,
          containerTop: containerRect.top,
          containerBottom: containerRect.bottom,
          isVisible,
          eventTimestamp: events[index]?.timestamp
        });
      }
      
      if (isVisible && events[index]) {
        visibleEvents.push(events[index]);
      }
    });

    console.log('Visible events found:', visibleEvents.length);

    if (visibleEvents.length > 0) {
      // Sort by timestamp to get earliest and latest (using local date parsing)
      const sortedEvents = visibleEvents.sort((a, b) => 
        parseAsLocalDate(a.timestamp).getTime() - parseAsLocalDate(b.timestamp).getTime()
      );
      const startDate = sortedEvents[0].timestamp;
      const endDate = sortedEvents[sortedEvents.length - 1].timestamp;
      
      console.log('Activity Table - Visible date range updated:', {
        visibleEventsCount: visibleEvents.length,
        startDate,
        endDate,
        startLocalDate: parseAsLocalDate(startDate).toLocaleDateString(),
        endLocalDate: parseAsLocalDate(endDate).toLocaleDateString()
      });
      
      onVisibleDateRangeChange(startDate, endDate);
    } else {
      console.log('Activity Table - No visible events detected');
      
      // Fallback: if no events are detected as visible but we have events,
      // use the first few events as a reasonable approximation
      if (events.length > 0) {
        console.log('Using fallback: first few events');
        const fallbackEvents = events.slice(0, Math.min(5, events.length));
        const sortedEvents = fallbackEvents.sort((a, b) => 
          parseAsLocalDate(a.timestamp).getTime() - parseAsLocalDate(b.timestamp).getTime()
        );
        const startDate = sortedEvents[0].timestamp;
        const endDate = sortedEvents[sortedEvents.length - 1].timestamp;
        
        console.log('Activity Table - Using fallback date range:', {
          fallbackEventsCount: fallbackEvents.length,
          startDate,
          endDate
        });
        
        onVisibleDateRangeChange(startDate, endDate);
      } else {
        // Still call the callback with null to clear any existing range
        onVisibleDateRangeChange(null, null);
      }
    }
  }, []); // Remove dependencies to prevent infinite loops

  // Update visible range on scroll
  useEffect(() => {
    const handleScroll = () => {
      updateVisibleDateRange();
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
      // Initial update
      setTimeout(updateVisibleDateRange, 100); // Delay initial update to avoid loops
      
      return () => {
        tableElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, []); // Remove updateVisibleDateRange from dependencies

  // Separate effect for when events change
  useEffect(() => {
    const timeoutId = setTimeout(updateVisibleDateRange, 100);
    return () => clearTimeout(timeoutId);
  }, [events.length]); // Only when events array length changes

  return (
    <div 
      ref={tableRef}
      className="overflow-auto max-h-[600px]"
    >
      <table className="w-full">
        <thead className="sticky top-0 bg-white dark:bg-[#0a0a0a] border-b border-black/[.08] dark:border-white/[.145]">
          <tr>
            <th className="text-left p-4 font-medium text-sm">Date</th>
            <th className="text-left p-4 font-medium text-sm">Activity</th>
            <th className="text-left p-4 font-medium text-sm">People</th>
            <th className="text-left p-4 font-medium text-sm">Channel</th>
            <th className="text-left p-4 font-medium text-sm">Status</th>
            <th className="text-left p-4 font-medium text-sm">Teams</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => {
            const people = formatPeople(event.people);
            const previousEvent = index > 0 ? events[index - 1] : undefined;
            const relativeTime = getRelativeTime(event.timestamp, previousEvent?.timestamp);
            const eventDate = parseAsLocalDate(event.timestamp);

            return (
              <tr 
                key={`${event.id}-${index}`}
                className="border-b border-black/[.05] dark:border-white/[.1] hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors"
              >
                <td className="p-4 align-top">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {eventDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-foreground/60">
                      {eventDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {relativeTime.includes('gap') && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {relativeTime}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="p-4 align-top">
                  <div className="text-sm max-w-xs">
                    {event.activity || 'No description'}
                  </div>
                </td>
                
                <td className="p-4 align-top">
                  <div className="space-y-1">
                    {people.length > 0 ? (
                      people.map((person, idx) => (
                        <div 
                          key={idx}
                          className="text-sm"
                          title={person.email ? `Email: ${person.email}` : 'No email available'}
                        >
                          <span className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {person.name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-foreground/60">No people</div>
                    )}
                  </div>
                </td>
                
                <td className="p-4 align-top">
                  <span className="text-sm font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md">
                    {event.channel}
                  </span>
                </td>
                
                <td className="p-4 align-top">
                  <span className={`text-sm font-medium px-2 py-1 rounded-md ${
                    event.status.toLowerCase().includes('success') || event.status.toLowerCase().includes('sent')
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : event.status.toLowerCase().includes('error') || event.status.toLowerCase().includes('failed')
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}>
                    {event.status}
                  </span>
                </td>
                
                <td className="p-4 align-top">
                  <div className="space-y-1">
                    {event.involved_team_ids.length > 0 ? (
                      event.involved_team_ids.map((teamId, idx) => (
                        <div key={idx} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-md inline-block mr-1">
                          {teamId}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-foreground/60">No teams</div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Loading indicator and infinite scroll trigger */}
      <div ref={loadMoreRef} className="p-4 text-center">
        {loading && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
            <span className="text-sm text-foreground/60">Loading more activities...</span>
          </div>
        )}
        {!hasMore && events.length > 0 && (
          <div className="text-sm text-foreground/60">
            No more activities to load
          </div>
        )}
        {!loading && events.length === 0 && (
          <div className="text-sm text-foreground/60">
            No activities found
          </div>
        )}
      </div>
    </div>
  );
});

export default ActivityTable; 