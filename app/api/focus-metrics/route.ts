// app/api/current-app/route.ts
import { NextResponse } from 'next/server';
import { pipe } from '@screenpipe/js';

export async function GET() {
  try {
    // Query for UI events in the past hour.
    const results = await pipe.queryScreenpipe({
      contentType: "ui",
      startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      // Increase limit to fetch a decent sample of recent events.
      limit: 50,
    });
    
    // Ensure results are available.
    if (results && results.data && results.data.length > 0) {
      // Sort events by timestamp descending.
      const sorted = results.data.sort((a, b) => {
        const aTime = new Date(a.content.timestamp).getTime();
        const bTime = new Date(b.content.timestamp).getTime();
        return bTime - aTime;
      });
      
      // Grab the most recent event.
      const latestEvent = sorted[0];
      // Extract the app name (adjust the property name if necessary).
      let currentApp = "unknown";
      if ('app_name' in latestEvent.content) {
        currentApp = (latestEvent.content as { app_name: string }).app_name;
      }
      
      return NextResponse.json({ currentApp });
    } else {
      return NextResponse.json({ currentApp: null, message: "No UI events found." });
    }
  } catch (error) {
    console.error("Error fetching current app:", error);
    return NextResponse.json({ error: "Failed to fetch current app" }, { status: 500 });
  }
}
