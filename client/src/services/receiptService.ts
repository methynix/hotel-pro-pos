import apiClient from './api';

export interface Receipt {
  _id: string;
  transactionId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: string;
  status: 'generated' | 'printed' | 'emailed';
  printCount: number;
  createdAt: string;
  updatedAt: string;
}

export const receiptService = {
  async generateReceipt(transactionId: string) {
    const { data } = await apiClient.post('/receipts', { transactionId });
    return data.data as Receipt;
  },

  async getReceiptsByTransaction(transactionId: string) {
    const { data } = await apiClient.get(`/receipts/transaction/${transactionId}`);
    return data.data as Receipt;
  },

  async getAllReceipts(page = 1, limit = 20) {
    const { data } = await apiClient.get('/receipts', {
      params: { page, limit },
    });
    return {
      receipts: data.data as Receipt[],
      pagination: data.meta,
    };
  },

  async printReceipt(receiptId: string) {
    const response = await apiClient.get(`/receipts/print/${receiptId}`, {
      responseType: 'text',
    });
    return response.data;
  },

  async deleteReceipt(receiptId: string) {
    const { data } = await apiClient.delete(`/receipts/${receiptId}`);
    return data;
  },
};
