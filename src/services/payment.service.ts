import api from "@/config/api";

export interface Payment {
  id: string;
  userId: string;
  bookingId: string;
  method: "MOMO" | "VNPAY" | "ZALOPAY";
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  amount: number;
  bookingId: string;
}

export const paymentService = {
  /**
   * Lấy danh sách payment theo userId (BE tự lấy token -> user)
   */
  async getMyPayments(page = 1, limit = 10) {
    const res = await api.get("/payments", {
      params: { page, limit },
    });
    return res.data;
  },

  /**
   * Lấy 1 payment theo ID
   */
  async getPaymentById(id: string) {
    const res = await api.get(`/payments/${id}`);
    return res.data.data as Payment;
  },
  /**
   * Tạo thanh toán bằng MoMo
   */
  async checkoutWithMoMo(payload: CreatePaymentRequest) {
    const res = await api.post("/payments/momo/checkout", payload);
    return res.data.URL as string; // payUrl
  },

  /**
   * Check trạng thái giao dịch MoMo
   */
  async checkStatusMoMo(paymentId: string) {
    const res = await api.get(`/public/payments/momo/status/${paymentId}`);
    return res.data.data;
  },

  async checkoutWithVnPay(payload: CreatePaymentRequest) {
    const res = await api.post("/payments/vnpay/checkout", payload);
    return res.data.URL as string; // redirect URL
  },

  async checkStatusVnPay(paymentId: string) {
    const res = await api.get(`/public/payments/vnpay/status/${paymentId}`);
    return res.data.data;
  },

  async checkoutWithZaloPay(payload: CreatePaymentRequest) {
    const res = await api.post("/payments/zalopay/checkout", payload);
    return res.data.URL as string;
  },

  async checkStatusZaloPay(appTransId: string) {
    const res = await api.get(`/public/payments/zalopay/status/${appTransId}`);
    return res.data.data;
  },
};

export default paymentService;
