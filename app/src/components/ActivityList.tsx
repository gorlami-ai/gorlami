import { useState } from 'react';
import { ActivityItem } from './ActivityItem';
import { Search } from 'lucide-react';

interface Activity {
  id: string;
  content: string;
  date: Date;
  duration?: string;
  type: 'transcription' | 'text';
}

const mockActivities: Activity[] = [
  {
    id: '1',
    content: 'Okay, we now want to create a new backend system using Express and TypeScript. The goal is to build a robust API that can handle authentication, data processing, and real-time updates efficiently. We need to consider the following key aspects: First, the authentication system should support JWT tokens, refresh tokens, and OAuth integration with providers like Google, GitHub, and Apple. Second, we need to implement proper rate limiting and request validation to ensure security. Third, the database layer should use Prisma ORM for type safety and migration management. Fourth, we should set up a comprehensive testing suite with Jest for unit tests and Supertest for integration tests. Finally, the deployment pipeline should include Docker containerization and CI/CD with GitHub Actions.',
    date: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    duration: '0:45',
    type: 'transcription',
  },
  {
    id: '2',
    content: 'Meeting notes: Discussed the new feature roadmap for Q1 2025. Key priorities include improving the voice recognition accuracy, adding multi-language support, and implementing collaborative features.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    duration: '1:23',
    type: 'transcription',
  },
  {
    id: '3',
    content: 'Quick note about the bug in the authentication flow - users are experiencing timeout issues when trying to log in with social providers.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    type: 'text',
  },
  {
    id: '4',
    content: 'Brainstorming session for the new AI assistant features. Ideas include: context-aware responses, code generation capabilities, integration with popular development tools, and voice command shortcuts. We explored several innovative concepts during this session. First, the context-aware system should maintain conversation history and understand project-specific terminology and patterns. It should be able to reference previous conversations and build upon established context. Second, for code generation, we want to support multiple programming languages with proper syntax highlighting and intelligent suggestions based on the current project structure. The AI should understand common design patterns and suggest idiomatic code for each language. Third, the integration layer needs to work seamlessly with VSCode, IntelliJ, and other popular IDEs through dedicated plugins. We should also consider terminal integration for command-line workflows. Fourth, voice commands should be natural and flexible, allowing users to say things like "create a new React component" or "add error handling to this function". The system should learn from user preferences and adapt its responses accordingly.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    duration: '2:15',
    type: 'transcription',
  },
  {
    id: '5',
    content: 'Research notes on competitive analysis. Reviewed features from similar apps like Whisper, Otter.ai, and Rev. Our key differentiators should be speed, accuracy, and developer-focused features. After extensive analysis, I\'ve identified several areas where we can excel: Real-time processing with minimal latency (under 100ms), support for technical jargon and programming terms that general transcription services struggle with, integration with development workflows including git commits and PR descriptions, custom vocabulary training for team-specific terms and acronyms, and advanced formatting options that preserve code snippets and markdown syntax. We should also focus on privacy-first architecture with local processing options for sensitive content.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    type: 'text',
  },
  {
    id: '6',
    content: 'Customer feedback summary: Users love the real-time transcription but want better formatting options and the ability to export to different formats like Markdown, PDF, and Word documents.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    duration: '0:32',
    type: 'transcription',
  },
  {
    id: '7',
    content: 'Technical architecture discussion about migrating from the current monolithic structure to a microservices approach. Need to consider scalability, maintenance, and deployment strategies. The proposed architecture would separate our application into the following services: Authentication Service (handling all auth flows, token management, and user sessions), Transcription Service (managing audio processing, speech-to-text conversion, and real-time streaming), AI Processing Service (handling LLM interactions, prompt management, and response formatting), Storage Service (managing file uploads, transcription storage, and user data), Notification Service (handling webhooks, email notifications, and real-time updates), and API Gateway (routing requests, rate limiting, and load balancing). Each service would have its own database and communicate via message queues for async operations and gRPC for sync calls. We need to carefully plan the migration strategy to ensure zero downtime and data integrity throughout the process.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
    duration: '1:45',
    type: 'transcription',
  },
];

export function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActivities = activities.filter(activity =>
    activity.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlay = (id: string) => {
    console.log('Play:', id);
  };

  const handleCopy = (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (activity) {
      navigator.clipboard.writeText(activity.content);
    }
  };

  const handleDelete = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const handleRerun = (id: string) => {
    console.log('Rerun:', id);
  };

  const stats = {
    total: activities.length,
    transcriptions: activities.filter(a => a.type === 'transcription').length,
    totalDuration: activities
      .filter(a => a.duration)
      .reduce((acc, a) => {
        const [mins, secs] = a.duration!.split(':').map(Number);
        return acc + mins + secs / 60;
      }, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xl font-semibold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total activities</div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div>
            <div className="text-xl font-semibold text-gray-900">{stats.transcriptions}</div>
            <div className="text-xs text-gray-500">Transcriptions</div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div>
            <div className="text-xl font-semibold text-gray-900">{Math.round(stats.totalDuration)} min</div>
            <div className="text-xs text-gray-500">Total duration</div>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredActivities.map((activity) => (
          <ActivityItem
            key={activity.id}
            {...activity}
            onPlay={activity.type === 'transcription' ? () => handlePlay(activity.id) : undefined}
            onCopy={() => handleCopy(activity.id)}
            onDelete={() => handleDelete(activity.id)}
            onRerun={() => handleRerun(activity.id)}
          />
        ))}
        
        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No activities found</p>
          </div>
        )}
      </div>
    </div>
  );
}