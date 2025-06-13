'use client';

import { useMemo, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Cell,
  BarChart,
  ReferenceArea,
  ComposedChart,
  Bar
} from 'recharts';
import { DailyCount, FirstTouchpoint } from '../hooks/useActivityData';
import { parseAsLocalDate, toLocalDateString, extractDateFromTimestamp, isSameLocalDate } from '../utils/dateUtils';

type DateRangeFilter = 'auto' | 'short' | 'medium' | 'long';

interface ActivityMinimapProps {
  dailyCounts: DailyCount[];
  firstTouchpoints: FirstTouchpoint[];
  visibleDateRange: { start: string | null; end: string | null };
  onDateClick: (date: string) => void;
  dateRangeFilter?: DateRangeFilter;
  onDateRangeFilterChange?: (filter: DateRangeFilter) => void;
}

interface ChartDataPoint {
  date: string;
  count: number;
  dateObj: Date;
  formattedDate: string;
  isFirstTouchpoint?: boolean;
  touchpointData?: FirstTouchpoint;
}

export default function ActivityMinimap({
  dailyCounts,
  firstTouchpoints,
  visibleDateRange,
  onDateClick,
  dateRangeFilter = 'auto',
  onDateRangeFilterChange
}: ActivityMinimapProps) {
  // Format date based on filter
  const formatDateForFilter = (date: Date, filter: DateRangeFilter): string => {
    switch (filter) {
      case 'short':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'medium':
        return date.toLocaleDateString('en-US', { month: 'short' });
      case 'long':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      case 'auto':
      default:
        // Auto-determine based on date range
        const now = new Date();
        const totalDays = Math.abs((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (totalDays <= 30) {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (totalDays <= 365) {
          return date.toLocaleDateString('en-US', { month: 'short' });
        } else {
          return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (dailyCounts.length === 0) return [];

    // Sort daily counts by date (using local date parsing)
    const sortedCounts = [...dailyCounts].sort((a, b) => 
      parseAsLocalDate(a.date).getTime() - parseAsLocalDate(b.date).getTime()
    );

    // Create a map of first touchpoints by local date
    const touchpointsByDate = new Map<string, FirstTouchpoint[]>();
    firstTouchpoints.forEach(tp => {
      const localDateKey = extractDateFromTimestamp(tp.timestamp);
      if (!touchpointsByDate.has(localDateKey)) {
        touchpointsByDate.set(localDateKey, []);
      }
      touchpointsByDate.get(localDateKey)!.push(tp);
    });

    // Aggregate data based on filter granularity
    const aggregatedData = new Map<string, {
      count: number;
      touchpoints: FirstTouchpoint[];
      dates: string[];
      representativeDate: string;
    }>();

    sortedCounts.forEach(item => {
      const dateObj = parseAsLocalDate(item.date);
      let aggregationKey: string;
      
      switch (dateRangeFilter) {
        case 'short':
          // Weekly aggregation - group by week starting Monday
          const weekStart = new Date(dateObj);
          const dayOfWeek = weekStart.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
          weekStart.setDate(weekStart.getDate() - daysToMonday);
          aggregationKey = toLocalDateString(weekStart);
          break;
          
        case 'medium':
          // Monthly aggregation
          aggregationKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`;
          break;
          
        case 'long':
          // Quarterly aggregation
          const quarter = Math.floor(dateObj.getMonth() / 3);
          const quarterStartMonth = quarter * 3;
          aggregationKey = `${dateObj.getFullYear()}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`;
          break;
          
        case 'auto':
        default:
          // Auto mode - use original daily data (but ensure consistent date format)
          aggregationKey = toLocalDateString(dateObj);
          break;
      }

      if (!aggregatedData.has(aggregationKey)) {
        aggregatedData.set(aggregationKey, {
          count: 0,
          touchpoints: [],
          dates: [],
          representativeDate: aggregationKey
        });
      }

      const bucket = aggregatedData.get(aggregationKey)!;
      bucket.count += item.count;
      bucket.dates.push(toLocalDateString(dateObj));
      
      // Add touchpoints for this date (using local date matching)
      const localDate = toLocalDateString(dateObj);
      const dayTouchpoints = touchpointsByDate.get(localDate) || [];
      bucket.touchpoints.push(...dayTouchpoints);
    });

    // Convert aggregated data to chart format
    return Array.from(aggregatedData.entries()).map(([key, data]) => {
      const dateObj = parseAsLocalDate(data.representativeDate);
      
      return {
        date: data.representativeDate,
        count: data.count,
        dateObj,
        formattedDate: formatDateForFilter(dateObj, dateRangeFilter),
        touchpoints: data.touchpoints,
        hasFirstTouchpoint: data.touchpoints.length > 0,
        touchpointCount: data.touchpoints.length,
        aggregatedDates: data.dates // Keep track of which dates were aggregated
      };
    }).sort((a, b) => parseAsLocalDate(a.date).getTime() - parseAsLocalDate(b.date).getTime());
  }, [dailyCounts, firstTouchpoints, dateRangeFilter]);

  // Calculate visible range positions for highlighting
  const visibleRangeData = useMemo(() => {
    console.log('Visible range data:', {
      start: visibleDateRange.start,
      end: visibleDateRange.end,
      chartDataLength: chartData.length
    });
    if (!visibleDateRange.start || !visibleDateRange.end || chartData.length === 0) {
      console.log('No visible range data:', { 
        start: visibleDateRange.start, 
        end: visibleDateRange.end, 
        chartDataLength: chartData.length 
      });
      return { startDate: null, endDate: null };
    }

    // Convert timestamps to local dates for comparison
    const startLocalDate = extractDateFromTimestamp(visibleDateRange.start);
    const endLocalDate = extractDateFromTimestamp(visibleDateRange.end);

    // Get the actual date range of chart data for bounds checking
    const chartStartDate = chartData.length > 0 ? chartData[0].date : null;
    const chartEndDate = chartData.length > 0 ? chartData[chartData.length - 1].date : null;

    console.log('Visible range calculation:', {
      originalStart: visibleDateRange.start,
      originalEnd: visibleDateRange.end,
      startLocalDate,
      endLocalDate,
      chartStartDate,
      chartEndDate,
      chartDataLength: chartData.length
    });

    // Use the actual visible timeline dates directly for highlighting
    // This ensures the background highlights even if no data exists for those dates
    // But ensure they fall within the chart's date range for proper rendering
    let highlightStart = startLocalDate;
    let highlightEnd = endLocalDate;
    
    // If we have chart data, ensure highlight dates are within chart bounds
    if (chartStartDate && chartEndDate) {
      if (highlightStart < chartStartDate) highlightStart = chartStartDate;
      if (highlightEnd > chartEndDate) highlightEnd = chartEndDate;
      if (highlightStart > chartEndDate || highlightEnd < chartStartDate) {
        // No overlap between visible range and chart data
        console.log('No overlap between visible range and chart data');
        return { startDate: null, endDate: null };
      }
    }
    
    const result = {
      startDate: highlightStart,
      endDate: highlightEnd
    };
    
    console.log('Final visible range result:', {
      ...result,
      willHighlight: result.startDate && result.endDate
    });
    return result;
  }, [chartData, visibleDateRange]);

  // Add highlight information to chart data
  const chartDataWithHighlight = useMemo(() => {
    // Simplified highlighting: if we have any visible range, highlight all data points
    const hasVisibleRange = visibleDateRange.start && visibleDateRange.end;
    const maxCount = chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 0;
    const highlightHeight = hasVisibleRange ? maxCount * 1.2 : 0;
    
    console.log('Simple highlight calculation:', {
      hasVisibleRange,
      maxCount,
      highlightHeight,
      visibleStart: visibleDateRange.start,
      visibleEnd: visibleDateRange.end
    });
    
    return chartData.map(d => ({
      ...d,
      isHighlighted: hasVisibleRange,
      highlightHeight: highlightHeight
    }));
  }, [chartData, visibleDateRange]);

  // Custom tick formatter for X-axis
  const formatXAxisTick = (tickItem: string, index: number) => {
    const dataPoint = chartDataWithHighlight.find(d => d.date === tickItem);
    return dataPoint ? dataPoint.formattedDate : tickItem;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Format date range for aggregated data
      const getDateRangeText = () => {
        if (dateRangeFilter === 'auto' || !data.aggregatedDates || data.aggregatedDates.length <= 1) {
          return parseAsLocalDate(data.date).toLocaleDateString();
        }
        
        const sortedDates = [...data.aggregatedDates].sort();
        const startDate = parseAsLocalDate(sortedDates[0]).toLocaleDateString();
        const endDate = parseAsLocalDate(sortedDates[sortedDates.length - 1]).toLocaleDateString();
        
        switch (dateRangeFilter) {
          case 'short':
            return `Week of ${startDate}`;
          case 'medium':
            return parseAsLocalDate(data.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          case 'long':
            const quarter = Math.floor(parseAsLocalDate(data.date).getMonth() / 3) + 1;
            const year = parseAsLocalDate(data.date).getFullYear();
            return `Q${quarter} ${year}`;
          default:
            return `${startDate} - ${endDate}`;
        }
      };
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{getDateRangeText()}</p>
          <p className="text-blue-600">Activities: {data.count}</p>
          {data.aggregatedDates && data.aggregatedDates.length > 1 && (
            <p className="text-xs text-gray-500">
              Aggregated from {data.aggregatedDates.length} days
            </p>
          )}
          {data.touchpoints && data.touchpoints.length > 0 && (
            <div className="mt-2">
              <p className="text-amber-600 font-medium">First Touchpoints: {data.touchpoints.length}</p>
              {data.touchpoints.slice(0, 3).map((tp: FirstTouchpoint, idx: number) => (
                <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                  {tp.person_name} ({tp.email})
                </p>
              ))}
              {data.touchpoints.length > 3 && (
                <p className="text-xs text-gray-500">+{data.touchpoints.length - 3} more</p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Handle chart click
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      onDateClick(data.activeLabel);
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-foreground/60">
        <div className="text-center">
          <div className="text-sm">No activity data available</div>
          <div className="text-xs mt-1">Start the Django server to load data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartDataWithHighlight}
            onClick={handleChartClick}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            {/* Dimmed bluish overlay for the currently visible date range */}
            <Bar 
              dataKey="highlightHeight" 
              fill="#2563eb"
              fillOpacity={0.12}
              stroke="none"
              isAnimationActive={false}
            />
            
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            
            <XAxis 
              dataKey="date"
              type="category"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxisTick}
              angle={-45}
              textAnchor="end"
              height={60}
              interval="preserveStartEnd"
              stroke="currentColor"
              fontSize={12}
            />
            <YAxis 
              stroke="currentColor"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Main activity line */}
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: '#3b82f6' }}
            />
            
            {/* First touchpoint markers */}
            <Line 
              type="monotone"
              dataKey="touchpointCount"
              stroke="transparent"
              dot={(props: any) => {
                if (props.payload.hasFirstTouchpoint) {
                  return (
                    <circle
                      key={`touchpoint-${props.payload.date}`}
                      cx={props.cx}
                      cy={20}
                      r={4}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="cursor-pointer hover:r-6"
                      onClick={() => onDateClick(props.payload.date)}
                    />
                  );
                }
                return <circle key={`empty-${props.payload.date}`} cx={props.cx} cy={props.cy} r={0} fill="transparent" />;
              }}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats and Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6 text-xs text-foreground/70">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span>Inbound Activities ({chartDataWithHighlight.reduce((sum, d) => sum + d.count, 0)} total)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full border border-white"></div>
            <span>First Touchpoints ({firstTouchpoints.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 bg-opacity-15 border border-blue-600 border-opacity-30"></div>
            <span>Visible Range</span>
          </div>
        </div>
        
        {visibleDateRange.start && visibleDateRange.end && (
          <div className="text-xs text-foreground/60">
            Viewing: {parseAsLocalDate(visibleDateRange.start).toLocaleDateString()} - {parseAsLocalDate(visibleDateRange.end).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
} 