import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PolicyModal } from "./policy-modal";
import { ExternalLink } from "lucide-react";

interface PolicyAcceptanceProps {
  type: 'register' | 'order';
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
  className?: string;
}

interface PolicyDocument {
  id: number;
  type: 'register' | 'order';
  title: string;
  content: string;
  active: boolean;
}

export function PolicyAcceptance({ 
  type, 
  checked, 
  onCheckedChange, 
  required = true,
  className = ""
}: PolicyAcceptanceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: policy, isLoading } = useQuery<PolicyDocument>({
    queryKey: ['/api/policies', { type }],
    queryFn: async () => {
      const response = await fetch(`/api/policies?type=${type}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar política');
      }
      return response.json();
    }
  });

  if (isLoading || !policy) {
    return (
      <div className={`flex items-start space-x-3 ${className}`}>
        <div className="w-4 h-4 bg-gray-200 animate-pulse rounded"></div>
        <div className="space-y-1">
          <div className="h-4 bg-gray-200 animate-pulse rounded w-48"></div>
          <div className="h-3 bg-gray-200 animate-pulse rounded w-32"></div>
        </div>
      </div>
    );
  }

  const getAcceptanceText = (type: string) => {
    if (type === 'register') {
      return 'Li e aceito os Termos de Cadastro';
    }
    return 'Li e aceito a Política de Pedidos';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id={`policy-${type}`}
          checked={checked}
          onCheckedChange={onCheckedChange}
          required={required}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <label 
            htmlFor={`policy-${type}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {getAcceptanceText(type)}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Ler {policy.title}
            </Button>
          </div>
        </div>
      </div>
      
      <PolicyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={policy.title}
        content={policy.content}
        type={policy.type}
      />
    </div>
  );
}