import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

@Injectable()
export class QrCodeService {
  /**
   * Lấy QR code từ file image có sẵn
   */
  async getStaticQrCode(): Promise<string> {
    try {
      // Đường dẫn đến file QR code có sẵn
      // process.cwd() trỏ về thư mục backend khi chạy
      const qrImagePath = path.join(process.cwd(), 'assests', 'qr-payhment', 'image.png');
      
      // Kiểm tra file tồn tại
      if (!fs.existsSync(qrImagePath)) {
        // Thử đường dẫn khác (khi build)
        const altPath = path.join(__dirname, '..', '..', '..', 'assests', 'qr-payhment', 'image.png');
        if (fs.existsSync(altPath)) {
          const imageBuffer = await readFile(altPath);
          const base64Image = imageBuffer.toString('base64');
          return `data:image/png;base64,${base64Image}`;
        }
        throw new Error(`QR code image not found at ${qrImagePath} or ${altPath}`);
      }
      
      // Đọc file và convert sang base64
      const imageBuffer = await readFile(qrImagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Trả về data URL
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error('Error reading QR code image:', error);
      throw new Error(`QR code image not found: ${error.message}`);
    }
  }

  async generateBankTransferQr(
    subscriptionId: string,
    amount: number,
    bankInfo: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      branchName?: string;
    },
  ): Promise<{
    qrCode: string;
    paymentInfo: {
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
      branchName?: string;
      content: string;
    };
  }> {
    const content = `TTGOI${subscriptionId.substring(0, 20)}`.toUpperCase();
    
    // Sử dụng QR code có sẵn từ file image
    const qrCode = await this.getStaticQrCode();

    return {
      qrCode,
      paymentInfo: {
        amount,
        bankName: bankInfo.bankName,
        accountNumber: bankInfo.accountNumber,
        accountName: bankInfo.accountName,
        branchName: bankInfo.branchName,
        content,
      },
    };
  }
}
