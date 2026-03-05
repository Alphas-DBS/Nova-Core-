<?php
/**
 * Plugin Name: NovaAgent AI Sales Force
 * Description: Enterprise-Grade AI Sales Agent for WordPress & WooCommerce.
 * Version: 1.0.0
 * Author: Nova Systems
 */

if (!defined('ABSPATH')) exit;

class NovaAgent_Plugin {
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_widget']);
        add_action('woocommerce_add_to_cart', [$this, 'sync_cart_to_ai'], 10, 6);
        add_action('woocommerce_checkout_order_processed', [$this, 'sync_order_to_ai'], 10, 3);
    }

    public function add_admin_menu() {
        add_menu_page(
            'NovaAgent',
            'Nova AI',
            'manage_options',
            'nova-agent',
            [$this, 'render_admin_page'],
            'dashicons-robot'
        );
    }

    public function render_admin_page() {
        $api_key = get_option('nova_agent_api_key');
        ?>
        <div class="wrap">
            <h1>NovaAgent Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('nova-agent-settings'); ?>
                <table class="form-table">
                    <tr>
                        <th>API Key</th>
                        <td><input type="text" name="nova_agent_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text"></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <hr>
            <h2>Embedded Dashboard</h2>
            <iframe src="https://ais-dev-normu3u73kj7isxxbz6qlz-130849784325.us-east1.run.app/admin" width="100%" height="800px" style="border:none; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"></iframe>
        </div>
        <?php
    }

    public function enqueue_widget() {
        $api_key = get_option('nova_agent_api_key');
        if (!$api_key) return;

        wp_enqueue_script('nova-agent-widget', 'https://ais-dev-normu3u73kj7isxxbz6qlz-130849784325.us-east1.run.app/widget.js', [], '1.0', true);
        wp_localize_script('nova-agent-widget', 'novaConfig', [
            'apiKey' => $api_key,
            'primaryColor' => '#00f3ff'
        ]);
    }

    public function sync_cart_to_ai($cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data) {
        // Sync to SaaS Engine via REST API
        wp_remote_post('https://ais-dev-normu3u73kj7isxxbz6qlz-130849784325.us-east1.run.app/api/v1/leads/sync', [
            'body' => json_encode([
                'event' => 'add_to_cart',
                'product_id' => $product_id,
                'quantity' => $quantity
            ])
        ]);
    }

    public function sync_order_to_ai($order_id, $posted_data, $order) {
        wp_remote_post('https://ais-dev-normu3u73kj7isxxbz6qlz-130849784325.us-east1.run.app/api/v1/leads/sync', [
            'body' => json_encode([
                'event' => 'order_placed',
                'order_id' => $order_id,
                'total' => $order->get_total(),
                'email' => $order->get_billing_email()
            ])
        ]);
    }
}

new NovaAgent_Plugin();
