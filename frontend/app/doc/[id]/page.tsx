"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { logout } from "../../../store/features/authSlice";
import { useYDoc } from "../../../hooks/useYDoc";
import { useSync } from "../../../hooks/useSync";
import { useTextarea } from "../../../hooks/useTextarea";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { docService } from "../../../services/docService";
import { Save, Loader2, History, ArrowLeft, Trash2, Share2, Menu, X, LogOut } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Version {
  id: number;
  created_at: string;
  created_by: number;
  label: string | null;
}

export default function DocumentEditor() {
  const params = useParams();
  const docId = params.id as string;
  const { isAuthenticated, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Yjs Hooks
  const { ydoc, ytext, isLoaded } = useYDoc(docId);
  const { isOnline, isReconnecting, connectionError, saveVersion } = useSync(docId, token, ydoc, () => {
    // When someone saves a version, instantly refetch history if panel is open!
    if (isSidebarOpenRef.current) fetchVersions();
  });
  
  // Textarea Hook
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useTextarea(textareaRef, ytext, isLoaded);

  // Version History State
  const [versions, setVersions] = useState<Version[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSidebarOpenRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isAuthenticated === false && token === null) {
      router.push("/login");
    }
  }, [isAuthenticated, token, router]);

  useEffect(() => {
    if (!token || !isSidebarOpen) return;
    fetchVersions();
  }, [token, isSidebarOpen]);

  const fetchVersions = async () => {
    if (!token) return;
    try {
      const json = await docService.getVersions(docId, token);
      setVersions(json.data);
    } catch (err) {}
  };

  const handleSaveVersion = () => {
    setIsSaving(true);
    saveVersion();
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Checkpoint saved!");
      if (isSidebarOpen) fetchVersions();
    }, 500);
  };

  const handleRestore = async (versionId: number) => {
    if (!token) return;
    try {
      await docService.restoreVersion(docId, versionId, token);
      toast.success("Document restored to past version!");
    } catch (err) {
      toast.error("Failed to restore");
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!token) return;
    // Optimistic delete
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
    try {
      await docService.deleteVersion(docId, versionId, token);
      toast.success("Checkpoint deleted.");
    } catch (err) {
      toast.error("Failed to delete checkpoint.");
      fetchVersions();
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied to clipboard!");
      }).catch(() => {
        toast.error("Failed to copy link");
      });
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        // Move it off-screen
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          toast.success("Link copied to clipboard!");
        } else {
          toast.error("Failed to copy link");
        }
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen flex-col bg-transparent text-zinc-900 overflow-hidden">
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="flex items-center justify-between gap-2 bg-red-950/80 border-b border-red-800 px-4 py-2 text-sm text-red-300">
          <span>⚠ {connectionError}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 rounded px-2 py-0.5 text-xs bg-red-800 hover:bg-red-700 text-red-100 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="flex h-14 items-center justify-between border-b border-amber-200 bg-white/50 backdrop-blur-md px-4 relative z-50">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-sm font-medium tracking-wide truncate max-w-[120px] sm:max-w-xs">Doc: {docId}</h1>
          
          <div className="hidden sm:block">
            {isOnline ? (
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Online</Badge>
            ) : connectionError ? (
              <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">Error</Badge>
            ) : isReconnecting ? (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse">Reconnecting</Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Offline</Badge>
            )}
          </div>
          
          <div className="sm:hidden flex items-center ml-1">
            {isOnline ? (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Online" />
            ) : connectionError ? (
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" title="Error" />
            ) : isReconnecting ? (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" title="Reconnecting" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Offline" />
            )}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-200 bg-white hover:bg-amber-50 text-zinc-700"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-200 bg-white hover:bg-amber-50 text-zinc-700"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button 
            size="sm" 
            className="bg-amber-700 hover:bg-amber-800 text-white"
            onClick={handleSaveVersion}
            disabled={!isOnline || isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Checkpoint
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-200 bg-red-50 hover:bg-red-100 text-red-700 ml-2"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="md:hidden flex items-center relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-zinc-600 hover:text-zinc-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {isMobileMenuOpen && (
            <div className="absolute top-12 right-0 bg-white border border-amber-200 shadow-xl rounded-lg p-2 flex flex-col gap-2 min-w-[200px] z-50">
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start border-amber-200 bg-white hover:bg-amber-50 text-zinc-700"
                onClick={() => { handleShare(); setIsMobileMenuOpen(false); }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Link
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start border-amber-200 bg-white hover:bg-amber-50 text-zinc-700"
                onClick={() => { setIsSidebarOpen(!isSidebarOpen); setIsMobileMenuOpen(false); }}
              >
                <History className="mr-2 h-4 w-4" />
                Version History
              </Button>
              <Button 
                size="sm" 
                className="justify-start bg-amber-700 hover:bg-amber-800 text-white"
                onClick={() => { handleSaveVersion(); setIsMobileMenuOpen(false); }}
                disabled={!isOnline || isSaving}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Checkpoint
              </Button>
              <div className="border-t border-amber-100 my-1"></div>
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Editor Area */}
        <div className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'mr-80' : ''} flex justify-center py-8 px-4 overflow-y-auto`}>
          {!isLoaded ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : (
            <Card className="w-full max-w-4xl min-h-[800px] bg-white border-amber-200 shadow-xl p-0 overflow-hidden relative rounded-xl">
              <textarea
                ref={textareaRef}
                className="w-full h-full min-h-[800px] bg-transparent text-zinc-900 p-12 text-lg leading-relaxed outline-none resize-none font-sans placeholder-zinc-400"
                placeholder="Start typing..."
              />
            </Card>
          )}
        </div>

        {/* Right Sidebar (History) */}
        <div 
          className={`absolute top-0 right-0 h-full w-80 bg-white border-l border-amber-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-4 border-b border-amber-200 flex justify-between items-center">
            <h2 className="font-semibold text-zinc-800">Version History</h2>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-60px)]">
            {versions.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center mt-4">No checkpoints saved yet.</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 flex flex-col gap-2 group">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-zinc-500">{new Date(v.created_at).toLocaleString()}</span>
                    <button
                      onClick={() => handleDeleteVersion(v.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-zinc-400 hover:text-red-600"
                      title="Delete this checkpoint"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm text-zinc-700 font-medium">{v.label || `Checkpoint #${v.id}`}</span>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200/50"
                    onClick={() => handleRestore(v.id)}
                  >
                    Restore this version
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
