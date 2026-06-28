"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { logout } from "../store/features/authSlice";
import { Button } from "../components/ui/button";
import { FilePlus2, Loader2, LogOut } from "lucide-react";
import { docService } from "../services/docService";
import { authService } from "../services/authService";
import { toast } from "sonner";

export default function Dashboard() {
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    //check auth
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleCreateDocument = async () => {
    setIsCreating(true);

    try {
      const json = await docService.createDocument("Untitled Document");

      toast.success("Document created!");
      router.push(`/doc/${json.data.docId}`);
    } catch (err: any) {
      toast.error(err.message);
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    dispatch(logout());
    router.push("/login");
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col items-center justify-center relative">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <Button variant="ghost" className="text-zinc-500 hover:text-zinc-900" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Welcome back, {user?.name || "User"}!
        </h1>
        <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
          Create a new document to start collaborating in real-time.
        </p>
        
        <Button 
          size="lg" 
          className="h-14 px-8 text-lg font-medium bg-amber-700 hover:bg-amber-800 text-white rounded-full shadow-[0_0_40px_-10px_rgba(180,83,9,0.3)] transition-all hover:scale-105"
          onClick={handleCreateDocument}
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          ) : (
            <FilePlus2 className="mr-2 h-6 w-6" />
          )}
          {isCreating ? "Creating..." : "Create Blank Document"}
        </Button>
      </div>
    </div>
  );
}
