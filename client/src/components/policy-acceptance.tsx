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
      const data = await response.json();
      // API returns { success: true, policy: {...} }
      return data.policy;
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
      <div className="flex items-center space-x-3">
        <Checkbox
          id={`policy-${type}`}
          checked={checked}
          onCheckedChange={onCheckedChange}
          required={required}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <label 
            htmlFor={`policy-${type}`}
            className="text-xs sm:text-sm font-medium text-neutral-700 cursor-pointer flex items-center gap-1 leading-tight whitespace-nowrap overflow-hidden"
          >
            <span className="truncate">
              {getAcceptanceText(type)}
              {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 underline inline-flex items-center flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Ler
            </Button>
          </label>
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