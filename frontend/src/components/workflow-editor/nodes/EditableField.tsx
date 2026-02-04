/**
 * EditableField Component
 * Inline editing field for workflow nodes
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Edit2 } from 'lucide-react';

interface EditableFieldProps {
  value: string | number;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
}

export function EditableField({
  value,
  type = 'text',
  placeholder = '点击编辑',
  className = '',
  onSave,
  onCancel,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(String(value));
  };

  const handleSave = () => {
    if (editValue.trim() !== String(value)) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={`h-7 py-1 px-2 text-xs bg-slate-700 border-slate-600 text-slate-200 ${className}`}
          placeholder={placeholder}
        />
        <button
          onClick={handleSave}
          className="p-1 rounded hover:bg-slate-600 text-green-400"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-slate-600 text-red-400"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`group flex items-center gap-1 cursor-pointer hover:bg-slate-700/50 rounded px-1 py-0.5 transition-colors ${className}`}
    >
      <span className="text-slate-200 truncate">{value || placeholder}</span>
      <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Editable textarea for descriptions
interface EditableTextareaProps {
  value: string;
  placeholder?: string;
  rows?: number;
  onSave: (value: string) => void;
}

export function EditableTextarea({
  value,
  placeholder = '点击添加描述',
  rows = 2,
  onSave,
}: EditableTextareaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          rows={rows}
          className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200 resize-none"
          placeholder={placeholder}
        />
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span>Ctrl+Enter 保存, Esc 取消</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group cursor-pointer hover:bg-slate-700/50 rounded px-1 py-0.5 transition-colors"
    >
      {value ? (
        <p className="text-xs text-slate-400 line-clamp-2">{value}</p>
      ) : (
        <p className="text-xs text-slate-600 italic">{placeholder}</p>
      )}
    </div>
  );
}
