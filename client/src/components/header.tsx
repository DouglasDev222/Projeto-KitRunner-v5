import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface HeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export function Header({ showBackButton = false, onBack }: HeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLocation("/");
    }
  };

  return (
    <header className="bg-primary text-white p-4 flex items-center justify-between">
      {showBackButton ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-white hover:bg-primary/20 p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : (
        <div className="w-9" />
      )}
      <h1 className="text-xl font-semibold">KitRunner</h1>
      <div className="w-9" />
    </header>
  );
}
