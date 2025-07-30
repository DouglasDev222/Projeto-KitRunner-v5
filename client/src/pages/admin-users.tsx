import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Edit, UserX, UserCheck, Shield, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { AdminUser, CreateAdminUser } from '@shared/schema';

export default function AdminUsers() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newUser, setNewUser] = useState<CreateAdminUser>({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'admin',
  });

  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar lista de usuários
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/auth/users'],
    enabled: admin?.role === 'super_admin',
  });

  const users = (usersData as any)?.users || [];

  // Criar usuário
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateAdminUser) => {
      return apiRequest('POST', '/api/admin/auth/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/auth/users'] });
      setIsCreateDialogOpen(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: 'admin',
      });
      toast({
        title: "Usuário criado",
        description: "Novo administrador criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Editar usuário
  const editUserMutation = useMutation({
    mutationFn: async (data: { userId: number; userData: Partial<AdminUser> }) => {
      return apiRequest('PUT', `/api/admin/auth/users/${data.userId}`, data.userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/auth/users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "Usuário atualizado",
        description: "Usuário atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    editUserMutation.mutate({
      userId: editingUser.id,
      userData: {
        fullName: editingUser.fullName,
        email: editingUser.email,
        role: editingUser.role,
        isActive: editingUser.isActive,
      }
    });
  };

  const handleToggleUserStatus = (user: AdminUser) => {
    if (user.id === admin?.id) {
      toast({
        title: "Ação não permitida",
        description: "Não é possível alterar o status do seu próprio usuário",
        variant: "destructive",
      });
      return;
    }

    const action = user.isActive ? 'desativar' : 'ativar';
    const confirmMessage = `Tem certeza que deseja ${action} o usuário ${user.fullName}?`;
    
    if (confirm(confirmMessage)) {
      editUserMutation.mutate({
        userId: user.id,
        userData: { isActive: !user.isActive }
      });
    }
  };

  if (admin?.role !== 'super_admin') {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Acesso negado. Apenas super administradores podem gerenciar usuários.
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie administradores do sistema
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Administrador</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário administrativo
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Nome de Usuário</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select 
                  value={newUser.role} 
                  onValueChange={(value: 'admin' | 'super_admin') => 
                    setNewUser(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="super_admin">Super Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                  className="flex-1"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Usuário'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Edite as informações do administrador
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Nome Completo</Label>
                <Input
                  id="edit-fullName"
                  value={editingUser?.fullName || ''}
                  onChange={(e) => setEditingUser(prev => prev ? {...prev, fullName: e.target.value} : null)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser(prev => prev ? {...prev, email: e.target.value} : null)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-role">Função</Label>
                <Select 
                  value={editingUser?.role || 'admin'} 
                  onValueChange={(value) => setEditingUser(prev => prev ? {...prev, role: value as 'admin' | 'super_admin'} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="super_admin">Super Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editingUser?.isActive ? 'true' : 'false'} 
                  onValueChange={(value) => setEditingUser(prev => prev ? {...prev, isActive: value === 'true'} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={editUserMutation.isPending}
                >
                  {editUserMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editUserMutation.isPending ? (
                    'Atualizando...'
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingUser(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Usuários Administrativos</CardTitle>
            <CardDescription>
              {users?.length || 0} usuários cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                        {user.role === 'super_admin' ? (
                          <>
                            <Shield className="mr-1 h-3 w-3" />
                            Super Admin
                          </>
                        ) : (
                          <>
                            <User className="mr-1 h-3 w-3" />
                            Admin
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'destructive'}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleString('pt-BR')
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={user.id === admin?.id}
                          title={user.isActive ? 'Desativar usuário' : 'Ativar usuário'}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4 text-red-500" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>
    </AdminLayout>
  );
}