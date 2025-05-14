import { z } from "zod";
import { createContract, createRole } from "@magicbutton.cloud/messaging";

// Define the schemas that match our Prisma models
const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  inventory: z.number().int().min(0),
  category: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

const orderSchema = z.object({
  id: z.string(),
  productId: z.string(),
  customerId: z.string(),
  quantity: z.number().int().positive(),
  status: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Define roles for access control
const adminRole = createRole({
  name: "admin",
  permissions: [
    "read:products",
    "write:products",
    "read:orders",
    "write:orders",
    "read:customers",
    "write:customers",
  ],
});

const customerRole = createRole({
  name: "customer",
  permissions: ["read:products", "write:orders", "read:customers"],
});

// Create the contract
export const inventoryContract = createContract({
  name: "inventory",
  version: "1.0.0",
  events: {
    inventoryChanged: {
      schema: productSchema,
      access: [adminRole, customerRole], // Both roles can subscribe
    },
    orderPlaced: {
      schema: orderSchema,
      access: [adminRole], // Only admins can subscribe
    },
    orderStatusChanged: {
      schema: orderSchema,
      access: [adminRole, customerRole], // Both roles can subscribe
    },
  },
  requests: {
    // Product endpoints
    getProduct: {
      input: z.object({ id: z.string() }),
      output: productSchema,
      access: [adminRole, customerRole], // Both roles can request
    },
    getAllProducts: {
      input: z.object({}),
      output: z.array(productSchema),
      access: [adminRole, customerRole], // Both roles can request
    },
    createProduct: {
      input: z.object({
        name: z.string(),
        price: z.number().positive(),
        inventory: z.number().int().min(0),
        category: z.string(),
      }),
      output: productSchema,
      access: [adminRole], // Only admins can create products
    },
    updateInventory: {
      input: z.object({
        id: z.string(),
        newInventory: z.number().int().min(0),
      }),
      output: productSchema,
      access: [adminRole], // Only admins can update inventory
    },
    
    // Order endpoints
    placeOrder: {
      input: z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        customerInfo: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      }),
      output: z.object({
        id: z.string(),
        productId: z.string(),
        quantity: z.number(),
        customerInfo: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
        }),
      }),
      access: [adminRole, customerRole], // Both roles can place orders
    },
    getOrder: {
      input: z.object({ id: z.string() }),
      output: orderSchema,
      access: [adminRole, customerRole], // Both roles can get order details
    },
    updateOrderStatus: {
      input: z.object({
        id: z.string(),
        status: z.string(),
      }),
      output: orderSchema,
      access: [adminRole], // Only admins can update order status
    },
    
    // Customer endpoints
    getCustomer: {
      input: z.object({ id: z.string() }),
      output: customerSchema,
      access: [adminRole, customerRole], // Both roles can get customer details
    },
    getCustomerOrders: {
      input: z.object({ customerId: z.string() }),
      output: z.array(orderSchema),
      access: [adminRole, customerRole], // Both roles can get customer orders
    },
  },
});