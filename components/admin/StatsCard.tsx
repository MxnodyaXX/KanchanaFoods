import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'green' | 'blue' | 'orange' | 'red' | 'purple';
  subtitle?: string;
}

const colorMap = {
  green: { bg: 'bg-green-100', text: 'text-green-600', value: 'text-green-700' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', value: 'text-blue-700' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', value: 'text-orange-700' },
  red: { bg: 'bg-red-100', text: 'text-red-600', value: 'text-red-700' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', value: 'text-purple-700' },
};

export function StatsCard({ title, value, icon: Icon, color, subtitle }: StatsCardProps) {
  const colors = colorMap[color];
  return (
    <div className="stat-card">
      <div className={`${colors.bg} p-3 rounded-xl flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${colors.text}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
        <p className={`text-xl font-bold ${colors.value}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
