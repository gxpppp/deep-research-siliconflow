/**
 * Workflow Toolbar - Top toolbar for workflow actions
 */

import {
  Play,
  Square,
  Save,
  FolderOpen,
  FilePlus,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  ClipboardPaste,
  Scissors,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Upload,
  PanelLeft,
  PanelRight,
  LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { workflowApi } from '@/services/workflowApi';

interface WorkflowToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onShowTemplates: () => void;
}

export function WorkflowToolbar({ onZoomIn, onZoomOut, onFitView, onShowTemplates }: WorkflowToolbarProps) {
  const {
    workflow,
    isDirty,
    isNodePaletteOpen,
    isPropertyPanelOpen,
    execution,
    undo,
    redo,
    resetWorkflow,
    copy,
    paste,
    cut,
    toggleNodePalette,
    togglePropertyPanel,
    startExecution,
    stopExecution,
    resetExecution,
    exportWorkflow,
    importWorkflow,
  } = useWorkflowEditorStore();

  const handleSave = async () => {
    try {
      const data = exportWorkflow();
      await workflowApi.updateWorkflow(workflow.id, {
        name: workflow.metadata.name,
        description: workflow.metadata.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
      });
      // Show success notification
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const handleExport = () => {
    workflowApi.downloadWorkflow(workflow);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const imported = await workflowApi.uploadWorkflow(file);
        importWorkflow(imported);
      } catch (error) {
        console.error('Failed to import workflow:', error);
      }
    }
  };

  const handleRun = () => {
    if (execution.isRunning) {
      stopExecution();
    } else {
      resetExecution();
      startExecution();
      // TODO: Execute workflow
    }
  };

  return (
    <div className="h-14 border-b border-slate-800 bg-slate-900 flex items-center px-4 gap-2">
      {/* File Operations */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={resetWorkflow} title="新建">
          <FilePlus className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onShowTemplates} title="模板">
          <LayoutTemplate className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSave} title="保存">
          <Save className="w-4 h-4 text-slate-400" />
        </Button>
        <label className="cursor-pointer">
          <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="ghost" size="icon" className="h-9 w-9" title="导入" asChild>
            <span>
              <Upload className="w-4 h-4 text-slate-400" />
            </span>
          </Button>
        </label>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleExport} title="导出">
          <Download className="w-4 h-4 text-slate-400" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 bg-slate-800" />

      {/* Edit Operations */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={undo} title="撤销">
          <Undo2 className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={redo} title="重做">
          <Redo2 className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={cut} title="剪切">
          <Scissors className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={copy} title="复制">
          <Copy className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => paste()} title="粘贴">
          <ClipboardPaste className="w-4 h-4 text-slate-400" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 bg-slate-800" />

      {/* View Operations */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onZoomIn} title="放大">
          <ZoomIn className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onZoomOut} title="缩小">
          <ZoomOut className="w-4 h-4 text-slate-400" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onFitView} title="适应视图">
          <Maximize className="w-4 h-4 text-slate-400" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 bg-slate-800" />

      {/* Panel Toggles */}
      <div className="flex items-center gap-1">
        <Button
          variant={isNodePaletteOpen ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9"
          onClick={toggleNodePalette}
          title="节点面板"
        >
          <PanelLeft className="w-4 h-4 text-slate-400" />
        </Button>
        <Button
          variant={isPropertyPanelOpen ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9"
          onClick={togglePropertyPanel}
          title="属性面板"
        >
          <PanelRight className="w-4 h-4 text-slate-400" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Workflow Name */}
      <div className="flex items-center gap-2 px-4">
        <span className="text-sm font-medium text-slate-300">{workflow.metadata.name}</span>
        {isDirty && <span className="text-xs text-slate-500">*</span>}
      </div>

      <div className="flex-1" />

      {/* Run Button */}
      <Button
        variant={execution.isRunning ? 'destructive' : 'default'}
        size="sm"
        className="gap-2"
        onClick={handleRun}
      >
        {execution.isRunning ? (
          <>
            <Square className="w-4 h-4" />
            停止
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            运行
          </>
        )}
      </Button>
    </div>
  );
}
