/**
 * Workflow Editor App - Advanced Mode Entry Point
 * ComfyUI-style workflow editor for DeepResearch Platform
 */

import { useEffect } from 'react';
import { WorkflowEditor } from './WorkflowEditor';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';

export function WorkflowEditorApp() {
  const { workflow, resetExecution } = useWorkflowEditorStore();

  // Reset execution state when component mounts
  useEffect(() => {
    resetExecution();
  }, [resetExecution]);

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-200">工作流编辑器</h1>
            <p className="text-xs text-slate-500">进阶模式</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500">
            节点: {workflow.nodes.length} | 连接: {workflow.edges.length}
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">
        <WorkflowEditor />
      </div>
    </div>
  );
}
