# Focus Fade

Focus Thief is a productivity monitoring plugin for Screenpipe that helps users track and improve their focus during work sessions. It uses AI-powered analysis to provide real-time insights about your application usage and productivity patterns.

## Features

- **Real-time Activity Tracking**: Monitors active applications and window titles
- **Focus Session Management**: Start and stop focus sessions with detailed statistics
- **AI-powered Analysis**: Uses LLMs to analyze activity patterns and provide insights
- **Distraction Detection**: Identifies and scores potential distractions
- **Customizable Focus Tasks**: Set and track specific focus objectives
- **Desktop Notifications**: Receives alerts when distraction patterns are detected

## Prerequisites

- Node.js 18+
- Screenpipe Desktop App
- Ollama (optional, for local AI processing)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd learn-pipe
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun dev
```

## Configuration

### Focus Settings
Customize your focus preferences in the settings:
- Default focus task
- Poll interval
- Distraction threshold

## Usage

1. Launch the Screenpipe desktop app
2. Start a focus session using the "Start Session" button
3. Set your current focus task
4. Monitor your activity in real-time
5. Review AI insights and distraction scores
6. End session to save and analyze data

## Development

### Project Structure
```
learn-pipe/
├── src/
│   ├── app/             # Next.js pages and API routes
│   ├── components/      # React components
│   ├── lib/            # Utility functions and hooks
│   └── types/          # TypeScript type definitions
```

### Key Technologies

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Screenpipe SDK

### Building for Production

```bash
bun run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Support

For support, please contact the Screenpipe team or open an issue in the repository.
