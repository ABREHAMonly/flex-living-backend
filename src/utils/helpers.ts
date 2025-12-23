// src/utils/helpers.ts
import { config } from '../config/env';

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
};

export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) { return 0; }
  const sum = numbers.reduce((a, b) => a + b, 0);
  return parseFloat((sum / numbers.length).toFixed(2));
};

export const parseQueryParams = (query: Record<string, string | string[] | undefined>) => {
  const result: Record<string, string | number | boolean> = {};
  
  Object.keys(query).forEach(key => {
    const value = query[key];
    if (typeof value === 'string') {
      if (value === 'true') { result[key] = true; }
      else if (value === 'false') { result[key] = false; }
      else if (!isNaN(Number(value)) && value !== '') { result[key] = Number(value); }
      else if (value !== '') { result[key] = value; }
    }
  });
  
  return result;
};

export const paginate = <T>(array: T[], page: number, limit: number) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total: array.length,
      pages: Math.ceil(array.length / limit),
      hasNext: endIndex < array.length,
      hasPrev: startIndex > 0,
    },
  };
};

export const isProduction = (): boolean => {
  return config.NODE_ENV === 'production';
};

export const maskSensitiveData = (data: string): string => {
  if (data.length <= 4) { return '****'; }
  return data.slice(0, 2) + '*'.repeat(data.length - 4) + data.slice(-2);
};