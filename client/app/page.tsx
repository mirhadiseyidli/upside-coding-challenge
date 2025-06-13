'use client';

import ActivityTimeline from './components/ActivityTimeline';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <div className="container mx-auto p-4 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Activity Timeline
          </h1>
          <p className="text-sm text-foreground/70">
            Interactive timeline with navigation minimap
          </p>
        </header>
        
        <ActivityTimeline />
      </div>
    </div>
  );
}
