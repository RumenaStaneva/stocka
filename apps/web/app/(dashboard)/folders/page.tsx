"use client";

import { useState, useEffect } from "react";
import { api, Folder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const loadFolders = async () => {
    try {
      const result = await api.getFolders();
      setFolders(result.data);
    } catch (err) {
      console.error("Failed to load folders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;

    setCreating(true);
    setError("");

    try {
      await api.createFolder({ name: newFolderName.trim() });
      setNewFolderName("");
      loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    try {
      await api.updateFolder(id, { name: editName.trim() });
      setEditingId(null);
      loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update folder");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this folder?")) return;

    try {
      await api.deleteFolder(id);
      loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  const startEdit = (folder: Folder) => {
    setEditingId(folder.id);
    setEditName(folder.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  // Build folder hierarchy
  const rootFolders = folders.filter((f) => !f.parent_id);
  const getChildren = (parentId: string) =>
    folders.filter((f) => f.parent_id === parentId);

  const renderFolder = (folder: Folder, level: number = 0) => {
    const children = getChildren(folder.id);
    const isEditing = editingId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
          style={{ paddingLeft: `${12 + level * 24}px` }}
        >
          <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
          
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate(folder.id);
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleUpdate(folder.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <span className="flex-1 font-medium">{folder.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEdit(folder)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(folder.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        {children.map((child) => renderFolder(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Folders</h1>
        <p className="text-muted-foreground mt-1">
          Organize your invoices into folders
        </p>
      </div>

      {/* Create New Folder */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Create New Folder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <Button onClick={handleCreate} disabled={creating || !newFolderName.trim()}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Folders List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Folders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No folders yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first folder above
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {rootFolders.map((folder) => renderFolder(folder))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
