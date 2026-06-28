import { Request, Response } from "express";
import { createDocument, getDocsForUser, getDocById } from "../db/repositories/documents.js";
import { addCollaborator, listCollaborators } from "../db/repositories/collaborators.js";
import { listVersions, saveVersion, getVersionSnapshot, deleteVersion } from "../db/repositories/versions.js";
import { saveUpdate, loadUpdates } from "../db/repositories/yjsUpdates.js";
import * as Y from "yjs";

// Create doc
export const createDoc = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const userId = req.user!.userId;
    
    if (!title) {
      res.status(400).json({ error: true, message: "Missing document title", data: null });
      return;
    }
    
    const { docId } = await createDocument(userId, title);
    res.status(201).json({ error: false, message: "Document created successfully", data: { docId } });
  } catch (error) {
    console.error("Error creating doc:", error);
    res.status(500).json({ error: true, message: "Internal server error during document creation", data: null });
  }
};


// List versions
export const getVersions = async (req: Request, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const userId = req.user!.userId;
    
    const versions = await listVersions(userId, docId);
    res.status(200).json({ error: false, message: "Versions retrieved successfully", data: versions });
  } catch (error) {
    console.error("Error getting versions:", error);
    res.status(500).json({ error: true, message: "Internal server error retrieving versions", data: null });
  }
};

// Save version
export const saveDocVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { docId, snapshot, label } = req.body; 
    
    if (!docId) {
      res.status(400).json({ error: true, message: "Missing docId", data: null });
      return;
    }

    if (!snapshot) {
      res.status(400).json({ error: true, message: "Missing snapshot data", data: null });
      return;
    }
    
    const buffer = Buffer.from(snapshot, 'base64');
    const versionId = await saveVersion(userId, docId, buffer, label);
    
    if (!versionId) {
      res.status(403).json({ error: true, message: "Insufficient permissions", data: null });
      return;
    }
    
    res.status(201).json({ error: false, message: "Version saved successfully", data: { versionId } });
  } catch (error) {
    console.error("Error saving version:", error);
    res.status(500).json({ error: true, message: "Internal server error while saving version", data: null });
  }
};

// Restore version
export const restoreVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { docId, versionId } = req.body;
    
    if (!docId) {
      res.status(400).json({ error: true, message: "Missing docId", data: null });
      return;
    }

    if (!versionId) {
      res.status(400).json({ error: true, message: "Missing versionId", data: null });
      return;
    }
    
    const doc = await getDocById(docId);
    if (!doc) {
      res.status(404).json({ error: true, message: "Document not found", data: null });
      return;
    }
    
    const snapshotBuffer = await getVersionSnapshot(userId, docId, versionId);
    if (!snapshotBuffer) {
      res.status(404).json({ error: true, message: "Version not found", data: null });
      return;
    }
    
    // Extract snapshot text
    const snapshotDoc = new Y.Doc();
    Y.applyUpdate(snapshotDoc, snapshotBuffer);
    const snapshotText = snapshotDoc.getText("content").toString();

    // Build current doc
    const currentDoc = new Y.Doc();
    const currentUpdates = await loadUpdates(userId, docId);
    for (const updateBuffer of currentUpdates) {
      Y.applyUpdate(currentDoc, updateBuffer);
    }
    
    const currentYText = currentDoc.getText("content");

    // Compute restore change
    let newUpdate: Uint8Array | null = null;
    currentDoc.on('update', (updateBytes: Uint8Array) => {
      newUpdate = updateBytes;
    });

    currentDoc.transact(() => {
      currentYText.delete(0, currentYText.length);
      if (snapshotText.length > 0) {
        currentYText.insert(0, snapshotText);
      }
    });

    if (newUpdate) {
      const buffer = Buffer.from(newUpdate);
      await saveUpdate(userId, docId, buffer);
      
      const io = req.app.get('io');
      if (io) {
        io.to(docId).emit('receive_update', buffer);
      }
    }
    
    res.status(200).json({ error: false, message: "Version restored successfully", data: null });
  } catch (error) {
    console.error("Error restoring version:", error);
    res.status(500).json({ error: true, message: "Internal server error while restoring version", data: null });
  }
};

// Delete version
export const deleteDocVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { docId, versionId } = req.body;

    if (!docId || !versionId) {
      res.status(400).json({ error: true, message: "Missing docId or versionId", data: null });
      return;
    }

    const deleted = await deleteVersion(userId, docId, Number(versionId));
    if (!deleted) {
      res.status(404).json({ error: true, message: "Version not found or you don't have permission to delete it", data: null });
      return;
    }

    res.status(200).json({ error: false, message: "Version deleted successfully", data: null });
  } catch (error) {
    console.error("Error deleting version:", error);
    res.status(500).json({ error: true, message: "Internal server error while deleting version", data: null });
  }
};
