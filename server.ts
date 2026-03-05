import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- REST API Bridge Layer (For WP Plugin & External Integrations) ---
  
  // Tenant Verification
  app.get("/api/v1/tenant/verify", (req, res) => {
    const { apiKey } = req.query;
    // In a real app, verify against DB
    res.json({ status: "verified", tenantId: "00000000-0000-0000-0000-000000000000", plan: "Enterprise" });
  });

  // Lead Sync (From WooCommerce / WP Forms)
  app.post("/api/v1/leads/sync", (req, res) => {
    const leadData = req.body;
    console.log("Syncing lead from external source:", leadData);
    
    if (leadData.event === 'add_to_cart') {
      // Logic to track high-intent leads who haven't checked out
      console.log(`High intent: Product ${leadData.product_id} added to cart`);
    } else if (leadData.event === 'order_placed') {
      // Logic to move lead to 'Closed' status
      console.log(`Conversion: Order ${leadData.order_id} placed by ${leadData.email}`);
    }
    
    res.json({ status: "synced", leadId: "new-lead-id" });
  });

  // WooCommerce Webhook Handler
  app.post("/api/v1/webhooks/woocommerce", (req, res) => {
    const event = req.headers["x-wc-webhook-topic"];
    const data = req.body;
    console.log(`WooCommerce Webhook Received: ${event}`, data);
    
    if (event === "order.created") {
      // Trigger AI follow-up or upsell
    }
    
    res.status(200).send("Webhook received");
  });

  // AI Strategy Override (Global behavior)
  app.post("/api/v1/admin/strategy-override", (req, res) => {
    const { tenantId, instruction } = req.body;
    // Update agent_configs in DB
    res.json({ status: "updated" });
  });

  // --- Vite Middleware for Development ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise SaaS AI Engine running at http://localhost:${PORT}`);
  });
}

startServer();
