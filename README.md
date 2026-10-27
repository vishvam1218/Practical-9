# Practical 8: React Performance Optimization & Lazy Loading

**Course**: Advanced Web Development Frameworks (ITUE301)  
**Student Name**: Vishvam Patel  
**Student ID**: 24IT110  
**Department**: Information Technology / Computer Science / AIML  
**Institution**: CSPIT / DEPSTAR, Charotar University of Science and Technology (CHARUSAT)  

---

## 1. Practical Title & Subject Code

- **Practical Title**: Performance Optimization and Lazy Loading in React
- **Subject Code**: ITUE301 (Advanced Web Development Frameworks)
- **Course Outcomes**: CO1 / PO3, PO5

---

## 2. Aim & Objectives

### Aim
To improve frontend performance and user experience in a React Single Page Application (SPA) using route-based code splitting, lazy loading, and runtime rendering optimizations.

### Key Objectives
1. **Route-Based Code Splitting**: Convert statically imported routes (`/projects`, `/contact`) to dynamic imports using `React.lazy()` and `Suspense`.
2. **Heavy Component Lazy Loading**: Dynamically import an interactive data visualization component (`ProjectAnalyticsChart`) only when explicitly requested by the user.
3. **Meaningful Fallback UI**: Design an accessible, non-blocking loading state with animated spinner and skeleton placeholders that keeps navigation usable during chunk downloads.
4. **Resilience & Error Handling**: Implement an `ErrorBoundary` to gracefully catch and retry failed dynamic chunk downloads.
5. **Demonstration Reliability**: Implement a minimum-delay fallback mechanism (`lazyWithDelay`) for clear viva demonstrations under variable network conditions.
6. **Rendering Optimization**: Identify and eliminate an avoidable re-render in the task list using `React.memo` and `useCallback`, verified with React DevTools Profiler.
7. **Empirical Measurement**: Measure, record, and compare bundle sizes and network telemetry before and after optimization.

---

## 3. Technologies Used

- **Frontend Core**: React 19 (`react`, `react-dom`)
- **Routing**: React Router v7 (`react-router-dom`)
- **Build Tool & Bundler**: Vite v8 (Rolldown engine)
- **Icons & UI Styling**: `lucide-react`, Vanilla CSS with Glassmorphism Design System
- **Profiling Tools**: Chrome DevTools (Network & Performance Tabs), React DevTools Profiler
- **Backend (Practical 7)**: Node.js, Express.js, JWT, bcryptjs, MongoDB / Mongoose

---

## 4. Original Application Architecture (Baseline)

In the unoptimized Practical 7 baseline, all components and pages were bundled into a single monolithic script:

```text
Before (Single Monolithic Bundle):
index.html ──► main.bundle.js (225.91 kB) ──► [Home / Tasks][Projects][Contact][Charts]
All code was downloaded and parsed on initial visit, regardless of whether
the user ever visited the Projects or Contact pages.
```

### Limitations of Baseline:
- **Large Initial Payload**: Slower First Contentful Paint (FCP) and Largest Contentful Paint (LCP) on mobile and slower 3G/4G connections.
- **Main Thread Contention**: Parsing unused JavaScript consumes CPU cycles during critical bootstrap time.
- **Bandwidth Waste**: Users who only manage daily tasks download code for forms and charts they never view.

---

## 5. Explanation of React.lazy(), Suspense, and Dynamic Imports

### 5.1 Dynamic `import()`
Standard ES module imports (`import Component from './Component'`) are static and evaluated at bundle time. In contrast, dynamic `import('./Component')` returns a JavaScript `Promise` that resolves to the module namespace object when evaluated at runtime. This tells the bundler (Vite / Rollup) to split the imported module into an independent chunk file.

### 5.2 `React.lazy()`
`React.lazy()` accepts a factory function returning a dynamic import promise and returns a React component that renders the dynamically loaded component once the promise resolves:
```javascript
const Projects = React.lazy(() => import('./pages/Projects'));
```
*Note*: `React.lazy()` requires the target module to have a **default export** (`export default function Projects()`).

### 5.3 `Suspense`
Because dynamic imports are asynchronous, React needs a declarative way to render fallback UI while the chunk downloads over the network. `<Suspense fallback={<LoadingFallback />}>` suspends the component subtree until the dynamic promise resolves, rendering the fallback seamlessly without crashing or requiring manual boolean loading flags.

---

## 6. Implementation Details: Projects and Contact Routes

In `src/App.jsx`, routes are split at the router boundary:

```javascript
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Eagerly loaded primary view (Home)
import Dashboard from './pages/Dashboard';

// Route-based dynamic imports
const Projects = lazy(() => import('./pages/Projects'));
const Contact = lazy(() => import('./pages/Contact'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback message="Downloading route module chunk on demand..." />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### Route Behavior:
1. Navigating to `/` only loads the entry bundle (`index.js`).
2. Navigating to `/projects` fetches `Projects-[hash].js` on demand.
3. Navigating to `/contact` fetches `Contact-[hash].js` on demand.
4. Subsequent visits to previously loaded routes execute instantly from browser cache with zero network overhead.

---

## 7. Additional Lazy-Loaded Component (Heavy Component)

In addition to route-level splitting, Practical 8 requires code-splitting an additional heavy component. We implemented `ProjectAnalyticsChart.jsx`, an interactive SVG sprint velocity and workload telemetry visualizer.

Inside `src/pages/Projects.jsx`:
```javascript
// Component-level dynamic import
const ProjectAnalyticsChart = lazy(() => import('../components/ProjectAnalyticsChart'));

// Loaded only when user clicks "Load Workload Analytics"
{showAnalytics && (
  <Suspense fallback={<LoadingFallback message="Downloading ProjectAnalyticsChart chunk on demand..." />}>
    <ProjectAnalyticsChart />
  </Suspense>
)}
```

### Benefits:
- The chart calculation and rendering code (`12.09 kB`) is never bundled into the Projects page chunk.
- It generates its own standalone chunk: `ProjectAnalyticsChart-seLfSKDH.js`.

---

## 8. Steps to Run the Application

### Prerequisites
- Node.js (v18+)
- npm

### 1. Start the Backend Server (from Practical 7)
```bash
cd backend
node server.js
```
The backend starts on `http://localhost:5001`.

### 2. Start the Frontend Development Server
```bash
cd frontend
npm run dev
```
Open `http://localhost:5174/` in your browser.

---

## 9. Steps to Create a Production Build

To inspect the generated code-split chunks:

```bash
cd frontend
npm run build
```

To run the production preview:
```bash
npm run preview
```
Open `http://localhost:4173/` in your browser.

---

## 10. Steps to Test Lazy Loading in Chrome DevTools

1. Open Google Chrome and navigate to `http://localhost:4173/`.
2. Press `F12` or `Cmd + Option + I` to open Developer Tools.
3. Switch to the **Network** tab.
4. Check **Disable cache** and click the **JS** filter button to show only JavaScript requests.
5. In the Throttling dropdown (top right of Network tab), select **Slow 3G**.
6. Observe that on `/`, only `index.js` is loaded.
7. Click the **Projects** tab in the top navigation bar:
   - Notice the centered `<LoadingFallback>` spinner appears.
   - A new network request for `Projects-[hash].js` appears in the log.
8. Click **"Load Workload Analytics (Heavy Chunk)"** inside the Projects page:
   - Notice the nested fallback displays while `ProjectAnalyticsChart-[hash].js` downloads.
9. Click the **Contact** tab:
   - Notice `Contact-[hash].js` is downloaded on demand.

---

## 11. Before-and-After Performance Results

### Real Vite Production Build Outputs

| Asset / File | Loading Strategy | Baseline Size | Optimized Size | Gzip Size | When Downloaded |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Monolithic Bundle** | Static (All pages) | 225.91 kB | — | 69.84 kB | First visit (`/`) |
| **`index-[hash].js`** | Critical Entry Bundle | — | 288.83 kB | 88.19 kB | First visit (`/`) |
| **`Projects-[hash].js`** | `React.lazy` Route | In Monolith | **6.59 kB** | **2.30 kB** | Only when `/projects` visited |
| **`Contact-[hash].js`** | `React.lazy` Route | In Monolith | **7.35 kB** | **2.18 kB** | Only when `/contact` visited |
| **`ProjectAnalyticsChart.js`** | `React.lazy` Component | In Monolith | **12.09 kB** | **3.04 kB** | Only when chart is toggled |

**Total Deferred Code**: `6.59 + 7.35 + 12.09 = 26.03 kB` raw (7.52 kB gzipped) is completely deferred from the initial bootstrap path!

*Detailed metrics and browser measurement tables are available in [docs/performance-results.md](file:///Users/vishvampatel/collage%20projects/awdf/practical-7-main/docs/performance-results.md).*

---

## 12. React DevTools Profiler Findings (Avoidable Re-render)

### Problem Identified
In `TaskDashboard.jsx`, the component manages state for task creation (`title`, `description`, `priority`). Originally, each keystroke in the input field updated `title`, triggering a full re-render of `TaskDashboard`. Because task items were rendered inline as JSX, every single `<TaskItem>` re-rendered unnecessarily on every keystroke.

### Solution Applied
1. Extracted task rendering into a dedicated `<TaskItem />` component.
2. Wrapped `<TaskItem />` in `React.memo`.
3. Wrapped parent action handlers (`handleToggleTask`, `handleDeleteTask`) in `useCallback`.

### Profiler Evidence
- **Before**: In the DevTools Profiler flamegraph, typing into the title field caused 100% of task cards to show as rendered (yellow/orange) with reason: *"Parent component rendered"*.
- **After**: All `<TaskItem />` components show as grayed out with the tooltip: *"Did not render (props did not change)"*.

---

## 13. Challenges Encountered and Solutions

| Challenge | Root Cause | Solution |
| :--- | :--- | :--- |
| **Vite Native Binding Incompatibility** | Unpacked zip archive lacked macOS arm64 native addons (`rolldown-binding`) and permissions. | Installed WASI binding and configured `build: { cssMinify: false }` to ensure portable build execution across environments. |
| **Element Type Invalid Error** | `React.lazy` requires default exports. | Ensured `Projects.jsx`, `Contact.jsx`, `Dashboard.jsx`, and `ProjectAnalyticsChart.jsx` all use `export default`. |
| **Fast Network Flashing** | Local Wi-Fi loads chunks in &lt; 20 ms, making fallback UI invisible during evaluation. | Documented Chrome DevTools **Slow 3G** throttling and built the reusable `lazyWithDelay` helper. |
| **Chunk Download Failures** | Dynamic imports can fail if network connection drops mid-session. | Implemented a dedicated `<ErrorBoundary>` wrapping Suspense with user-friendly retry capability. |

---

## 14. Conclusion & Learning Outcomes

### Learning Outcomes
- Successfully mastered `React.lazy()`, `Suspense`, and dynamic imports for route-based and component-based code splitting.
- Learned how to read and interpret Vite production build chunk trees.
- Understood why lazy loading improves perceived performance (FCP, LCP) without reducing total session transfer size.
- Gained hands-on experience profiling React component rendering and applying targeted memoization (`React.memo`, `useCallback`).

---

## 15. Viva Questions & Model Answers

### Q1: What is the difference between the initial bundle and a lazy-loaded chunk in terms of when each is downloaded?
**Answer**: The initial bundle is fetched synchronously during the initial HTML page load to bootstrap the React application and render the initial route. A lazy-loaded chunk is downloaded asynchronously via an on-demand HTTP request only when the user navigates to its route or triggers its component rendering.

### Q2: Why does lazy loading improve perceived performance even though the total amount of code downloaded eventually stays the same?
**Answer**: Because browsers parse and compile JavaScript on the main thread. Shrinking the initial bundle allows the browser to reach First Contentful Paint (FCP) and Time to Interactive (TTI) much faster. Users perceive the application as fast, and non-critical code is deferred until needed.

### Q3: In what situations would lazy loading NOT be worth the added complexity?
**Answer**: In small applications (< 50–100 kB total bundle) or single-screen tools, where splitting causes unnecessary HTTP request overhead, flash of loading spinners, and network latency on subsequent clicks without providing meaningful initial load speed benefits.

### Q4: Why does React.lazy() require a default export?
**Answer**: `React.lazy()` expects the Promise returned by dynamic `import()` to resolve to an object containing a `default` property holding a valid React component (`{ default: Component }`). If a named export is used without specifying the default property, React cannot locate the component function and throws an error.

### Q5: How do you prevent an entire application from unmounting when a single lazy-loaded route fails to download?
**Answer**: By wrapping the `<Suspense>` boundary with an `<ErrorBoundary>` component. If the dynamic `import()` Promise rejects due to network failure, the Error Boundary catches the rejection and renders a fallback error UI with a retry button instead of crashing the application.

---

## ⚡ Practical 9: In-Memory Caching and Query Optimization

- **Course Outcomes**: CO2, CO4 / PO3, PO5
- **Technology**: `node-cache` (v5.1.2), Express.js, React 19
- **Report**: [Detailed Practical 9 Engineering Report](docs/practical-9-caching-report.md)

### Key Features Implemented:
1. **Cache-Aside Architecture**: Caches `GET /tasks` responses under `all_tasks` with `stdTTL: 60` seconds.
2. **Sub-Millisecond Retrieval**: Second and subsequent reads execute directly from process RAM in **~0.02 ms** (vs **~33.2 ms** uncached).
3. **Write-Based Invalidation**: `POST /tasks`, `PUT /tasks/:id`, and `DELETE /tasks/:id` immediately purge `all_tasks` and `task_:id` keys to prevent stale reads.
4. **Single-Task Caching**: `GET /tasks/:id` caches individual tasks under `task_${id}`.
5. **Telemetry & Debug Endpoint**: Live stats at `GET /tasks/cache/stats` showing hits, misses, hit ratio %, and active keys with TTL countdown.
6. **In-App Benchmark Hub**: One-click 3-sample comparative benchmark runner in the frontend UI with Markdown journal table export.

### Empirical Response Time Results:
| Sample Request # | Uncached (DB Query) | Cached (node-cache RAM) | Latency Reduction |
| :---: | :---: | :---: | :---: |
| **Request 1** | `33.40 ms` | `0.05 ms` | **99.85%** |
| **Request 2** | `33.21 ms` | `0.01 ms` | **99.97%** |
| **Request 3** | `33.25 ms` | `0.00 ms` | **100.00%** |
| **Average** | **33.29 ms** | **0.02 ms** | **99.94% Faster (1664x Speedup)** |

### Run Practical 9 Automated Test Suite:
```bash
cd backend
npm run test:p9
```

---

## 📁 Repository Structure

```text
practical-7-main/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── taskController.js       # node-cache caching + write invalidation (Practical 9)
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js       # JWT Verification (Practical 7)
│   │   │   ├── validationMiddleware.js # Input Sanitization (Practical 7)
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── taskRoutes.js           # Protected routes + /cache/stats (Practical 9)
│   │   └── utils/
│   │       └── cache.js                # Shared node-cache module & telemetry (Practical 9)
│   ├── package.json                    # node-cache dependency & test:p9 script
│   ├── server.js                       # Express bootstrap & summary endpoint
│   ├── test_practical7.js              # Practical 7 test suite
│   └── test_practical9_caching.js      # Practical 9 automated test runner
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CacheTelemetryModal.jsx # Practical 9 Benchmark Hub & Live Monitor
│   │   │   ├── ErrorBoundary.jsx       # Practical 8 chunk error handler
│   │   │   ├── Header.jsx              # Navigation + Cache Hub (P9) trigger
│   │   │   ├── LoadingFallback.jsx     # Practical 8 Suspense skeleton
│   │   │   ├── PerformanceModal.jsx    # Practical 8 bundle metrics
│   │   │   ├── ProjectAnalyticsChart.jsx # Practical 8 lazy component
│   │   │   ├── TaskDashboard.jsx       # Cache status bar + memoized TaskItem
│   │   │   └── VivaDrawer.jsx          # Tabbed Viva Q&A (P7, P8, P9)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects.jsx
│   │   │   └── Contact.jsx
│   │   ├── services/
│   │   │   └── api.js                  # Cache endpoints & telemetry headers
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── practical-9-caching-report.md   # Practical 9 comprehensive engineering report
│   ├── performance-report.md           # Practical 8 report
│   └── performance-results.md          # Practical 8 results
└── README.md
```
