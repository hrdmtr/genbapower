import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface Product {
  _id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  description: string;
  createdAt: string;
}

export interface ProductFormData {
  productId: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export const getProducts = async (): Promise<Product[]> => {
  const response = await axios.get(`${API_BASE_URL}/products`);
  return response.data;
};

export const getProduct = async (id: string): Promise<Product> => {
  const response = await axios.get(`${API_BASE_URL}/products/${id}`);
  return response.data;
};

export const createProduct = async (product: ProductFormData): Promise<Product> => {
  const response = await axios.post(`${API_BASE_URL}/products`, product);
  return response.data;
};

export const updateProduct = async (id: string, product: Partial<ProductFormData>): Promise<Product> => {
  const response = await axios.put(`${API_BASE_URL}/products/${id}`, product);
  return response.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/products/${id}`);
};
