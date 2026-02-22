import { useState, useEffect } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import "@/components/TitleBar.css";

function LoginTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== "undefined" && window.electron;

  useEffect(() => {
    const checkMaximized = async () => {
      if (!isElectron) return;
      const maximized = await window.electron!.windowControls.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, [isElectron]);

  const handleMinimize = () => window.electron?.windowControls.minimize();
  const handleMaximize = async () => {
    window.electron?.windowControls.maximize();
    const maximized = await window.electron?.windowControls.isMaximized();
    setIsMaximized(maximized ?? false);
  };
  const handleClose = () => window.electron?.windowControls.close();

  if (!isElectron) return null;

  return (
    <div className="titlebar bg-background/80 border-b border-border">
      <div className="titlebar-drag" />
      <div className="titlebar-controls">
        <button className="titlebar-button" onClick={handleMinimize}>
          <Minus size={16} />
        </button>
        <button className="titlebar-button" onClick={handleMaximize}>
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button
          className="titlebar-button titlebar-close"
          onClick={handleClose}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full h-full flex flex-col">
      <LoginTitleBar />
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md p-2">
          <CardHeader className="flex items-center justify-between bg-muted rounded py-1">
            <img src="./logo2.png" alt="Logo" className="w-34 h-12" />
            <CardTitle className="text-center text-2xl text-primary">
              Welcome Back
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
