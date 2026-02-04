/**
 * Workflow Editor - ComfyUI-style node editor
 * Advanced mode for DeepResearch Platform
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { WorkflowNode, WorkflowEdge } from '@/types/workflow';

// Node components
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { PlanningNode } from './nodes/PlanningNode';
import { SearchNode } from './nodes/SearchNode';
import { AnalysisNode } from './nodes/AnalysisNode';
import { SynthesisNode } from './nodes/SynthesisNode';
import { ConditionNode } from './nodes/ConditionNode';
import { LoopNode } from './nodes/LoopNode';

// Sub-components
import { NodePalette } from './NodePalette';
import { PropertyPanel } from './PropertyPanel';
import { WorkflowToolbar } from './WorkflowToolbar';
import { TemplateSelector } from './TemplateSelector';
import { ExecutionControlPanel } from './ExecutionControlPanel';

// Node type mapping
const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  planning: PlanningNode,
  search: SearchNode,
  analysis: AnalysisNode,
  synthesis: SynthesisNode,
  condition: ConditionNode,
  loop: LoopNode,
};

// Edge types
const edgeTypes: EdgeTypes = {
  default: ({ data, ...props }) => (
    <path
      {...props}
      className={`react-flow__edge-path ${data?.animated ? 'animated' : ''}`}
      style={{
        stroke: data?.animated ? '#3b82f6' : '#64748b',
        strokeWidth: 2,
      }}
    />
  ),
};

function WorkflowEditorContent() {
  const {
    workflow,
    selectedNodeIds,
    selectedEdgeIds,
    isNodePaletteOpen,
    isPropertyPanelOpen,
    execution,
    onNodesChange,
    onEdgesChange,
    addEdge,
    selectNode,
    selectEdge,
    deselectAll,
    setViewport,
    startExecution,
    stopExecution,
    resetExecution,
    updateNodeStatus,
  } = useWorkflowEditorStore();

  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [hasShownTemplateSelector, setHasShownTemplateSelector] = useState(false);

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseNodeEvent, node: Node) => {
      const multi = event.ctrlKey || event.metaKey || event.shiftKey;
      selectNode(node.id, multi);
    },
    [selectNode]
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const multi = event.ctrlKey || event.metaKey || event.shiftKey;
      selectEdge(edge.id, multi);
    },
    [selectEdge]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    deselectAll();
  }, [deselectAll]);

  // Handle connection
  const onConnect = useCallback(
    (connection: Connection) => {
      addEdge(connection);
    },
    [addEdge]
  );

  // Handle viewport change
  const onMoveEnd = useCallback(
    (event: any, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Fit view on mount
  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [fitView]);

  // Show template selector on first load if workflow is empty
  useEffect(() => {
    if (!hasShownTemplateSelector && workflow.nodes.length === 0) {
      setIsTemplateSelectorOpen(true);
      setHasShownTemplateSelector(true);
    }
  }, [hasShownTemplateSelector, workflow.nodes.length]);

  // Handle execution start
  const handleStartExecution = useCallback((input: string) => {
    startExecution(input);
    
    // Simulate execution for demo (remove in production)
    simulateExecution();
  }, [startExecution]);

  // Simulate execution for demo purposes
  const simulateExecution = useCallback(() => {
    const nodeIds = workflow.nodes.map(n => n.id);
    let currentIndex = 0;

    const executeNext = () => {
      if (currentIndex >= nodeIds.length) {
        // Execution complete
        return;
      }

      const nodeId = nodeIds[currentIndex];
      
      // Start node execution
      updateNodeStatus(nodeId, 'running');
      
      // Simulate execution time (1-3 seconds)
      setTimeout(() => {
        // Randomly succeed or fail (90% success rate)
        const success = Math.random() > 0.1;
        
        if (success) {
          updateNodeStatus(nodeId, 'completed', [
            `[INFO] Node execution started`,
            `[INFO] Processing data...`,
            `[INFO] Execution completed successfully`,
          ]);
        } else {
          updateNodeStatus(nodeId, 'failed', [
            `[INFO] Node execution started`,
            `[ERROR] Execution failed: Network timeout`,
          ]);
        }
        
        currentIndex++;
        executeNext();
      }, 1000 + Math.random() * 2000);
    };

    executeNext();
  }, [workflow.nodes, updateNodeStatus]);

  return (
    <div className="flex h-full bg-slate-950">
      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
      />

      {/* Left Panel - Node Palette */}
      {isNodePaletteOpen && (
        <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
          <NodePalette />
        </div>
      )}

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Execution Control Panel */}
        <ExecutionControlPanel
          onStartExecution={handleStartExecution}
          onPauseExecution={() => console.log('Pause execution')}
          onStopExecution={stopExecution}
          onResetExecution={resetExecution}
        />

        {/* Toolbar */}
        <WorkflowToolbar
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitView={() => fitView({ padding: 0.2 })}
          onShowTemplates={() => setIsTemplateSelectorOpen(true)}
        />

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={workflow.nodes as Node[]}
            edges={workflow.edges as Edge[]}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onMoveEnd={onMoveEnd}
            fitView
            attributionPosition="bottom-right"
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: false,
            }}
            className="bg-slate-950"
          >
            <Background
              color="#475569"
              gap={20}
              size={1}
              className="bg-slate-950"
            />
            <Controls className="bg-slate-800 border-slate-700" />
            <MiniMap
              className="bg-slate-800 border-slate-700"
              nodeColor={(node) => {
                const nodeData = node.data as WorkflowNode['data'];
                if (nodeData.status === 'running') return '#3b82f6';
                if (nodeData.status === 'completed') return '#10b981';
                if (nodeData.status === 'failed') return '#ef4444';
                
                const colors: Record<string, string> = {
                  start: '#10b981',
                  end: '#ef4444',
                  planning: '#3b82f6',
                  search: '#8b5cf6',
                  analysis: '#f59e0b',
                  synthesis: '#ec4899',
                  condition: '#6366f1',
                  loop: '#14b8a6',
                };
                return colors[node.type || ''] || '#64748b';
              }}
              maskColor="rgba(15, 23, 42, 0.8)"
            />

            {/* Empty State - Show Template Button */}
            {workflow.nodes.length === 0 && !execution.isRunning && (
              <Panel position="center" className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6 shadow-lg">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-200">开始创建工作流</h3>
                    <p className="text-sm text-slate-500 mt-1">从左侧添加节点，或选择预设模板快速开始</p>
                  </div>
                  <button
                    onClick={() => setIsTemplateSelectorOpen(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    选择模板
                  </button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Right Panel - Property Panel */}
      {isPropertyPanelOpen && (
        <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col">
          <PropertyPanel />
        </div>
      )}
    </div>
  );
}

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  );
}
