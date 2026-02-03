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
  } = useWorkflowEditorStore();

  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="flex h-full bg-slate-950">
      {/* Left Panel - Node Palette */}
      {isNodePaletteOpen && (
        <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
          <NodePalette />
        </div>
      )}

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <WorkflowToolbar
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitView={() => fitView({ padding: 0.2 })}
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

            {/* Execution Status Panel */}
            {execution.isRunning && (
              <Panel position="top-center" className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm text-slate-200">执行中...</span>
                  <span className="text-xs text-slate-400">{execution.progress}%</span>
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
