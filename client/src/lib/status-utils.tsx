import { Badge } from "@/components/ui/badge";

export interface StatusConfig {
  value: string;
  label: string;
  color: string;
}

export const statusOptions: StatusConfig[] = [
  { value: 'all', label: 'Todos os Status', color: 'bg-gray-100 text-gray-800' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-green-100 text-green-800' },
  { value: 'aguardando_pagamento', label: 'Aguardando Pagamento', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  { value: 'kits_sendo_retirados', label: 'Kits sendo Retirados', color: 'bg-blue-100 text-blue-800' },
  { value: 'em_transito', label: 'Em Trânsito', color: 'bg-orange-100 text-orange-800' },
  { value: 'entregue', label: 'Entregue', color: 'bg-green-600 text-white' }
];

export const getStatusLabel = (status: string): string => {
  const statusConfig = statusOptions.find(s => s.value === status);
  return statusConfig ? statusConfig.label : status;
};

export const getStatusColor = (status: string): string => {
  const statusConfig = statusOptions.find(s => s.value === status);
  return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800';
};

export const getStatusBadge = (status: string) => {
  const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];
  return (
    <Badge className={statusConfig.color}>
      {statusConfig.label}
    </Badge>
  );
};