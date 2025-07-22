import { backendService, Activity as BackendActivity } from '../../services/backend';
import { createLogger } from '../../utils/logger';
import { withErrorHandling } from '../../shared/utils/errorHandler';
import { copyToClipboard } from '../../shared/utils/clipboard';

const logger = createLogger('ActivitiesService');

export interface Activity {
  id: string;
  content: string;
  date: Date;
  duration?: string;
  type: 'transcription' | 'text';
}

export interface ActivityStats {
  total: number;
  transcriptions: number;
  totalDuration: number; // in minutes
}

class ActivitiesService {
  async fetchActivities(page = 1, limit = 50): Promise<Activity[] | null> {
    const response = await withErrorHandling(
      () => backendService.getActivities(page, limit),
      {
        context: 'ActivitiesService',
        fallbackMessage: 'Failed to fetch activities'
      }
    );

    if (!response) return null;

    // Map backend activities to frontend format
    return response.activities.map(activity => ({
      id: activity.id,
      content: activity.outputText,
      date: new Date(activity.createdAt),
      type: activity.type === 'TRANSCRIPTION' ? 'transcription' : 'text',
      duration: this.extractDuration(activity),
    }));
  }

  private extractDuration(_activity: BackendActivity): string | undefined {
    // TODO: Extract duration when backend provides it in activity data
    // Format expected: "MM:SS" (e.g., "02:34" for 2 minutes 34 seconds)
    return undefined;
  }

  calculateStats(activities: Activity[]): ActivityStats {
    const transcriptions = activities.filter(a => a.type === 'transcription');
    
    const totalDuration = activities
      .filter(a => a.duration)
      .reduce((acc, a) => {
        const [mins, secs] = a.duration!.split(':').map(Number);
        return acc + mins + secs / 60;
      }, 0);

    return {
      total: activities.length,
      transcriptions: transcriptions.length,
      totalDuration,
    };
  }

  async copyActivity(activity: Activity): Promise<boolean> {
    const success = await copyToClipboard(activity.content);
    if (success) {
      logger.info('Copied activity to clipboard', { activityId: activity.id });
    }
    return success;
  }

  async deleteActivity(id: string): Promise<boolean> {
    // TODO: Implement when backend endpoint is available
    logger.warn(`Delete activity ${id} - backend endpoint not yet implemented`);
    return true;
  }

  filterActivities(activities: Activity[], searchQuery: string): Activity[] {
    if (!searchQuery) return activities;
    
    const query = searchQuery.toLowerCase();
    return activities.filter(activity =>
      activity.content.toLowerCase().includes(query)
    );
  }
}

export const activitiesService = new ActivitiesService();