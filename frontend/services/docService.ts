import { fetchApi } from "./apiClient";

export const docService = {
  createDocument: (title: string, token: string) =>
    fetchApi("/api/docs/create_document", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    }),

  getVersions: (docId: string, token: string) =>
    fetchApi(`/api/docs/document_versions/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  saveVersion: (docId: string, snapshot: string, label: string | null, token: string) =>
    fetchApi("/api/docs/save_version", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ docId, snapshot, label }),
    }),

  restoreVersion: (docId: string, versionId: number, token: string) =>
    fetchApi("/api/docs/restore_version", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ docId, versionId }),
    }),

  deleteVersion: (docId: string, versionId: number, token: string) =>
    fetchApi("/api/docs/delete_version", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ docId, versionId }),
    }),
};
