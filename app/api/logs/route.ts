// app/api/logs/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs.json');

/**
 * Helper function to safely read logs.
 * Returns an empty array if the log file doesn't exist.
 */
async function getLogs(): Promise<any[]> {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, so return an empty array.
      return [];
    }
    console.error('Error reading logs file:', error);
    throw error;
  }
}

/**
 * Helper function to write logs back to the file.
 */
async function saveLogs(logs: any[]): Promise<void> {
  try {
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing logs file:', error);
    throw error;
  }
}

/**
 * POST handler to save a new focus log.
 * Expected log format: { timestamp: number, app: string }
 */
export async function POST(request: Request) {
  try {
    const newLog = await request.json();

    // Basic validation of the log data
    if (
      !newLog ||
      typeof newLog.timestamp !== 'number' ||
      typeof newLog.app !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid log data. Expecting { timestamp: number, app: string }.' },
        { status: 400 }
      );
    }

    const logs = await getLogs();
    logs.push(newLog);
    await saveLogs(logs);
    console.log('New log saved:', newLog);
    return NextResponse.json({ message: 'Log saved successfully', newLog });
  } catch (error) {
    console.error('Error in POST /api/logs:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}

/**
 * GET handler to retrieve all focus logs.
 */
export async function GET() {
  try {
    const logs = await getLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error in GET /api/logs:', error);
    return NextResponse.json({ error: 'Failed to retrieve logs' }, { status: 500 });
  }
}
