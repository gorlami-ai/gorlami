import { ActivityList } from '../components/ActivityList';

export function Activity() {
  return (
    <div className="p-6 min-h-screen bg-white">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-gray-600 mt-1">View and manage your transcripts and notes</p>
        </div>
        <ActivityList />
      </div>
    </div>
  );
}
