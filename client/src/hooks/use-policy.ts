import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PolicyDocument {
  id: number;
  type: 'register' | 'order';
  title: string;
  content: string;
  active: boolean;
}

interface PolicyAcceptanceData {
  userId: number;
  policyId: number;
  context: 'register' | 'order';
  orderId?: number;
}

export function usePolicyByType(type: 'register' | 'order') {
  return useQuery<PolicyDocument>({
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
}

export function useAcceptPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PolicyAcceptanceData) => {
      const response = await apiRequest('POST', '/api/policies/accept', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
    }
  });
}