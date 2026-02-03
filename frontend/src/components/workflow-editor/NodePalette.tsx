/**
 * Node Palette - Left panel for adding nodes
 */

import { useDrag } from 'react-dnd';
import { 
  Play, Square, Lightbulb, Search, BarChart3, 
  FileText, GitBranch, Repeat 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { WorkflowNodeType, NODE_TYPE_COLORS } from '@/types/workflow';

interface NodeItemProps {
  type: WorkflowNodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

function NodeItem({ type, label, icon, color }: NodeItemProps) {
  const { addNode } = useWorkflowEditorStore();

  const handleClick = () => {
    // Add node at center of viewport
    addNode(type, { x: 400, y: 300 });
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 h-auto py-3 px-3 hover:bg-slate-800"
      onClick={handleClick}
    >
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="text-left">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{type}</div>
      </div>
    </Button>
  );
}

const NODE_ITEMS: NodeItemProps[] = [
  { type: 'start', label: '开始', icon: <Play className="w-4 h-4" />, color: NODE_TYPE_COLORS.start },
  { type: 'planning', label: '规划', icon: <Lightbulb className="w-4 h-4" />, color: NODE_TYPE_COLORS.planning },
  { type: 'search', label: '搜索', icon: <Search className="w-4 h-4" />, color: NODE_TYPE_COLORS.search },
  { type: 'analysis', label: '分析', icon: <BarChart3 className="w-4 h-4" />, color: NODE_TYPE_COLORS.analysis },
  { type: 'synthesis', label: '综合', icon: <FileText className="w-4 h-4" />, color: NODE_TYPE_COLORS.synthesis },
  { type: 'condition', label: '条件', icon: <GitBranch className="w-4 h-4" />, color: NODE_TYPE_COLORS.condition },
  { type: 'loop', label: '循环', icon: <Repeat className="w-4 h-4" />, color: NODE_TYPE_COLORS.loop },
  { type: 'end', label: '结束', icon: <Square className="w-4 h-4" />, color: NODE_TYPE_COLORS.end },
];

export function NodePalette() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">节点面板</h3>
        <p className="text-xs text-slate-500 mt-1">点击添加节点到画布</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {NODE_ITEMS.map((item) => (
            <NodeItem key={item.type} {...item} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
