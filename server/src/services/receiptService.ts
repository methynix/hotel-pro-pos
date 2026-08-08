import { Receipt, IReceipt } from '../models/Receipt';
import { Transaction } from '../models/Transaction';

export const receiptService = {
  async generateReceiptNumber(): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${timestamp}-${random}`;
  },

  async generateReceipt(transactionId: string, userId: string): Promise<IReceipt> {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const receiptNumber = await this.generateReceiptNumber();

    const receipt = await Receipt.create({
      transactionId,
      userId,
      receiptNumber,
      amount: transaction.amount,
      currency: 'USD',
      description: transaction.description,
      paymentMethod: transaction.paymentMethod || 'cash',
      items: [
        {
          description: transaction.description,
          quantity: 1,
          unitPrice: transaction.amount,
          total: transaction.amount,
        },
      ],
    });

    return receipt;
  },

  async getReceiptsByUser(userId: string, limit = 20, skip = 0): Promise<IReceipt[]> {
    return Receipt.find({ userId }).limit(limit).skip(skip).sort({ createdAt: -1 });
  },

  async getReceiptByTransactionId(transactionId: string): Promise<IReceipt | null> {
    return Receipt.findOne({ transactionId });
  },

  async incrementPrintCount(receiptId: string): Promise<IReceipt | null> {
    return Receipt.findByIdAndUpdate(
      receiptId,
      { $inc: { printCount: 1 }, status: 'printed' },
      { new: true }
    );
  },

  async formatReceiptHTML(receipt: IReceipt): Promise<string> {
    const date = new Date(receipt.createdAt).toLocaleDateString();
    const time = new Date(receipt.createdAt).toLocaleTimeString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; max-width: 400px; margin: 20px auto; }
          .receipt { border: 1px solid #000; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: #666; }
          .receipt-number { font-weight: bold; margin: 10px 0; }
          .line-item { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #999; }
          .item-desc { flex: 1; }
          .item-amount { text-align: right; font-weight: bold; }
          .total-section { margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; font-size: 16px; font-weight: bold; }
          .total-line { display: flex; justify-content: space-between; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
          .qr-section { text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #999; }
          .print-info { font-size: 10px; text-align: right; margin-top: 10px; color: #999; }
          @media print {
            body { margin: 0; }
            .print-info { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="title">ledgerHQ</div>
            <div class="subtitle">Financial Transaction Receipt</div>
          </div>

          <div class="receipt-number">Receipt #: ${receipt.receiptNumber}</div>
          <div style="font-size: 12px; margin: 10px 0;">
            <div>Date: ${date}</div>
            <div>Time: ${time}</div>
            <div>Payment: ${receipt.paymentMethod.toUpperCase()}</div>
          </div>

          <div style="margin: 15px 0; border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 10px 0;">
            <div class="line-item">
              <span class="item-desc">${receipt.description}</span>
              <span class="item-amount">$${receipt.amount.toFixed(2)}</span>
            </div>
          </div>

          <div class="total-section">
            <div class="total-line">
              <span>Total Amount:</span>
              <span>$${receipt.amount.toFixed(2)}</span>
            </div>
            <div class="total-line" style="font-size: 14px; border-top: 1px solid #000; padding-top: 10px;">
              <span>Amount Due:</span>
              <span>$${receipt.amount.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your transaction!</p>
            <p>For support: info@methynix.com | 0715455422</p>
            <p>www.methynix.com</p>
          </div>

          <div class="qr-section">
            <p style="font-size: 10px; margin-bottom: 5px;">Verification Code: ${receipt.receiptNumber}</p>
          </div>

          <div class="print-info">Printed: ${new Date().toLocaleString()} | Copies: ${receipt.printCount}</div>
        </div>
      </body>
      </html>
    `;
  },
};
