/**
 * Workflow Editor Store
 * State management for the ComfyUI-style workflow editor
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  EdgeChange,
  NodeChange,
  XYPosition,
} from '@xyflow/react';

import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  NodeExecutionStatus,
  ExecutionState,
} from '@/types/workflow';

// ==========================================
// Default Workflow
// ==========================================

const createDefaultWorkflow = (): Workflow => ({
  id: crypto.randomUUID(),
  metadata: {
    name: 'New Workflow',
    description: '',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

// ==========================================
// Store State Interface
// ==========================================

interface WorkflowEditorState {
  // Workflow data
  workflow: Workflow;
  
  // Selection
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  
  // UI State
  isNodePaletteOpen: boolean;
  isPropertyPanelOpen: boolean;
  isDirty: boolean;
  
  // Execution
  execution: ExecutionState;
  
  // History (for undo/redo)
  history: {
    past: Workflow[];
    future: Workflow[];
  };
  
  // Clipboard
  clipboard: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null;
}

interface WorkflowEditorActions {
  // Workflow actions
  setWorkflow: (workflow: Workflow) => void;
  updateWorkflowMetadata: (metadata: Partial<Workflow['metadata']>) => void;
  resetWorkflow: () => void;
  
  // Node actions
  addNode: (type: string, position: XYPosition, data?: Partial<WorkflowNodeData>) => void;
  updateNode: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  removeNode: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  
  // Edge actions
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  updateEdge: (edgeId: string, data: Partial<WorkflowEdge['data']>) => void;
  
  // Selection actions
  selectNode: (nodeId: string, multi?: boolean) => void;
  selectEdge: (edgeId: string, multi?: boolean) => void;
  deselectAll: () => void;
  
  // UI actions
  toggleNodePalette: () => void;
  togglePropertyPanel: () => void;
  setNodePaletteOpen: (open: boolean) => void;
  setPropertyPanelOpen: (open: boolean) => void;
  
  // Execution actions
  setExecutionState: (state: Partial<ExecutionState>) => void;
  updateNodeStatus: (nodeId: string, status: NodeExecutionStatus, logs?: string[]) => void;
  startExecution: () => void;
  stopExecution: () => void;
  resetExecution: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // Clipboard actions
  copy: () => void;
  paste: (position?: XYPosition) => void;
  cut: () => void;
  
  // Viewport
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  
  // Import/Export
  importWorkflow: (workflow: Workflow) => void;
  exportWorkflow: () => Workflow;
}

// ==========================================
// Store Implementation
// ==========================================

const initialState: WorkflowEditorState = {
  workflow: createDefaultWorkflow(),
  selectedNodeIds: [],
  selectedEdgeIds: [],
  isNodePaletteOpen: true,
  isPropertyPanelOpen: true,
  isDirty: false,
  execution: {
    isRunning: false,
    progress: 0,
    logs: [],
  },
  history: {
    past: [],
    future: [],
  },
  clipboard: null,
};

export const useWorkflowEditorStore = create<WorkflowEditorState & WorkflowEditorActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==========================================
        // Workflow Actions
        // ==========================================

        setWorkflow: (workflow) => {
          set({ workflow, isDirty: false });
        },

        updateWorkflowMetadata: (metadata) => {
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              metadata: { ...workflow.metadata, ...metadata, updatedAt: new Date().toISOString() },
            },
            isDirty: true,
          });
        },

        resetWorkflow: () => {
          get().saveToHistory();
          set({
            workflow: createDefaultWorkflow(),
            selectedNodeIds: [],
            selectedEdgeIds: [],
            isDirty: false,
          });
        },

        // ==========================================
        // Node Actions
        // ==========================================

        addNode: (type, position, data) => {
          get().saveToHistory();
          const { workflow } = get();
          
          const newNode: WorkflowNode = {
            id: crypto.randomUUID(),
            type,
            position,
            data: {
              label: data?.label || type.charAt(0).toUpperCase() + type.slice(1),
              description: data?.description || '',
              type: type as any,
              parameters: data?.parameters || {},
              inputs: data?.inputs || {},
              outputs: data?.outputs || {},
              status: 'pending',
              logs: [],
              ...data,
            },
          };

          set({
            workflow: {
              ...workflow,
              nodes: [...workflow.nodes, newNode],
            },
            isDirty: true,
          });
        },

        updateNode: (nodeId, data) => {
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              nodes: workflow.nodes.map((node) =>
                node.id === nodeId
                  ? { ...node, data: { ...node.data, ...data } }
                  : node
              ),
            },
            isDirty: true,
          });
        },

        updateNodePosition: (nodeId, position) => {
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              nodes: workflow.nodes.map((node) =>
                node.id === nodeId ? { ...node, position } : node
              ),
            },
          });
        },

        removeNode: (nodeId) => {
          get().saveToHistory();
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              nodes: workflow.nodes.filter((node) => node.id !== nodeId),
              edges: workflow.edges.filter(
                (edge) => edge.source !== nodeId && edge.target !== nodeId
              ),
            },
            selectedNodeIds: get().selectedNodeIds.filter((id) => id !== nodeId),
            isDirty: true,
          });
        },

        onNodesChange: (changes) => {
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              nodes: applyNodeChanges(changes, workflow.nodes) as WorkflowNode[],
            },
          });
        },

        // ==========================================
        // Edge Actions
        // ==========================================

        addEdge: (connection) => {
          get().saveToHistory();
          const { workflow } = get();
          const newEdge = {
            ...connection,
            id: crypto.randomUUID(),
            type: 'smoothstep',
            animated: false,
          };

          set({
            workflow: {
              ...workflow,
              edges: addEdge(newEdge, workflow.edges) as WorkflowEdge[],
            },
            isDirty: true,
          });
        },

        removeEdge: (edgeId) => {
          get().saveToHistory();
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              edges: workflow.edges.filter((edge) => edge.id !== edgeId),
            },
            selectedEdgeIds: get().selectedEdgeIds.filter((id) => id !== edgeId),
            isDirty: true,
          });
        },

        onEdgesChange: (changes) => {
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              edges: applyEdgeChanges(changes, workflow.edges) as WorkflowEdge[],
            },
          });
        },

        updateEdge: (edgeId, data) => {
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              edges: workflow.edges.map((edge) =>
                edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
              ),
            },
            isDirty: true,
          });
        },

        // ==========================================
        // Selection Actions
        // ==========================================

        selectNode: (nodeId, multi = false) => {
          const { selectedNodeIds } = get();
          if (multi) {
            set({
              selectedNodeIds: selectedNodeIds.includes(nodeId)
                ? selectedNodeIds.filter((id) => id !== nodeId)
                : [...selectedNodeIds, nodeId],
              selectedEdgeIds: [],
            });
          } else {
            set({
              selectedNodeIds: [nodeId],
              selectedEdgeIds: [],
            });
          }
        },

        selectEdge: (edgeId, multi = false) => {
          const { selectedEdgeIds } = get();
          if (multi) {
            set({
              selectedEdgeIds: selectedEdgeIds.includes(edgeId)
                ? selectedEdgeIds.filter((id) => id !== edgeId)
                : [...selectedEdgeIds, edgeId],
              selectedNodeIds: [],
            });
          } else {
            set({
              selectedEdgeIds: [edgeId],
              selectedNodeIds: [],
            });
          }
        },

        deselectAll: () => {
          set({ selectedNodeIds: [], selectedEdgeIds: [] });
        },

        // ==========================================
        // UI Actions
        // ==========================================

        toggleNodePalette: () => {
          set((state) => ({ isNodePaletteOpen: !state.isNodePaletteOpen }));
        },

        togglePropertyPanel: () => {
          set((state) => ({ isPropertyPanelOpen: !state.isPropertyPanelOpen }));
        },

        setNodePaletteOpen: (open) => {
          set({ isNodePaletteOpen: open });
        },

        setPropertyPanelOpen: (open) => {
          set({ isPropertyPanelOpen: open });
        },

        // ==========================================
        // Execution Actions
        // ==========================================

        setExecutionState: (state) => {
          set((prev) => ({
            execution: { ...prev.execution, ...state },
          }));
        },

        updateNodeStatus: (nodeId, status, logs) => {
          const { workflow } = get();
          set({
            workflow: {
              ...workflow,
              nodes: workflow.nodes.map((node) =>
                node.id === nodeId
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        status,
                        logs: logs || node.data.logs,
                      },
                    }
                  : node
              ),
            },
          });
        },

        startExecution: () => {
          set({
            execution: {
              isRunning: true,
              progress: 0,
              startTime: new Date().toISOString(),
              logs: [],
            },
          });
        },

        stopExecution: () => {
          set((state) => ({
            execution: {
              ...state.execution,
              isRunning: false,
              endTime: new Date().toISOString(),
            },
          }));
        },

        resetExecution: () => {
          const { workflow } = get();
          set({
            execution: {
              isRunning: false,
              progress: 0,
              logs: [],
            },
            workflow: {
              ...workflow,
              nodes: workflow.nodes.map((node) => ({
                ...node,
                data: { ...node.data, status: 'pending', logs: [] },
              })),
            },
          });
        },

        // ==========================================
        // History Actions
        // ==========================================

        saveToHistory: () => {
          const { workflow, history } = get();
          set({
            history: {
              past: [...history.past, workflow],
              future: [],
            },
          });
        },

        undo: () => {
          const { history } = get();
          if (history.past.length === 0) return;

          const previous = history.past[history.past.length - 1];
          const newPast = history.past.slice(0, -1);

          set((state) => ({
            workflow: previous,
            history: {
              past: newPast,
              future: [state.workflow, ...state.history.future],
            },
          }));
        },

        redo: () => {
          const { history } = get();
          if (history.future.length === 0) return;

          const next = history.future[0];
          const newFuture = history.future.slice(1);

          set((state) => ({
            workflow: next,
            history: {
              past: [...state.history.past, state.workflow],
              future: newFuture,
            },
          }));
        },

        // ==========================================
        // Clipboard Actions
        // ==========================================

        copy: () => {
          const { workflow, selectedNodeIds } = get();
          const selectedNodes = workflow.nodes.filter((node) =>
            selectedNodeIds.includes(node.id)
          );
          const selectedEdges = workflow.edges.filter(
            (edge) =>
              selectedNodeIds.includes(edge.source) &&
              selectedNodeIds.includes(edge.target)
          );

          set({
            clipboard: {
              nodes: selectedNodes,
              edges: selectedEdges,
            },
          });
        },

        paste: (position) => {
          const { clipboard, workflow } = get();
          if (!clipboard) return;

          get().saveToHistory();

          const idMap = new Map<string, string>();
          const newNodes = clipboard.nodes.map((node) => {
            const newId = crypto.randomUUID();
            idMap.set(node.id, newId);
            return {
              ...node,
              id: newId,
              position: position
                ? { x: position.x + node.position.x, y: position.y + node.position.y }
                : { x: node.position.x + 50, y: node.position.y + 50 },
            };
          });

          const newEdges = clipboard.edges.map((edge) => ({
            ...edge,
            id: crypto.randomUUID(),
            source: idMap.get(edge.source) || edge.source,
            target: idMap.get(edge.target) || edge.target,
          }));

          set({
            workflow: {
              ...workflow,
              nodes: [...workflow.nodes, ...newNodes],
              edges: [...workflow.edges, ...newEdges],
            },
            selectedNodeIds: newNodes.map((n) => n.id),
            isDirty: true,
          });
        },

        cut: () => {
          get().copy();
          const { selectedNodeIds } = get();
          selectedNodeIds.forEach((id) => get().removeNode(id));
        },

        // ==========================================
        // Viewport
        // ==========================================

        setViewport: (viewport) => {
          const { workflow } = get();
          set({
            workflow: { ...workflow, viewport },
          });
        },

        // ==========================================
        // Import/Export
        // ==========================================

        importWorkflow: (workflow) => {
          get().saveToHistory();
          set({
            workflow,
            selectedNodeIds: [],
            selectedEdgeIds: [],
            isDirty: false,
          });
        },

        exportWorkflow: () => {
          return get().workflow;
        },
      }),
      {
        name: 'workflow-editor-storage',
        partialize: (state) => ({
          workflow: state.workflow,
          isNodePaletteOpen: state.isNodePaletteOpen,
          isPropertyPanelOpen: state.isPropertyPanelOpen,
        }),
      }
    ),
    { name: 'WorkflowEditorStore' }
  )
);
