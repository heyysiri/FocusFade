import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { ollama } from 'ollama-ai-provider';
import { pipe } from '@screenpipe/js';

interface AppRelevance {
  appName: string;
  isRelevant: boolean;
  reason: string;
}

async function analyzeTaskApps(task: string, apps: string[], userSettings: any): Promise<AppRelevance[]> {
  const prompt = `Given the task "${task}", analyze the following applications and determine if they are relevant or potentially distracting.
  Consider that:
  - Some applications may serve multiple purposes
  - Browser apps can be both relevant (for research/documentation) or distracting (social media)
  - Development tasks need IDEs, documentation browsers, and terminal apps
  - Writing tasks need text editors and research tools
  - Design tasks need design software and asset management tools

  Applications to analyze: ${apps.join(', ')}

  Provide your analysis in a JSON array format like this:
  [
    {
      "app": "AppName",
      "isRelevant": true/false,
      "reason": "Brief explanation why"
    }
  ]

  Be sure to include all applications in the response and maintain valid JSON format.`;

  try {
    let { aiProviderType, aiModel, aiUrl, apiKey } = userSettings;
    let modelResponse: string;

    if(aiProviderType === 'native-ollama') {
      aiUrl = 'http://localhost:11434/api/generate';
    }

    if (aiProviderType === 'ollama' || aiProviderType === 'native-ollama') {
      const model = ollama(aiModel);
      const generateTextResult = await generateText({
        model,
        messages: [{ role: 'user', content: prompt }],
        maxRetries: 3,
      });
      modelResponse = generateTextResult.text ?? '';
    } else {
      const response = await fetch(aiUrl, {
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
        throw new Error(`API error: ${response.status}`);
      }
      
      const jsonResponse = await response.json();
      modelResponse = jsonResponse.choices?.[0]?.message?.content ?? '';
    }

    // Parse and validate the JSON response
    let parsedAnalysis: AppRelevance[] = [];
    try {
      // Extract JSON array from the response (it might be surrounded by markdown code blocks or other text)
      const jsonMatch = modelResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const rawAnalysis = JSON.parse(jsonStr);
        
        // Validate and normalize the response
        parsedAnalysis = apps.map(app => {
          const analysis = rawAnalysis.find(
            (a: any) => a.app.toLowerCase() === app.toLowerCase()
          );
          
          if (analysis) {
            return {
              appName: app,
              isRelevant: Boolean(analysis.isRelevant),
              reason: analysis.reason || 'No reason provided'
            };
          }
          
          return {
            appName: app,
            isRelevant: false,
            reason: 'Not analyzed by AI'
          };
        });
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to simple text parsing if JSON parsing fails
      parsedAnalysis = apps.map(app => ({
        appName: app,
        isRelevant: modelResponse.toLowerCase().includes(`${app.toLowerCase()} relevant`),
        reason: 'Parsing error - using fallback analysis'
      }));
    }

    return parsedAnalysis;
  } catch (error) {
    console.error('Error in task analysis:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const settings = await pipe.settings.getAll();
    const { task, apps } = await request.json();
    
    if (!task || !apps) {
      return NextResponse.json({ error: 'Missing task or apps' }, { status: 400 });
    }

    const userSettings = {
      aiProviderType: settings.aiProviderType,
      aiModel: settings.aiModel,
      aiUrl: settings.aiUrl,
      apiKey: settings.openaiApiKey,
    };

    const analysis = await analyzeTaskApps(task, apps, userSettings);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze task relevance' },
      { status: 500 }
    );
  }
}
