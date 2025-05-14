import { prisma } from '../lib/prisma';

export interface CreateProductInput {
  name: string;
  price: number;
  inventory: number;
  category: string;
}

export class ProductService {
  /**
   * Get a product by ID
   */
  static async getProduct(id: string) {
    return prisma.product.findUnique({
      where: { id }
    });
  }

  /**
   * Get all products
   */
  static async getAllProducts() {
    return prisma.product.findMany({
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Create a new product
   */
  static async createProduct(data: CreateProductInput) {
    return prisma.product.create({
      data
    });
  }

  /**
   * Update product inventory
   */
  static async updateInventory(id: string, newInventory: number) {
    // Use a transaction to ensure consistency
    return prisma.$transaction(async (tx) => {
      // First check if the product exists
      const product = await tx.product.findUnique({
        where: { id }
      });

      if (!product) {
        throw new Error(`Product with ID "${id}" not found`);
      }

      // Then update the inventory
      return tx.product.update({
        where: { id },
        data: { 
          inventory: newInventory,
          updatedAt: new Date()
        }
      });
    });
  }

  /**
   * Delete a product
   */
  static async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id }
    });
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(category: string) {
    return prisma.product.findMany({
      where: { category },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Search products by name
   */
  static async searchProducts(query: string) {
    return prisma.product.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive' // Case-insensitive search
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get low inventory products (less than the specified threshold)
   */
  static async getLowInventoryProducts(threshold: number = 10) {
    return prisma.product.findMany({
      where: {
        inventory: {
          lt: threshold
        }
      },
      orderBy: { inventory: 'asc' }
    });
  }
}