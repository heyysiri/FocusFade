// app/focus-thief/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { pipe, ContentItem, ScreenpipeResponse as SDKScreenpipeResponse } from '@screenpipe/browser';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useFocusSettings } from '@/lib/hooks/use-focus-settings';
import { Button } from "@/components/ui/button";
import { PlayIcon, StopIcon } from "@radix-ui/react-icons";

interface FocusLog {
  timestamp: number;
  app: string;
  duration?: number;  // Add duration for time spent in app
}
interface Activity {
  content: {
    timestamp: string;
    appName?: string;
    text?: string;
    windowName?: string;
  };
}

// Add type for the API response
interface ScreenpipeResponse {
  data?: Array<{
    content: {
      timestamp: string;
      appName: string;
      window_name: string;
      browser_url?: string;
    };
  }>;
}

interface AppRelevance {
  appName: string;
  isRelevant: boolean;
  reason: string;
}

export default function FocusThiefPage() {
  const { settings, loading } = useFocusSettings();
  // Current active app state.
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  // Timestamp of when the current app gained focus.
  const currentAppStartTimeRef = useRef<number>(Date.now());
  // Count of focus change logs sent to the server.
  const [logsCount, setLogsCount] = useState<number>(0);
  // Any error messages from logging or polling.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // User's focus task
  const [focusTask, setFocusTask] = useState<string>('coding'); // Default focus task
  // Add this new state for AI analysis
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  // Add these new state variables
  const [appStats, setAppStats] = useState<{[key: string]: number}>({});
  const [distractionScore, setDistractionScore] = useState<number>(0);
  // Add this near the top of the file with other state
  const [aiSettings, setAiSettings] = useState<{
    aiProviderType: string;
    aiModel: string;
    aiUrl: string;
    apiKey: string;
  } | null>(null);
  // Add this state near the top with other state variables
  const [searchCount, setSearchCount] = useState(0);
  // Add this state to track the last update time
  const lastStatsUpdateRef = useRef<number>(Date.now());
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionStartTime = useRef<string | null>(null);
  const [appRelevance, setAppRelevance] = useState<AppRelevance[]>([]);
  const [sessionLogs, setSessionLogs] = useState<FocusLog[]>([]);

  const toggleSession = () => {
    if (!isSessionActive) {
      // Start new session
      sessionStartTime.current = new Date().toISOString();
      setAppStats({}); // Reset stats
      setDistractionScore(0);
      setLogsCount(0);
      setAiAnalysis(null);
      setSessionLogs([]); // Clear previous session logs
    } else {
      // End session
      sessionStartTime.current = null;
      // Optionally save or process final session logs
      console.log('Session ended. Final logs:', sessionLogs);
    }
    setIsSessionActive(!isSessionActive);
  };

  /**
   * Sends a focus log to the server.
   * Expected log format: { timestamp: number, app: string }
   */
  async function sendLog(log: FocusLog) {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      setLogsCount((prev) => prev + 1);
      console.log('Log sent:', log);
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to send log:', err);
        setErrorMessage(err.message);
      } else {
        console.error('Failed to send log:', err);
        setErrorMessage('An unknown error occurred');
      }
    }
  }

  /**
   * Called when a new app is detected.
   * Logs the previous focus event (if applicable) and updates the current app.
   */
  function updateFocus(newApp: string) {
    const now = Date.now();
    // If an app was previously focused, log its time before changing
    if (currentApp) {
      const timeSpent = now - currentAppStartTimeRef.current;
      updateAppStats(currentApp, timeSpent);
      setSessionLogs(prevLogs => [
        ...prevLogs,
        { timestamp: now, app: currentApp!, duration: timeSpent }
      ]);
    }
    console.log(`Focus changed: ${currentApp} -> ${newApp} at ${new Date(now).toISOString()}`);
    setCurrentApp(newApp);
    currentAppStartTimeRef.current = now;

    // Analyze task relevance when a new app is detected
    if (focusTask && Object.keys(appStats).length > 0) {
      analyzeTaskRelevance(focusTask);
    }
  }

  // Function to send a notification
  function sendNotification(message: string) {
    if (Notification.permission === 'granted') {
      new Notification('Focus Alert', { body: message });
    }
  }

  // Function to check for distractions
  function checkForDistractions() {
    if (currentApp && currentApp !== focusTask) {
      sendNotification(`You are distracted by ${currentApp}. Focus on ${focusTask}!`);
    }
  }

  // Request notification permission on component mount
  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Update the analyzeActivities function
  async function analyzeActivities(activities: Activity[]) {
    if (!aiSettings) {
      console.error('AI settings not loaded');
      return;
    }

    try {
      const response = await fetch('/api/analyze-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          activities, 
          focusTask,
          aiSettings, // Pass AI settings to the API
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze activities');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
      
      if (data.analysis.toLowerCase().includes('high') && 
          data.analysis.toLowerCase().includes('distraction')) {
        sendNotification(`AI Analysis: ${data.analysis.slice(0, 100)}...`);
      }
    } catch (error) {
      console.error('Error analyzing activities:', error);
      setErrorMessage('Failed to analyze activities');
    }
  }

  // Modify updateAppStats function
  function updateAppStats(app: string, timeSpent: number) {
    const now = Date.now();
    // Ensure timeSpent is not negative or unreasonably large
    const validTimeSpent = Math.max(0, Math.min(timeSpent, now - lastStatsUpdateRef.current));
    
    setAppStats(prev => ({
      ...prev,
      [app]: Math.round((prev[app] || 0) + validTimeSpent)
    }));

    // Check if the app is marked as not relevant by AI analysis
    const appAnalysis = appRelevance.find(a => a.appName === app);
    if (appAnalysis && !appAnalysis.isRelevant) {
      setDistractionScore(prev => Math.round(prev + validTimeSpent));
    }

    lastStatsUpdateRef.current = now;
  }

  // Add this function to get formatted time
  function formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  // // Add this helper function near the top of the file
  // function normalizeAppName(appName: string): string {
  //   const appMappings: Record<string, string> = {
  //     'Cursor': 'IDE',
  //     'Arc': 'Browser',
  //     'VSCode': 'IDE'
  //     // Add more mappings as needed
  //   };
  //   return appMappings[appName] || appName;
  // }

  // Add this function to analyze task relevance
  const analyzeTaskRelevance = async (task: string) => {
    try {
      // Get unique app names from stats
      const apps = Object.keys(appStats);
      if (apps.length === 0) return;

      const response = await fetch('/api/analyze-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, apps }),
      });

      if (!response.ok) throw new Error('Failed to analyze task');

      const data = await response.json();
      setAppRelevance(data.analysis);
    } catch (error) {
      console.error('Error analyzing task:', error);
      setErrorMessage('Failed to analyze task relevance');
    }
  };

  // Modify the polling effect
  useEffect(() => {
    if (!isSessionActive) return;

    const pollInterval = setInterval(async () => {
      try {
        const startTime = sessionStartTime.current!;
        const endTime = new Date().toISOString();
        const results = (await pipe.queryScreenpipe({
          contentType: "ocr",
          startTime,
          endTime,
          limit: 50,
        })) as unknown as SDKScreenpipeResponse;
        
        if (results?.data && Array.isArray(results.data) && results.data.length > 0) {
          setSearchCount(count => {
            const newCount = count + 1;
            if (newCount % 10 === 0) {
              const activities: Activity[] = results.data.map(item => ({
                content: {
                  timestamp: item.content.timestamp,
                  appName: ('appName' in item.content ? item.content.appName : undefined),
                  text: 'text' in item.content ? item.content.text : undefined,
                  windowName: 'windowName' in item.content ? item.content.windowName : undefined
                }
              }));
              analyzeActivities(activities);
            }
            return newCount;
          });

          const sorted = results.data.sort((a, b) => {
            const aTime = new Date(a.content.timestamp).getTime();
            const bTime = new Date(b.content.timestamp).getTime();
            return bTime - aTime;
          });

          const latest = sorted[0];
          const appName = 'appName' in latest.content ? latest.content.appName : undefined;
          
          if (typeof appName === 'string' && appName !== currentApp) {
            updateFocus(appName);
          }
        }
      } catch (error) {
        console.error('Error polling OCR events:', error);
        setErrorMessage('Error polling OCR events');
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [currentApp, aiSettings, focusTask, isSessionActive]);

  // Process data every 2-3 minutes
  useEffect(() => {
    const processInterval = setInterval(() => {
      checkForDistractions();
    }, 2 * 60 * 1000); // 2 minutes 

    return () => clearInterval(processInterval);
  }, [currentApp, focusTask]);

  // Ensure the fetch URL is correct and matches your API route
  async function fetchLogs() {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched logs:', data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setErrorMessage('Error fetching logs');
    }
  }

  // useEffect(() => {
  //   fetchLogs();
  // }, []);

  useEffect(() => {
    if (settings?.aiSettings) {
      setAiSettings(settings.aiSettings);
    }
    if (settings?.focusSettings) {
      setFocusTask(settings.focusSettings.defaultFocusTask);
    }
  }, [settings]);

  // Add effect to analyze task relevance when focusTask changes
  useEffect(() => {
    if (focusTask && Object.keys(appStats).length > 0) {
      analyzeTaskRelevance(focusTask);
    }
  }, [focusTask]);

  // Update the focusTask onChange handler
  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFocusTask(e.target.value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Focus Fade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Current App</Label>
                <p className="text-2xl font-bold">{currentApp || 'None'}</p>
              </div>
              <div>
                <Label>Logs Sent</Label>
                <p className="text-2xl font-bold">{logsCount}</p>
              </div>
              <div>
                <Label>Session Control</Label>
                <Button 
                  onClick={toggleSession}
                  className="w-full"
                  variant={isSessionActive ? "destructive" : "default"}
                >
                  {isSessionActive ? (
                    <>
                      <StopIcon className="mr-2 h-4 w-4" />
                      Stop Session
                    </>
                  ) : (
                    <>
                      <PlayIcon className="mr-2 h-4 w-4" />
                      Start Session
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focusTask">Focus Task</Label>
              <Input
                id="focusTask"
                value={focusTask}
                onChange={handleTaskChange}
                placeholder="Enter your focus task"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Only show stats cards if session is active or has data */}
      {(isSessionActive || Object.keys(appStats).length > 0) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>App Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(appStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([app, time]) => {
                    const totalTime = Object.values(appStats).reduce((a, b) => a + b, 0);
                    const percentage = (time / totalTime) * 100;
                    const relevance = appRelevance.find(a => a.appName === app);
                    
                    return (
                      <div key={app} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{app}</span>
                            {relevance && (
                              <span className={`ml-2 text-sm ${
                                relevance.isRelevant ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({relevance.isRelevant ? 'Relevant' : 'Not Relevant'})
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(time)}
                          </span>
                        </div>
                        {relevance && (
                          <p className="text-sm text-gray-500">{relevance.reason}</p>
                        )}
                        <Progress 
                          value={percentage} 
                          className={relevance?.isRelevant ? "bg-green-100" : "bg-red-100"}
                        />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distraction Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatTime(distractionScore)}
              </div>
            </CardContent>
          </Card>

          {aiAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{aiAnalysis}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
