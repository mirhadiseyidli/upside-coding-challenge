import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import { parseAsLocalDate, toLocalDateString, extractDateFromTimestamp, isSameLocalDate } from '../utils/dateUtils';

export interface ActivityEvent {
  id: number;
  timestamp: string;
  activity: string;
  channel: string;
  status: string;
  people: Array<{
    id?: string;
    person_id?: string;
    first_name?: string;
    last_name?: string;
    email_address?: string;
  }>;
  involved_team_ids: string[];
  direction: string;
  customer_org_id: string;
  account_id: string;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface FirstTouchpoint {
  person_id: string;
  person_name: string;
  email: string;
  timestamp: string;
  activity: string;
  channel: string;
}

interface UseActivityDataProps {
  customerOrgId: string;
  accountId: string;
}

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance outside the hook to prevent recreation
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export function useActivityData({ customerOrgId, accountId }: UseActivityDataProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [firstTouchpoints, setFirstTouchpoints] = useState<FirstTouchpoint[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false); // Track loading state to prevent multiple requests

  // Fetch daily counts for minimap
  const fetchDailyCounts = useCallback(async () => {
    if (!customerOrgId || !accountId) return;
    
    try {
      console.log('Fetching daily counts from:', `${API_BASE_URL}/api/events/counts/`);
      const response = await apiClient.get('/api/events/counts/', {
        params: {
          customer_org_id: customerOrgId,
          account_id: accountId,
          direction: 'IN'
        }
      });
      console.log('Daily counts response:', response.data);
      setDailyCounts(response.data.daily_counts);
    } catch (error) {
      console.error('Error fetching daily counts:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status
        });
      }
    }
  }, [customerOrgId, accountId]);

  // Fetch first touchpoints for minimap
  const fetchFirstTouchpoints = useCallback(async () => {
    if (!customerOrgId || !accountId) return;
    
    try {
      const response = await apiClient.get('/api/events/first-touchpoints/', {
        params: {
          customer_org_id: customerOrgId,
          account_id: accountId
        }
      });
      console.log('First touchpoints response:', response.data.first_touchpoints);
      setFirstTouchpoints(response.data.first_touchpoints);
    } catch (error) {
      console.error('Error fetching first touchpoints:', error);
    }
  }, [customerOrgId, accountId]);

  // Fetch activity events with pagination
  const fetchEvents = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!customerOrgId || !accountId) return;
    
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      console.log('Request already in progress, skipping');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    loadingRef.current = true;

    try {
      console.log('Fetching events from:', `${API_BASE_URL}/api/events/`, 'page:', page, 'append:', append);
      const response = await apiClient.get('/api/events/', {
        params: {
          customer_org_id: customerOrgId,
          account_id: accountId,
          page: page,
          page_size: 50
        },
        signal: abortControllerRef.current.signal
      });

      console.log('Events response:', {
        eventsReceived: response.data.events.length,
        pagination: response.data.pagination,
        currentPage: response.data.pagination.current_page,
        totalPages: response.data.pagination.total_pages,
        hasNext: response.data.pagination.has_next,
        totalCount: response.data.pagination.total_count
      });
      
      if (append) {
        setEvents(prev => {
          const existingIds = new Set(prev.map(event => event.id));
          const newEvents = response.data.events.filter((event: ActivityEvent) => !existingIds.has(event.id));
          console.log(`Filtering duplicates: ${response.data.events.length} received, ${newEvents.length} new, ${prev.length} existing, total after: ${prev.length + newEvents.length}`);
          return [...prev, ...newEvents];
        });
      } else {
        setEvents(response.data.events);
        console.log('Set initial events:', response.data.events.length);
      }
      
      const hasNext = response.data.pagination.has_next;
      setHasMore(hasNext);
      setCurrentPage(page);
      console.log('Updated state - hasMore:', hasNext, 'currentPage:', page);
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request was cancelled');
      } else {
        console.error('Error fetching events:', error);
        if (axios.isAxiosError(error)) {
          console.error('Axios error details:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url
          });
        }
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
      console.log('Fetch completed, loading set to false');
    }
  }, [customerOrgId, accountId]);

  // Load more events (for infinite scroll)
  const loadMore = useCallback(() => {
    console.log('loadMore called - loadingRef.current:', loadingRef.current, 'hasMore:', hasMore, 'currentPage:', currentPage);
    if (!loadingRef.current && hasMore) {
      console.log('Calling fetchEvents for page:', currentPage + 1);
      fetchEvents(currentPage + 1, true);
    } else {
      console.log('Not calling fetchEvents:', {
        alreadyLoading: loadingRef.current,
        hasMore: hasMore,
        nextPage: currentPage + 1
      });
    }
  }, [hasMore, currentPage, fetchEvents]);

  // Fetch events for a specific date range
  const fetchEventsForDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!customerOrgId || !accountId) return [];
    
    try {
      console.log('Fetching events for date range:', startDate, 'to', endDate);
      const response = await apiClient.get('/api/events/', {
        params: {
          customer_org_id: customerOrgId,
          account_id: accountId,
          start_date: startDate,
          end_date: endDate,
          page_size: 1000 // Get more events for date range
        }
      });
      
      console.log('Date range events response:', {
        eventsReceived: response.data.events.length,
        dateRange: `${startDate} to ${endDate}`
      });
      
      return response.data.events;
    } catch (error) {
      console.error('Error fetching events for date range:', error);
      return [];
    }
  }, [customerOrgId, accountId]);

  // Navigate to a specific date by scrolling to it in the table
  const navigateToDate = useCallback(async (targetDate: string) => {
    console.log('Navigating to date:', targetDate);
    
    // First, check if the target date is already in loaded events
    const targetDateObj = parseAsLocalDate(targetDate);
    const existingEvent = events.find(event => {
      const eventDate = parseAsLocalDate(event.timestamp);
      return isSameLocalDate(eventDate, targetDateObj);
    });
    
    if (existingEvent) {
      console.log('Target date found in existing events');
      return targetDate; // Let the table handle scrolling to existing event
    }
    
    // If not found, we need to fetch events around this date
    console.log('Target date not in loaded events, fetching data...');
    
    // Create a date range around the target date (±30 days)
    const startDate = new Date(targetDateObj.getTime() - (30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(targetDateObj.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const startDateStr = toLocalDateString(startDate);
    const endDateStr = toLocalDateString(endDate);
    
    // Fetch events for this date range
    const rangeEvents = await fetchEventsForDateRange(startDateStr, endDateStr);
    
    if (rangeEvents.length > 0) {
      // Merge new events with existing ones, removing duplicates
      setEvents(prev => {
        const existingIds = new Set(prev.map(event => event.id));
        const newEvents = rangeEvents.filter((event: ActivityEvent) => !existingIds.has(event.id));
        
        // Combine and sort all events by timestamp (using local date parsing)
        const combined = [...prev, ...newEvents].sort((a, b) => 
          parseAsLocalDate(a.timestamp).getTime() - parseAsLocalDate(b.timestamp).getTime()
        );
        
        console.log(`Merged events: ${prev.length} existing + ${newEvents.length} new = ${combined.length} total`);
        return combined;
      });
      
      // Small delay to allow React to re-render with new events
      setTimeout(() => {
        console.log('Events updated, ready for navigation');
      }, 100);
    }
    
    return targetDate;
  }, [events, fetchEventsForDateRange]);

  // Initial data fetch and reset state when customer changes
  useEffect(() => {
    // Reset state when customer/account changes
    setEvents([]);
    setCurrentPage(1);
    setHasMore(true);
    setDailyCounts([]);
    setFirstTouchpoints([]);
    
    // Only fetch if we have valid customer/account IDs
    if (customerOrgId && accountId) {
      fetchEvents();
      fetchDailyCounts();
      fetchFirstTouchpoints();
    }
  }, [customerOrgId, accountId, fetchEvents, fetchDailyCounts, fetchFirstTouchpoints]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    events,
    loading,
    hasMore,
    loadMore,
    dailyCounts,
    firstTouchpoints,
    navigateToDate,
  };
} 