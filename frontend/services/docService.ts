import { fetchApi } from "./apiClient";

export const docService = {
  createDocument: (title: string) =>
    fetchApi("/api/docs/create_document", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  getVersions: (docId: string) =>
    fetchApi(`/api/docs/document_versions/${docId}`),

  saveVersion: (docId: string, snapshot: string, label: string | null) =>
    fetchApi("/api/docs/save_version", {
      method: "POST",
      body: JSON.stringify({ docId, snapshot, label }),
    }),

  restoreVersion: (docId: string, versionId: number) =>
    fetchApi("/api/docs/restore_version", {
      method: "POST",
      body: JSON.stringify({ docId, versionId }),
    }),

  deleteVersion: (docId: string, versionId: number) =>
    fetchApi("/api/docs/delete_version", {
      method: "POST",
      body: JSON.stringify({ docId, versionId }),
    }),
};
