# Take-Home Assignment · Activity Timeline with Interactive Minimap

Welcome! This exercise is your opportunity to demonstrate how you build modern, interactive web applications with real-time data visualization and smooth user experience. Please time-box your effort to **≈ 2 hours for coding** and stop when that time is up.

---

## 1 · Problem Statement

You will work with a Django backend containing activity events and associated people data. Your task is to build the required backend APIs, and a React frontend that displays an interactive activity table and activity-over-time linechart.

### Core Requirements

Build a single-page application with two main components:

1. **Activity Timeline Table** – An infinite scroll list displaying all activity events, with columns for:
   * Date (with relative time indicators like "5 day gap")
   * Activity description
   * People involved (displayed as a name, showing email as a tooltip on hover)
   * Channel
   * Status
   * Teams

2. **Interactive Navigation Minimap** – A timeline chart above the table showing:
   * A line chart of day-level count of activities with `direction: "IN"` over time
   * Circular markers indicating the **first touchpoint per person** in the activity stream
   * Two blue vertical bars indicating the "active region" (earliest and latest dates of currently visible rows in the table)
   * Click-to-navigate functionality: clicking on a date in the minimap scrolls the table to that date
   * Real-time sync: as the user scrolls the table, the active region markers update to reflect the visible date range

---

## 2 · Deliverables

Submit a Git repository (GitHub link preferred) containing:

1. **Implementation**
   * Complete implementation of the activity timeline table with infinite scroll
   * Interactive navigation minimap with line chart and markers
   * Click-to-navigate and real-time sync functionality
   * Modern, clean UI style

2. **Updated README.md**
   * Brief summary of your implementation approach
   * List of TODOs or improvements you would make with more time
   * Any architectural decisions or trade-offs you made

---

## 3 · Time-boxing & Development Approach

We respect your time. Please **stop after ≈ 2 hours of hands-on coding**. It is expected that after 2 hours there will be features you want to polish or optimizations you want to make. That is **perfectly OK** – document these thoughts in your README.

### Recommended Approach:
* **Leverage AI development tools heavily** (Claude, Cursor, Windsurf, GitHub Copilot, etc.)
* Focus on core functionality first, polish later

### Acceptable Shortcuts:
* Use pre-built components rather than building from scratch
* Pre-loading data to the client

---

## 4 · Evaluation Criteria

| Dimension | What we look for |
|-----------|------------------|
| **Core Functionality** | Infinite scroll table works; minimap displays activity volume over time and person markers; basic click-to-navigate works |
| **User Experience** | Smooth scrolling; responsive design; visual feedback; intuitive interactions |
| **Code Quality** | Clean React patterns; reasonable component structure; proper state management |
| **Integration** | Effective use of the Django API; efficient data fetching; proper error handling |
| **Time Management** | Evidence of smart prioritization; documented TODOs; realistic scope for 2 hours |
| **AI Tool Usage** | Effective leverage of development tools |

---

## Reference Design

The target interface should resemble the screenshots in our blog, featuring:
- Clean, modern table layout with proper spacing
- Line chart minimap with clean date axes
- Circular markers for first touchpoints per person
- Blue active region indicators
- Smooth interactions and transitions

https://upside.tech/blog/two-radical-new-solutions-to-b2b-revenue-attribution

Good luck, and happy coding! 🚀