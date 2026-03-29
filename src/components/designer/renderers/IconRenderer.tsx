import {
  Star, Heart, User, Home, Settings, Search, Mail, Phone, Calendar, Clock,
  Check, X, Plus, Minus, Edit, Trash2, Save, Download, Upload, Share,
  Eye, EyeOff, Lock, Unlock, Bell, BellOff, Bookmark, Flag, Tag,
  Folder, File, Image, Video, Music, Camera, Mic, Volume2, VolumeX,
  Wifi, WifiOff, Battery, BatteryCharging, Sun, Moon, Cloud, CloudRain,
  Map, MapPin, Navigation, Compass, Globe, Link, ExternalLink, Copy,
  Clipboard, Archive, Box, Package, ShoppingCart, CreditCard, DollarSign,
  TrendingUp, TrendingDown, BarChart, PieChart, Activity, Zap, Award,
  Gift, Coffee, Smile, Frown, ThumbsUp, ThumbsDown, MessageCircle, Send,
  HelpCircle, Info, AlertCircle, AlertTriangle, CheckCircle, XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

const ICON_MAP: Record<string, LucideIcon> = {
  Star, Heart, User, Home, Settings, Search, Mail, Phone, Calendar, Clock,
  Check, X, Plus, Minus, Edit, Trash2, Save, Download, Upload, Share,
  Eye, EyeOff, Lock, Unlock, Bell, BellOff, Bookmark, Flag, Tag,
  Folder, File, Image, Video, Music, Camera, Mic, Volume2, VolumeX,
  Wifi, WifiOff, Battery, BatteryCharging, Sun, Moon, Cloud, CloudRain,
  Map, MapPin, Navigation, Compass, Globe, Link, ExternalLink, Copy,
  Clipboard, Archive, Box, Package, ShoppingCart, CreditCard, DollarSign,
  TrendingUp, TrendingDown, BarChart, PieChart, Activity, Zap, Award,
  Gift, Coffee, Smile, Frown, ThumbsUp, ThumbsDown, MessageCircle, Send,
  HelpCircle, Info, AlertCircle, AlertTriangle, CheckCircle, XCircle,
};

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'icon',
    label: 'Icon Name',
    type: 'text',
    placeholder: 'Star, Heart, User, etc.',
  },
  {
    key: 'size',
    label: 'Size',
    type: 'select',
    options: [
      { value: 'sm', label: 'Small (16px)' },
      { value: 'md', label: 'Medium (24px)' },
      { value: 'lg', label: 'Large (32px)' },
      { value: 'xl', label: 'Extra Large (48px)' },
    ],
    defaultValue: 'md',
  },
  {
    key: 'color',
    label: 'Color',
    type: 'select',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'primary', label: 'Primary' },
      { value: 'success', label: 'Success' },
      { value: 'warning', label: 'Warning' },
      { value: 'danger', label: 'Danger' },
      { value: 'muted', label: 'Muted' },
    ],
    defaultValue: 'default',
  },
];

export function IconRenderer({ component }: BaseRendererProps) {
  const iconName = readProp<string>(component, 'icon', 'Star');
  const size = readProp<string>(component, 'size', 'md');
  const color = readProp<string>(component, 'color', 'default');

  const sizeMap: Record<string, number> = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  };

  const colorClasses: Record<string, string> = {
    default: 'text-zinc-700 dark:text-zinc-300',
    primary: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    muted: 'text-zinc-400 dark:text-zinc-500',
  };

  const IconComponent = ICON_MAP[iconName] || HelpCircle;

  return (
    <div className={`inline-flex items-center justify-center ${colorClasses[color]}`}>
      <IconComponent size={sizeMap[size]} />
    </div>
  );
}
