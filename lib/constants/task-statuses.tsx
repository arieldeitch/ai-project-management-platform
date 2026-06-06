import { Circle, CircleDot, CheckCircle2, XCircle } from 'lucide-react'
import type { TaskStatus } from '@/types/entities'

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  todo:        { label: 'לביצוע', icon: <Circle className="h-4 w-4" />,        color: 'text-zinc-400' },
  in_progress: { label: 'בביצוע', icon: <CircleDot className="h-4 w-4" />,     color: 'text-blue-500' },
  done:        { label: 'הושלם',  icon: <CheckCircle2 className="h-4 w-4" />,  color: 'text-emerald-500' },
  blocked:     { label: 'חסום',   icon: <XCircle className="h-4 w-4" />,       color: 'text-red-500' },
}
