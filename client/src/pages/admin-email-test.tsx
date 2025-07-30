import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const testEmailSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório')
});

type TestEmailForm = z.infer<typeof testEmailSchema>;

interface TestEmailResponse {
  message: string;
  email: string;
  timestamp: string;
}

export function AdminEmailTest() {
  const { toast } = useToast();
  const [lastTestResult, setLastTestResult] = useState<TestEmailResponse | null>(null);

  const form = useForm<TestEmailForm>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      email: ''
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: async (data: TestEmailForm): Promise<TestEmailResponse> => {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao enviar email de teste');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLastTestResult(data);
      toast({
        title: 'Email de teste enviado!',
        description: `Email enviado para ${data.email} com sucesso.`,
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: TestEmailForm) => {
    testEmailMutation.mutate(data);
  };

  const predefinedEmails = [
    'admin@kitrunner.com.br',
    'teste@gmail.com',
    'suporte@kitrunner.com.br'
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Teste de Email</h1>
          <p className="text-muted-foreground">
            Teste a integração SendGrid enviando emails de verificação
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Teste */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Enviar Email de Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email de Destino</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="exemplo@email.com" 
                            {...field}
                            disabled={testEmailMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={testEmailMutation.isPending}
                  >
                    <Send className={`w-4 h-4 mr-2 ${testEmailMutation.isPending ? 'animate-pulse' : ''}`} />
                    {testEmailMutation.isPending ? 'Enviando...' : 'Enviar Email de Teste'}
                  </Button>
                </form>
              </Form>

              {/* Emails Pré-definidos */}
              <div className="mt-6">
                <label className="text-sm font-medium mb-2 block">
                  Ou selecione um email pré-definido:
                </label>
                <div className="space-y-2">
                  {predefinedEmails.map((email) => (
                    <Button
                      key={email}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => form.setValue('email', email)}
                      disabled={testEmailMutation.isPending}
                    >
                      {email}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultado do Teste */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Resultado do Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!lastTestResult && !testEmailMutation.isPending && (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum teste executado ainda</p>
                  <p className="text-sm">
                    Envie um email de teste para verificar a integração
                  </p>
                </div>
              )}

              {testEmailMutation.isPending && (
                <div className="text-center py-8">
                  <Send className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-500" />
                  <p className="font-medium">Enviando email de teste...</p>
                  <p className="text-sm text-muted-foreground">
                    Verificando integração SendGrid
                  </p>
                </div>
              )}

              {lastTestResult && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Email enviado com sucesso!</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Para:</strong> {lastTestResult.email}</p>
                      <p><strong>Hora:</strong> {new Date(lastTestResult.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                      Próximos passos:
                    </h4>
                    <ul className="text-sm space-y-1 text-blue-600 dark:text-blue-300">
                      <li>• Verifique a caixa de entrada do email de destino</li>
                      <li>• Verifique também a pasta de spam/lixo eletrônico</li>
                      <li>• O email pode levar alguns minutos para chegar</li>
                      <li>• Verifique os logs de email para mais detalhes</li>
                    </ul>
                  </div>
                </div>
              )}

              {testEmailMutation.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Erro no envio</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {testEmailMutation.error.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema de Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Configuração SendGrid</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• API Key configurada</li>
                  <li>• Domínio verificado: em1561.kitrunner.com.br</li>
                  <li>• Email verificado: contato@kitrunner.com.br</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tipos de Email</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Confirmação de pedidos</li>
                  <li>• Atualizações de status</li>
                  <li>• Emails de teste</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Monitoramento</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Logs completos no banco</li>
                  <li>• Rastreamento SendGrid</li>
                  <li>• Relatórios de entrega</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}