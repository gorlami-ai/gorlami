import { useState, useEffect } from 'react';
import { ActivityItem } from './ActivityItem';
import { Search } from 'lucide-react';
import { backendService } from '../services/backend';
import { logger } from '../utils/logger';
import { invoke } from '@tauri-apps/api/core';
import { recordingService } from '../services/recording';

interface Activity {
  id: string;
  content: string;
  date: Date;
  duration?: string;
  type: 'transcription' | 'text';
}

export function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    fetchActivities();
    
    // Set up handler to refresh when new transcription is complete
    recordingService.setHandlers({
      onTranscriptionComplete: () => {
        // Refresh the activities list
        setTimeout(() => fetchActivities(), 500); // Small delay to ensure backend has saved
      },
    });
  }, []);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const response = await backendService.getActivities(1, 50); // Get first 50 activities
      
      // Map backend activities to frontend format
      const mappedActivities: Activity[] = response.activities.map(activity => ({
        id: activity.id,
        content: activity.outputText,
        date: new Date(activity.createdAt),
        type: activity.type === 'TRANSCRIPTION' ? 'transcription' : 'text',
        // Duration will be extracted from providerResponse when backend provides it
        // Format expected: "MM:SS" (e.g., "02:34" for 2 minutes 34 seconds)
        duration: undefined,
      }));
      
      setActivities(mappedActivities);
      setUseMockData(false);
    } catch (error) {
      logger.error('Failed to fetch activities', error);
      // Show empty state if API fails
      setActivities([]);
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity =>
    activity.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlay = (id: string) => {
    console.log('Play:', id);
  };

  const handleCopy = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (activity) {
      try {
        await invoke('copy_to_clipboard', { text: activity.content });
        logger.info('Copied activity to clipboard');
      } catch (error) {
        logger.error('Failed to copy to clipboard', error);
        // Fallback to browser API
        navigator.clipboard.writeText(activity.content);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Optimistically remove from UI
      setActivities(activities.filter(a => a.id !== id));
      
      // Delete from backend
      await backendService.deleteActivity(id);
      logger.info(`Activity ${id} deleted successfully`);
    } catch (error) {
      logger.error('Failed to delete activity', error);
      // Refresh to restore the deleted item if API fails
      await fetchActivities();
    }
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
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-500 mt-2">Loading activities...</p>
          </div>
        ) : (
          <>
            {filteredActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                {...activity}
                onPlay={activity.type === 'transcription' ? () => handlePlay(activity.id) : undefined}
                onCopy={() => handleCopy(activity.id)}
                onDelete={() => handleDelete(activity.id)}
              />
            ))}
            
            {filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchQuery ? 'No activities match your search' : 'No activities yet'}
                </p>
                {useMockData && (
                  <p className="text-xs text-gray-400 mt-1">
                    (Unable to connect to backend)
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}