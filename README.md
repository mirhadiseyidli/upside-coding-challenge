# Take Home Assesment results:

1.  A Dropdown to select Customer and Account
2.  Minimap that shows Inbound Activities, First Touchpoints. 
      a. Scroll to clicked date
3.  Activity timeline shows all
      a. hover over name for email

# Bugs
1.  Times sometimes don't match (off by hours, assuming utc to local conversion issue)
2.  Background highlight based on the date range on Timeline doens't work. Mostly issue is I've never used Recharts library, didn't have enough time to debug

# Trade offs
1.  Trade-off: Used Bar component instead of ReferenceArea for highlighting
    Benefit: More reliable with categorical X-axis, better cross-browser support
    Cost: Less semantically correct (bars represent data, not ranges)
2.  Trade-off: Changed from "fully contained" to "any overlap" row detection
    Benefit: More responsive to user scrolling, catches edge cases
    Cost: May include partially hidden rows in calculations

# TODO
1.  Precise range highlighting - Replace all-or-nothing approach with exact date boundary highlighting using proper ReferenceArea or custom SVG overlay
2.  Debounced scroll handling - Add proper debouncing (300ms) to scroll events to reduce CPU usage and improve performance
3.  Memoize expensive calculations - Cache date parsing, aggregation, and highlight calculations with proper dependency tracking
4.  Optimize re-renders - Split chartDataWithHighlight into separate useMemo hooks to prevent unnecessary recalculations
5.  Background processing - Move heavy date calculations to Web Workers for large datasets
6.  Loading states - Add skeleton loading for minimap while data is being processed
8.  Remove debug logging - Clean up console.log statements for production build
9.  Type safety improvements - Add stricter TypeScript types for date ranges and chart data
10. Extract custom hooks - Move visibility detection logic to useVisibleDateRange hook
11. Error boundaries - Add error handling for chart rendering failures
12. Zoom controls - Add minimap zoom in/out functionality for different time scales
13. Export functionality - Allow users to export date range data
14. Make axios into api utility to handle calls necessary way and reuse

# Summary

1.  Architecture: Component-Based React with Custom Hooks
2.  Core Structure:
      ActivityTimeline (main container) → ActivityMinimap + ActivityTable + CustomerSelector
      Custom hooks (useActivityData, useCustomers) handle all data fetching and state management
      Utility functions (dateUtils) for consistent date parsing across components
3.  Data Flow:
      Customer selection triggers data fetching via useActivityData hook
      ActivityTable detects visible rows → reports date range to parent
      ActivityMinimap receives visible range → highlights background accordingly
      Click navigation flows: Minimap → Timeline → Table scroll
4.  Key Implementation Decisions:
      Data Layer:
      Axios-based API client with pagination, infinite scroll, and date range fetching
      Aggressive caching and deduplication to prevent duplicate events
      Fallback strategies for missing data and failed requests
5.  UI Components:
      Recharts ComposedChart for minimap (line + bars + markers)
      Intersection Observer for infinite scroll and visibility detection
      forwardRef pattern for parent-child communication (scroll commands)
      State Management:
        Local component state with useState for UI interactions
      Custom hooks encapsulate complex data logic and API calls
      Callback-based communication between sibling components via parent
6.  Performance Optimizations:
      useMemo for expensive chart data calculations and aggregations
      useCallback for stable function references and preventing re-renders
      Debounced scroll handlers and request cancellation via AbortController
7.  Real-time Sync Implementation:
      Scroll events → visibility detection → date range calculation → minimap highlighting (BUG)
      Simplified highlighting (all-or-nothing) for reliability over precision (BUG)
      Bidirectional navigation (minimap ↔ table) with smooth scrolling and visual feedback
8.  Trade-off: 
      Chose reliability and immediate feedback over pixel-perfect accuracy to ensure the feature always works across different data scenarios.