export type Role = "owner" | "editor" | "viewer";

export interface UserJWT {
  userId: number;
  email: string;
  name: string;
}

export interface ClientToServer {
  join_doc: (docId: string) => void;
  push_update: (docId: string, update: Uint8Array) => void;
  save_version: (docId: string, label?: string) => void;
}

export interface ServerToClient {
  load_doc: (updates: Uint8Array[]) => void;
  receive_update: (update: Uint8Array) => void;
  version_saved: () => void;
  error: (code: string) => void;
}
