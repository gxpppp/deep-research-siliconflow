/**
 * Template Selector Component
 * Dialog for selecting workflow templates
 */

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { workflowTemplates, WorkflowTemplate, applyTemplate } from '@/utils/workflowTemplates';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { 
  FileText, 
  Zap, 
  Layers, 
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

// Template card component
function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: WorkflowTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // Get icon based on category
  const getIcon = () => {
    switch (template.category) {
      case '基础模板':
        return <FileText className="w-8 h-8 text-blue-400" />;
      case '高级模板':
        return <Layers className="w-8 h-8 text-purple-400" />;
      case '快速模板':
        return <Zap className="w-8 h-8 text-yellow-400" />;
      default:
        return <FileText className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-500/10' 
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-3 rounded-lg bg-slate-700/50">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-slate-200">{template.name}</h3>
            <Badge variant="secondary" className="text-[10px] bg-slate-700 text-slate-400">
              {template.category}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
          
          {/* Node count */}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-600">
            <span>{template.nodes.length} 个节点</span>
            <span>{template.edges.length} 条连接</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty template option
function EmptyTemplateCard({
  isSelected,
  onSelect,
}: {
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-500/10' 
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-slate-700/50">
          <Sparkles className="w-8 h-8 text-slate-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-slate-200">空白工作流</h3>
          <p className="text-xs text-slate-500 mt-1">从空白开始创建自定义工作流</p>
        </div>
      </div>
    </div>
  );
}

export function TemplateSelector({ isOpen, onClose }: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { setWorkflow, workflow } = useWorkflowEditorStore();

  const handleApply = () => {
    if (selectedTemplateId === 'empty') {
      // Create empty workflow
      setWorkflow({
        ...workflow,
        nodes: [],
        edges: [],
      });
    } else if (selectedTemplateId) {
      // Apply template
      const { nodes, edges } = applyTemplate(selectedTemplateId);
      setWorkflow({
        ...workflow,
        nodes,
        edges,
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            选择工作流模板
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            选择一个预设模板快速开始，或从空白创建
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3 py-4">
            {/* Empty template */}
            <EmptyTemplateCard
              isSelected={selectedTemplateId === 'empty'}
              onSelect={() => setSelectedTemplateId('empty')}
            />

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-xs text-slate-500 bg-slate-900">预设模板</span>
              </div>
            </div>

            {/* Template list */}
            {workflowTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => setSelectedTemplateId(template.id)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            取消
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplateId}
            className="gap-2"
          >
            应用模板
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
