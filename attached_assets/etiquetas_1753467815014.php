<?php
require_once __DIR__ . '/includes/auth.php';
verificarLogin();
require __DIR__ . '/vendor/autoload.php';
use Automattic\WooCommerce\Client;

// Configuração da API WooCommerce
$woocommerce = new Client(
    'https://kitrunner.com.br',
    'ck_2f7de939f36d017a625e054482cd0a90a947f8db',
    'cs_649852e5e57423e450ddd691f98b96d1d90dd215',
    [
        'version' => 'wc/v3',
        'timeout' => 50
    ]
);

// IDs dos pedidos selecionados
$pedidos_ids = explode(',', $_GET['pedidos'] ?? '');

// Funções auxiliares (mantidas do modelo original)
function formatCPF($cpf) {
    $cpf = preg_replace('/[^0-9]/', '', $cpf);
    return substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
}

function formatPhone($phone) {
    $phone = preg_replace('/[^0-9]/', '', $phone);
    $length = strlen($phone);
    
    if ($length === 11) {
        return '(' . substr($phone, 0, 2) . ') ' . substr($phone, 2, 5) . '-' . substr($phone, 7);
    } elseif ($length === 10) {
        return '(' . substr($phone, 0, 2) . ') ' . substr($phone, 2, 4) . '-' . substr($phone, 6);
    }
    
    return $phone;
}

// Obter dados dos pedidos selecionados
$pedidos = [];
foreach ($pedidos_ids as $pedido_id) {
    try {
        $pedido = $woocommerce->get('orders/' . $pedido_id);
        $pedidos[] = $pedido;
    } catch (Exception $e) {
        // Ignorar erros em pedidos individuais
        continue;
    }
}

if (empty($pedidos)) {
    die("Nenhum pedido válido selecionado.");
}
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiquetas de Entrega</title>
    <link rel="stylesheet" href="styleEtiqueta.css">
</head>
<body>

<?php foreach ($pedidos as $order): ?>
    <div class="header">
    <div class="logo-container">
        <img src="logo.png" style="max-height:5mm;"> 
    </div>
    <div class="title-container">
        <h2>Etiqueta de Entrega</h2>
    </div>
</div>

<div class="section">
    <div class="section-title">Informações do Pedido</div>
    <table class="info-table">
        <tr>
            <th>Número:</th>
            <td><?php echo $order->number; ?></td>
        </tr>
        <tr>
            <th>Data:</th>
            <td><?php echo date('d/m/Y', strtotime($order->date_created)); ?></td>
        </tr>
    </table>
</div>

<div class="section">
    <div class="section-title">Dados do Destinatário</div>
    <table class="info-table">
        <tr>
            <th>Nome:</th>
            <td><?php echo $order->shipping->first_name . ' ' . $order->shipping->last_name; ?></td>
        </tr>
        <tr>
            <th>Telefone:</th>
            <td><?php echo formatPhone($order->billing->phone); ?></td>
        </tr>
        <tr>
            <th>CPF:</th>
            <td><?php echo formatCPF($order->meta_data[0]->value); ?></td>
        </tr>
        <tr>
            <th>Endereço:</th>
            <td>
                <?php
                $house_number = '';
                $address_2 = $order->shipping->address_2;
                
                // Busca o número da casa nos meta_data
                foreach ($order->meta_data as $meta) {
                    if ($meta->key === '_billing_house_number') {
                        $house_number = $meta->value;
                        break;
                    }
                }
                
                // Monta o endereço de forma inteligente
                echo $order->shipping->address_1;
                
                // Adiciona número da casa se existir
                if ($house_number) {
                    echo ', ' . $house_number;
                }
                
                // Adiciona complemento (address_2) se existir e for diferente do número
                if ($address_2 && $address_2 !== $house_number) {
                    echo ' - ' . $address_2;
                }
                ?><br>
                <?php echo $order->shipping->city . ' - ' . $order->shipping->state; ?><br>
                CEP: <?php echo $order->shipping->postcode; ?>
            </td>
        </tr>
    </table>
</div>

<div class="section">
    <div class="section-title">Itens do Pedido</div>
    <table class="items-table">
        <tr>
            <th>Produto</th>
            <th>Qtd</th>
        </tr>
        <?php foreach ($order->line_items as $item): ?>
            <?php 
            $num_kits = 0;
            foreach ($item->meta_data as $meta) {
                if ($meta->key === '_my_num_kits') {
                    $num_kits = $meta->value;
                }
            }
            ?>
            <tr>
                <td><?php echo $item->name; ?></td>
                <td><?php echo $num_kits; ?> kit(s)</td>
            </tr>
            <?php if (isset($item->meta_data[1]->value)): ?>
                <?php $kits = $item->meta_data[1]->value; ?>
                <?php foreach ($kits as $kit_id => $kit): ?>
                    <tr>
                        <td colspan="2" class="kit-detail">
                            Kit <?php echo $kit_id; ?>: <?php echo $kit->nome; ?> (CPF: <?php echo formatCPF($kit->cpf); ?>)
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php endif; ?>
        <?php endforeach; ?>
    </table>
</div>

<div class="section">
    <div class="section-title">Confirmação de Recebimento</div>
    <p class="confirmation-text">Declaro que recebi os itens acima relacionados em perfeito estado e conforme especificado.</p>
    
    <div class="signature-area">
        <div class="signature-line"></div>
        <div class="signature-label">Assinatura do Destinatário</div>
        
        <div style="margin-top: 4mm;">
            <div class="signature-line"></div>
            <div class="signature-label">Terceiro Autorizado (nome completo e documento)</div>
        </div>
        
        <div style="margin-top: 4mm; display: flex; justify-content: center;">
            <div style="width: 30mm; margin-right: 5mm;">
                <div class="signature-line" style="width: 100%;"></div>
                <div class="signature-label">CPF</div>
            </div>
            <div style="width: 30mm;">
                <div class="signature-line" style="width: 100%;"></div>
                <div class="signature-label">Data</div>
            </div>
        </div>
    </div>
</div>


    <!-- Adicionar quebra de página para impressão entre pedidos -->
    <div style="page-break-after: always;"></div>
<?php endforeach; ?>

<script>
    // Imprimir automaticamente ao carregar a página
    window.onload = function() {
        window.print();
    };
</script>
</body>
</html>