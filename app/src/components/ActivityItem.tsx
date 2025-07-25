import { useState } from 'react';
import { Play, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityItemProps {
  id: string;
  content: string;
  date: Date;
  duration?: string;
  type: 'transcription' | 'text';
  onPlay?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

export function ActivityItem({
  content,
  date,
  duration,
  type,
  onPlay,
  onCopy,
  onDelete,
}: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongText = content.length > 200;
  const formatDate = (date: Date) => {
    const now = new Date();
    
    // Format date part
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    };
    
    // Format time part
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const dateStr = date.toLocaleDateString('en-US', dateOptions);
    const timeStr = date.toLocaleTimeString('en-US', timeOptions);
    
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className={`text-gray-800 text-sm ${!isExpanded && isLongText ? 'line-clamp-3' : ''}`}>
            {content}
          </p>
          {isLongText && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-1 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">{formatDate(date)}</span>
            {duration && (
              <span className="text-xs text-gray-500">• {duration}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {type === 'transcription' && (
            <button
              onClick={onPlay}
              className="p-1.5 bg-primary-100 hover:bg-primary-200 rounded-full transition-colors"
              title="Play"
            >
              <Play className="w-4 h-4 text-primary-600" />
            </button>
          )}
          <button
            onClick={onCopy}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}