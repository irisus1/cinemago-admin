import api from "@/config/api";
import axios from "axios";

export interface FoodDrink {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  type: "SNACK" | "DRINK" | "COMBO";
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type FoodDrinkPublic = Pick<
  FoodDrink,
  "id" | "name" | "description" | "price" | "image" | "type" | "isAvailable"
>;

export type FoodParams = {
  page?: number;
  limit?: number;
  search?: string;
  isAvailable?: boolean;
  cinemaId?: string;
};

export type PaginationMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ServerPaginated<T> = {
  pagination: PaginationMeta;
  data: T[];
};

export type CreateFoodDrinkRequest = Omit<
  FoodDrink,
  "id" | "createdAt" | "updatedAt" | "isAvailable"
>;

export type UpdateFoodDrinkRequest = Partial<
  Omit<FoodDrink, "id" | "createdAt" | "updatedAt">
>;

type ApiErrorBody = { message?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.message ?? fb
    : fb;

class FoodDrinkService {
  // GET /fooddrinks -> { pagination, data }
  async getFoodDrinks(
    params?: FoodParams
  ): Promise<ServerPaginated<FoodDrinkPublic>> {
    try {
      const { data } = await api.get<ServerPaginated<FoodDrinkPublic>>(
        "/food-drinks/public",
        { params }
      );
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách đồ ăn & thức uống.");
      console.error("Get fooddrinks error:", e);
      throw new Error(msg);
    }
  }

  // GET /fooddrinks/:id -> { data: foodDrink }
  async getFoodDrinkById(id: string): Promise<FoodDrinkPublic> {
    try {
      const { data } = await api.get<{ data: FoodDrinkPublic }>(
        `/food-drinks/public/${id}`
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy thông tin đồ ăn/thức uống.");
      console.error("Get foodDrink detail error:", e);
      throw new Error(msg);
    }
  }

  // POST /fooddrinks -> { data: foodDrink }
  async addFoodDrink(formData: FormData): Promise<FoodDrink> {
    try {
      const { data } = await api.post<{ data: FoodDrink }>(
        "/food-drinks",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo đồ ăn/thức uống.");
      console.error("Create foodDrink error:", e);
      throw new Error(msg);
    }
  }

  // PUT /fooddrinks/:id -> { data: foodDrink }
  async updateFoodDrinkById(
    id: string,
    formData: FormData
  ): Promise<FoodDrink> {
    try {
      const { data } = await api.put<{ data: FoodDrink }>(
        `/food-drinks/${id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật đồ ăn/thức uống.");
      console.error("Update foodDrink error:", e);
      throw new Error(msg);
    }
  }

  // PUT /fooddrinks/:id/toggle -> { data: foodDrink }
  async toggleFoodDrinkAvailability(id: string): Promise<FoodDrink> {
    try {
      const { data } = await api.put<{ data: FoodDrink }>(
        `/food-drinks/${id}/toggle-availability`
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể thay đổi trạng thái đồ ăn/thức uống.");
      console.error("Toggle foodDrink availability error:", e);
      throw new Error(msg);
    }
  }

  // POST /fooddrinks/ids -> { data: foodDrinks[] }
  async getFoodDrinkByIds(ids: string[]): Promise<FoodDrinkPublic[]> {
    try {
      const { data } = await api.post<{ data: FoodDrinkPublic[] }>(
        "/food-drinks/public/by-ids",
        { ids }
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách theo ID.");
      console.error("Get foodDrink by IDs error:", e);
      throw new Error(msg);
    }
  }
}

export const foodDrinkService = new FoodDrinkService();
