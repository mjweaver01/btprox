import { normalizeRssi } from '../lib/rssi';
import { MIN_RSSI, MAX_RSSI } from '@shared/constants';

interface SignalStrengthBarProps {
  rssi: number;
  className?: string;
}

export function SignalStrengthBar({ rssi, className = '' }: SignalStrengthBarProps) {
  const normalized = normalizeRssi(rssi, MIN_RSSI, MAX_RSSI);
  const percentage = Math.round(normalized * 100);

  const getColor = () => {
    if (normalized >= 0.7) return 'bg-blue-500';
    if (normalized >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 tabular-nums w-12 text-right">
        {rssi} dB
      </span>
    </div>
  );
}
