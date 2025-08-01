Quero que você implemente as seguintes funcionalidades no meu sistema:

🟦 1. TELAS DE ACEITE OBRIGATÓRIO

Adicione uma caixa de seleção obrigatória (checkbox) para o usuário aceitar os documentos “**Termos de Uso e Privacidade**” e “**Política de Entrega**” nas seguintes rotas:

1. `/register` (cadastro de usuário)
2. `/events/1/payment` (tela de pagamento do pedido)

O usuário **só poderá prosseguir** com o cadastro ou pagamento se marcar o checkbox. Exemplo de texto ao lado da caixa:

[ ] Li e concordo com os Termos de Uso e Privacidade e a Política de Entrega.

markdown
Copiar
Editar

Os links devem abrir as políticas em nova aba ou modal.

🟩 2. BANCO DE DADOS: REGISTRO DO ACEITE

Crie uma tabela no banco de dados chamada `aceites_termos` com as seguintes colunas:

- `id`
- `user_id`
- `pedido_id` (opcional – preenchido apenas no aceite durante pagamento)
- `tipo`: string (“registro” ou “pagamento”)
- `versao_termos`: string (ex: “v1.0 - 01/08/2025”)
- `data_aceite`: timestamp
- `ip_usuario`: string (IP da máquina)
- `user_agent`: string (opcional – navegador)

Essa tabela deve ser preenchida:

- Na criação da conta (`/register`)
- No fechamento do pedido (`/events/1/payment`)

🟨 3. ADMIN: EDIÇÃO DAS POLÍTICAS

Crie uma nova seção no painel administrativo, chamada **Políticas Legais**, onde o administrador poderá:

- Editar o conteúdo do documento "Termos de Uso e Privacidade"
- Editar o conteúdo da "Política de Entrega"
- Atribuir e salvar uma nova **versão** para os termos (ex: `v1.1 - 01/08/2025`)

O conteúdo pode ser armazenado em uma tabela `politicas_legais` com:

- `id`
- `tipo`: string (“termos” ou “politica_entrega”)
- `conteudo_html`: long text
- `versao`: string
- `ultima_atualizacao`: datetime

🟥 4. CONTROLE DE VERSÃO

Sempre que um novo conteúdo for salvo no admin, atualize a versão ativa. Os aceites nas telas de `/register` e `/payment` devem sempre referenciar a versão atual registrada no banco de dados no momento do aceite.

🟪 5. SUGESTÕES DE UX

- Use `required` no HTML do checkbox
- Exiba um erro amigável se o checkbox não estiver marcado
- Prefira abrir os documentos em modal ou nova aba

---

📝 Os textos completos dos documentos estão prontos e podem ser inseridos diretamente no painel de admin. Use HTML básico para permitir formatação (títulos, listas, negrito, etc).

Se necessário, posso fornecer o HTML já formatado para os termos.

-<h1>Termos e Condições Gerais de Uso da KITRUNNER SOLUÇÕES E SERVIÇOS</h1>

<p>Os serviços da KITRUNNER SOLUÇÕES E SERVIÇOS são fornecidos pela pessoa jurídica KITRUNNER SOLUÇÕES E SERVIÇOS, inscrita no CNPJ/MF sob o nº 55.108.434/0001-00, titular da propriedade intelectual sobre software, website, conteúdos e demais ativos relacionados à plataforma KITRUNNER.</p>

<h2>Do Objeto</h2>
<p>A plataforma visa licenciar o uso de seu website e fornecer ferramentas para que os usuários solicitem a retirada e entrega de kits de corrida de forma prática e segura.</p>
<p>A KITRUNNER caracteriza-se pela prestação do seguinte serviço:</p>
<ul>
  <li>Retirada de kits de corrida para eventos esportivos junto à organizadora e entrega no endereço indicado pelo cliente.</li>
  <li>O serviço é disponibilizado exclusivamente para a região metropolitana de João Pessoa, incluindo os municípios de João Pessoa, Cabedelo, Bayeux e Santa Rita.</li>
</ul>

<h2>Da Aceitação</h2>
<p>O presente Termo estabelece obrigações contratadas de livre e espontânea vontade entre a plataforma e os usuários. Ao utilizar a plataforma, o usuário aceita integralmente as normas aqui dispostas e compromete-se a observá-las, sob o risco de aplicação das penalidades cabíveis.</p>
<p>Caso não concorde com as disposições deste instrumento, o usuário não deve utilizar a plataforma.</p>

<h2>Do Acesso dos Usuários</h2>
<p>Serão utilizadas todas as soluções técnicas à disposição da KITRUNNER para permitir o acesso à plataforma 24 (vinte e quatro) horas por dia, 7 (sete) dias por semana. No entanto, o acesso poderá ser interrompido, limitado ou suspenso para atualizações ou manutenções necessárias ao bom funcionamento.</p>

<h2>Do Cadastro</h2>
<p>O acesso às funcionalidades da plataforma exige a realização de um cadastro prévio, no qual o usuário deve fornecer os seguintes dados obrigatórios:</p>
<ul>
  <li>Nome completo</li>
  <li>Endereço completo</li>
  <li>Data de nascimento</li>
  <li>CPF</li>
  <li>Documento de identificação com foto</li>
</ul>
<p>A realização do cadastro é restrita a maiores de 18 anos ou menores com autorização expressa de seus responsáveis legais.</p>
<p>Ao se cadastrar, o usuário compromete-se a fornecer informações completas, válidas e atualizadas. O usuário é responsável por manter a confidencialidade de sua senha e login, sendo responsável por todas as atividades realizadas em sua conta.</p>
<p>O descadastramento poderá ser solicitado pelo usuário, desde que não haja débitos pendentes.</p>

<h2>Dos Serviços</h2>
<p>Os serviços oferecidos pela KITRUNNER incluem:</p>
<ul>
  <li>Retirada de kits de corrida junto à organizadora do evento</li>
  <li>Entrega no endereço informado pelo cliente no momento da solicitação</li>
</ul>
<p>A cobrança é realizada com base em um valor variável, considerando o CEP de retirada do kit e o CEP de destino do cliente. Antes da confirmação do pedido, todas as informações sobre preços e prazos serão apresentadas ao cliente.</p>

<h2>Do Cancelamento</h2>
<p>O cliente poderá solicitar o cancelamento do serviço até 1 (um) dia antes da retirada do kit do respectivo evento. O reembolso integral será fornecido em caso de cancelamento dentro do prazo estipulado.</p>

<h2>Da Responsabilidade sobre Problemas na Entrega</h2>
<p>Em caso de problemas relacionados à entrega, a KITRUNNER compromete-se a realizar uma nova entrega gratuita, corrigindo o problema constatado.</p>

<h2>Do Suporte ao Usuário</h2>
<p>O suporte ao usuário será realizado pelos seguintes canais:</p>
<ul>
  <li>WhatsApp</li>
  <li>Telefone</li>
  <li>E-mail: contato@kitrunner.com.br</li>
</ul>
<p>O atendimento está disponível de segunda a sexta-feira, das 8h às 18h.</p>

<h2>Dos Direitos Autorais</h2>
<p>A estrutura do site, a marca, o logotipo, os nomes comerciais, layouts, gráficos e demais conteúdos da KITRUNNER estão protegidos pelas legislações aplicáveis de propriedade intelectual, incluindo a Lei de Direitos Autorais (Lei nº 9.610/98) e a Lei da Propriedade Industrial (Lei nº 9.279/96).</p>
<p>O uso não autorizado, comercial ou não comercial, constitui violação dos direitos de propriedade intelectual da KITRUNNER, sujeitando o infrator às penalidades previstas na legislação.</p>

<h2>Das Alterações</h2>
<p>Os termos descritos neste documento poderão ser alterados a qualquer momento pela KITRUNNER, para adequações legais ou operacionais. As alterações serão informadas aos usuários, que poderão aceitar as novas condições ou cancelar o uso dos serviços.</p>

<h2>Da Política de Privacidade</h2>
<p>O usuário deverá consentir com as disposições contidas na Política de Privacidade apresentada dentro da interface da plataforma, acessível em nosso site.</p>

<h2>Do Foro</h2>
<p>Para a solução de controvérsias decorrentes deste instrumento, será aplicado o Direito brasileiro, sendo eleito o foro da comarca de João Pessoa/PB como o competente para dirimir quaisquer questões relacionadas a este Termo de Uso.</p>

<hr>

<h1>Política de Privacidade</h1>

<p>Na KITRUNNER SOLUÇÕES E SERVIÇOS, privacidade e segurança são prioridades, e nos comprometemos com a transparência no tratamento de dados pessoais dos nossos usuários/clientes. Esta Política de Privacidade estabelece como é feita a coleta, uso e transferência de informações.</p>

<h2>1. Dados coletados</h2>
<ul>
  <li><strong>Dados fornecidos:</strong> Nome, endereço, telefone, e-mail e documento de identificação.</li>
  <li><strong>Dados coletados automaticamente:</strong> Dados de navegação via cookies, IP, navegador etc.</li>
</ul>

<h2>2. Consentimento</h2>
<p>O tratamento dos dados será realizado somente com o seu consentimento, em conformidade com a LGPD (Lei Federal nº 13.709/2018). A revogação do consentimento pode impactar o funcionamento do serviço.</p>

<h2>3. Direitos do titular</h2>
<p>O usuário tem direito a:</p>
<ul>
  <li>Confirmar a existência de tratamento de dados</li>
  <li>Acessar, corrigir, limitar, eliminar ou solicitar a portabilidade de seus dados</li>
  <li>Revogar o consentimento</li>
</ul>

<h2>4. Armazenamento</h2>
<p>Os dados serão armazenados durante a relação contratual ou conforme exigido por lei. Após esse período, serão excluídos ou anonimizados.</p>

<h2>5. Segurança</h2>
<ul>
  <li>Criptografia de dados</li>
  <li>Firewalls</li>
  <li>Controle de acesso restrito</li>
</ul>
<p>A KITRUNNER se compromete a comunicar incidentes de segurança relevantes aos afetados e à ANPD.</p>

<h2>6. Compartilhamento de dados</h2>
<ul>
  <li>Com prestadores de serviço de entrega</li>
  <li>Com a organizadora do evento</li>
</ul>
<p>Não há compartilhamento com terceiros não autorizados ou transferência internacional de dados.</p>

<h2>7. Cookies</h2>
<p>Utilizamos cookies de sessão e analíticos. Você pode gerenciar as permissões no seu navegador.</p>

<h2>8. Alterações</h2>
<p>Esta Política pode ser modificada a qualquer momento. Recomendamos a revisão periódica.</p>

<h2>9. Contato</h2>
<p>Para dúvidas ou solicitações, entre em contato:</p>
<ul>
  <li>E-mail: contato@kitrunner.com.br</li>
  <li>Telefone e formulário disponíveis no site</li>
</ul>
