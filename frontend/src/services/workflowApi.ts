/**
 * Workflow API Service
 * API calls for workflow management
 */

import {
  Workflow,
  WorkflowListItem,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowValidationResult,
  NodeTypeDefinition,
  ExecutionEvent,
} from '@/types/workflow';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class WorkflowApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/workflows`;
  }

  // ==========================================
  // Workflow CRUD
  // ==========================================

  async getWorkflows(): Promise<WorkflowListItem[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }
    return response.json();
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch workflow: ${response.statusText}`);
    }
    return response.json();
  }

  async createWorkflow(request: CreateWorkflowRequest): Promise<WorkflowListItem> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to create workflow: ${response.statusText}`);
    }
    return response.json();
  }

  async updateWorkflow(id: string, request: UpdateWorkflowRequest): Promise<WorkflowListItem> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to update workflow: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteWorkflow(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete workflow: ${response.statusText}`);
    }
  }

  async duplicateWorkflow(id: string): Promise<WorkflowListItem> {
    const response = await fetch(`${this.baseUrl}/${id}/duplicate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to duplicate workflow: ${response.statusText}`);
    }
    return response.json();
  }

  // ==========================================
  // Node Types
  // ==========================================

  async getNodeTypes(): Promise<NodeTypeDefinition[]> {
    const response = await fetch(`${this.baseUrl}/node-types`);
    if (!response.ok) {
      throw new Error(`Failed to fetch node types: ${response.statusText}`);
    }
    return response.json();
  }

  // ==========================================
  // Validation
  // ==========================================

  async validateWorkflow(id: string): Promise<WorkflowValidationResult> {
    const response = await fetch(`${this.baseUrl}/${id}/validate`);
    if (!response.ok) {
      throw new Error(`Failed to validate workflow: ${response.statusText}`);
    }
    return response.json();
  }

  // ==========================================
  // Execution
  // ==========================================

  async executeWorkflow(
    id: string,
    query: string,
    settings: Record<string, any>
  ): Promise<ReadableStream<ExecutionEvent>> {
    const response = await fetch(`${this.baseUrl}/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, settings }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute workflow: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return this.parseEventStream(response.body);
  }

  private parseEventStream(body: ReadableStream<Uint8Array>): ReadableStream<ExecutionEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      start(controller) {
        let buffer = '';

        const pump = async () => {
          try {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  controller.enqueue(eventData);
                } catch (e) {
                  console.warn('Failed to parse event data:', line);
                }
              }
            }

            pump();
          } catch (error) {
            controller.error(error);
          }
        };

        pump();
      },
    });
  }

  // ==========================================
  // Import/Export
  // ==========================================

  exportWorkflow(workflow: Workflow): string {
    return JSON.stringify(workflow, null, 2);
  }

  importWorkflow(json: string): Workflow {
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new Error('Invalid workflow JSON');
    }
  }

  downloadWorkflow(workflow: Workflow): void {
    const blob = new Blob([this.exportWorkflow(workflow)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.metadata.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async uploadWorkflow(file: File): Promise<Workflow> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = this.importWorkflow(e.target?.result as string);
          resolve(workflow);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

export const workflowApi = new WorkflowApiService();
