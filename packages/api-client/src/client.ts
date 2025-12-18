import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        ...config?.headers,
      },
      ...config,
    });
  }

  setAuthToken(token: string) {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.client.defaults.headers.common["Authorization"];
  }

  get instance() {
    return this.client;
  }
}

