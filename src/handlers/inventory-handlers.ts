import { MessagingServer } from "@magicbutton.cloud/messaging";
import { inventoryContract } from "../contracts/inventory-contract";
import { ProductService } from "../services/product-service";
import { OrderService } from "../services/order-service";
import { CustomerService } from "../services/customer-service";

export function registerInventoryHandlers(server: MessagingServer) {
  // Product handlers
  server.registerHandler(inventoryContract.requests.getProduct, async (req) => {
    const product = await ProductService.getProduct(req.data.id);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  });

  server.registerHandler(inventoryContract.requests.getAllProducts, async () => {
    return ProductService.getAllProducts();
  });

  server.registerHandler(inventoryContract.requests.createProduct, async (req) => {
    const product = await ProductService.createProduct(req.data);
    return product;
  });

  server.registerHandler(inventoryContract.requests.updateInventory, async (req) => {
    const { id, newInventory } = req.data;
    const product = await ProductService.updateInventory(id, newInventory);
    
    // Broadcast inventory change event
    server.broadcast(inventoryContract.events.inventoryChanged, product);
    
    return product;
  });

  // Order handlers
  server.registerHandler(inventoryContract.requests.placeOrder, async (req) => {
    const { productId, quantity, customerInfo } = req.data;
    
    // Find or create customer
    let customer = await CustomerService.getCustomerByEmail(customerInfo.email);
    if (!customer) {
      customer = await CustomerService.createCustomer({
        name: customerInfo.name,
        email: customerInfo.email,
      });
    }
    
    // Create the order
    const order = await OrderService.createOrder({
      productId,
      customerId: customer.id,
      quantity,
    });
    
    // Broadcast events
    server.broadcast(inventoryContract.events.orderPlaced, {
      id: order.id,
      productId: order.productId,
      customerId: order.customerId,
      quantity: order.quantity,
      status: order.status,
    });
    
    // Also broadcast that inventory has changed
    const updatedProduct = await ProductService.getProduct(productId);
    if (updatedProduct) {
      server.broadcast(inventoryContract.events.inventoryChanged, updatedProduct);
    }
    
    // Return formatted response
    return {
      id: order.id,
      productId: order.productId,
      quantity: order.quantity,
      customerInfo: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    };
  });

  server.registerHandler(inventoryContract.requests.getOrder, async (req) => {
    const order = await OrderService.getOrder(req.data.id);
    if (!order) {
      throw new Error("Order not found");
    }
    return order;
  });

  server.registerHandler(inventoryContract.requests.updateOrderStatus, async (req) => {
    const { id, status } = req.data;
    const order = await OrderService.updateOrderStatus(id, status);
    
    // Broadcast order status changed event
    server.broadcast(inventoryContract.events.orderStatusChanged, order);
    
    return order;
  });

  // Customer handlers
  server.registerHandler(inventoryContract.requests.getCustomer, async (req) => {
    const customer = await CustomerService.getCustomer(req.data.id);
    if (!customer) {
      throw new Error("Customer not found");
    }
    return customer;
  });

  server.registerHandler(inventoryContract.requests.getCustomerOrders, async (req) => {
    return OrderService.getCustomerOrders(req.data.customerId);
  });
}