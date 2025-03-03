import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { ollama } from 'ollama-ai-provider';
import { pipe } from '@screenpipe/js';

interface Activity {
  content: {
    appName: string;
    windowName: string;
    timestamp: number;
  };
}

// interface RequestBody {
//   activities: Activity[];
//   focusTask: string;
// }

interface UserSettings {
  aiProviderType: string;
  aiModel: string;
  aiUrl: string;
  apiKey: string;
}

async function analyzeActivity(activities: Activity[], focusTask: string, userSettings: UserSettings): Promise<string> {
  let modelResponse: string;

  // Format activity log for the prompt with better structure
  const activityLog = activities
    .map((a) => {
      const time = new Date(a.content.timestamp).toLocaleTimeString();
      return `- Time: ${time} | App: ${a.content.appName} | Window: ${a.content.windowName || 'N/A'}`;
    })
    .join('\n');

  const prompt = `# Focus Analysis Task

## User Context
- User's focus task is: "${focusTask}"
- Applications like Cursor, VSCode are IDEs used for coding/programming
- Arc, Chrome, Firefox, Edge are browsers (look at the window tab and decide if the user is focused on said task)
- Slack, Discord, Teams are communication tools (can be both productive or distracting)

## Activity Log to Analyze
${activityLog}

## Analysis Instructions
Please analyze the user's activity and provide a clear but BRIEF, structured report covering:

1. **Focus Assessment**:
   - Is the user staying on task with their focus goal of "${focusTask}"?
   - What percentage of time appears to be spent on-task vs. off-task?
   - Identify specific periods of good focus versus distraction.

2. **Distraction Analysis**:
   - Identify the top 2 distracting applications or activities.
   - For each distraction, note its significance and impact on productivity.

3. **Distraction Severity**:
   - Rate the overall distraction level as LOW, MEDIUM, or HIGH.
   - Provide a very brief justification for this rating.

4. **Actionable Recommendations**:
   - Suggest a specific, practical strategy to improve focus.
   - If certain apps are particularly problematic, recommend specific approaches to manage them.

Format your response in clear sections with headings for each of these four areas. 
Make sure everything below the headings is in bullet points. Everything must be crisp and to the point.
make sure to include time durations, relavant emojis etc but dont make the report too long.
Make sure to do time duration calculations properly.`;

  try {
    let { aiProviderType, aiModel, aiUrl, apiKey } = userSettings;
    if(aiProviderType === 'native-ollama'){
      aiUrl = 'http://localhost:11434/api/generate';
    }
    console.log('AI Provider:', aiProviderType);
    console.log('AI Model:', aiModel);
    console.log('AI URL:', aiUrl);
    console.log('API Key:', apiKey);

    if (aiProviderType === 'ollama' || aiProviderType === 'native-ollama') {
      const model = ollama(aiModel);
      console.log(prompt)
      const generateTextResult = await generateText({
        model,
        messages: [{ role: 'user', content: prompt }],
        maxRetries: 3,
      });
      // console.log(generateTextResult)
      modelResponse = generateTextResult.text ?? 'No response from model';
    } else {
      console.log(prompt)
      const response = await fetch(`${aiUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const jsonResponse = await response.json();
      modelResponse = jsonResponse.choices?.[0]?.message?.content ?? 'No response from model';
    }
  } catch (error) {
    console.error('Error in activity analysis:', error);
    throw new Error('Failed to analyze activity');
  }

  return modelResponse;
}

// API Route: POST /api/analyze-activity
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const settings = await pipe.settings.getAll();
    
    // const rawBody = await request.text();
    const rawBody = await request.json();
    if (!rawBody) {
      throw new Error('Empty request body');
    }
    // try {
    //   parsedBody = JSON.parse(rawBody);
    // } catch (error) {
    //   console.error('Error parsing JSON:', error);
    //   throw new Error('Invalid JSON format');
    // }
    const { activities, focusTask } = rawBody;
    const userSettings = {
      aiProviderType: settings.aiProviderType,
      aiModel: settings.aiModel,
      aiUrl: settings.aiUrl,
      apiKey: settings.openaiApiKey,
    };
    
    const analysis = await analyzeActivity(activities, focusTask, userSettings);

    return NextResponse.json({
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in activity analysis:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      console.error('Error in activity analysis:', error);
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 400 });
    }
  }
}
