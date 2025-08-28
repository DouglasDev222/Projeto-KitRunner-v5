
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

export function LoadingModal({ isOpen, title = "Gerando Relatório", message = "Por favor, aguarde enquanto o relatório está sendo processado..." }: LoadingModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Iniciando processamento...");

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep("Iniciando processamento...");
      return;
    }

    const steps = [
      { step: "Iniciando processamento...", duration: 500 },
      { step: "Consultando dados do banco...", duration: 1500 },
      { step: "Processando informações...", duration: 2000 },
      { step: "Formatando dados...", duration: 1500 },
      { step: "Gerando arquivo...", duration: 1000 },
      { step: "Finalizando...", duration: 500 }
    ];

    let currentStepIndex = 0;
    let currentProgress = 0;
    
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    
    const progressInterval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const stepProgress = Math.min(100, (currentProgress / totalDuration) * 100);
        setProgress(stepProgress);
        
        if (currentProgress === 0 || currentProgress >= steps.slice(0, currentStepIndex).reduce((sum, step) => sum + step.duration, 0)) {
          if (currentStepIndex < steps.length) {
            setCurrentStep(steps[currentStepIndex].step);
          }
        }
        
        currentProgress += 50; // Incrementa a cada 50ms
        
        if (currentProgress >= steps.slice(0, currentStepIndex + 1).reduce((sum, step) => sum + step.duration, 0)) {
          currentStepIndex++;
        }
      } else {
        // Manter em 95% para não chegar a 100% antes do processo real terminar
        setProgress(95);
      }
    }, 50);

    return () => {
      clearInterval(progressInterval);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-lg" hideCloseButton>
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          <LoadingSpinner size="lg" />
          <div className="text-center space-y-2 w-full">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          
          <div className="w-full space-y-3">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentStep}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Este processo pode levar alguns segundos...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
