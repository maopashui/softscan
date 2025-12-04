import { OCRBlock, OCRResult, HistoryItem } from "../types";

// 自动检测当前域名和端口（开发和生产环境都适用）
const API_BASE = process.env.NODE_ENV === 'development'
  ? "http://localhost:5001"  // 开发环境
  : "";  // 生产环境使用相对路径（前后端同域）

// Helper: File -> 纯 base64（不带 data: 前缀）
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface BackendOCRBox {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  confidence: number;
}

interface BackendOCRResponse {
  errcode: number;
  msg: string;
  text: string;
  boxes: BackendOCRBox[];
  width: number;
  height: number;
}

// 对应后端返回的历史记录字段（注意是大写 ID/Text/CreatedAt）
interface BackendHistoryItem {
  ID: number;
  UserID: number;
  Text: string;
  CreatedAt: string;
}

interface BackendListHistoryResponse {
  errcode: number;
  msg: string;
  data: BackendHistoryItem[];
}

const getToken = (): string | null => {
  return localStorage.getItem("token");
};

// 统一的错误处理辅助函数
// 先解析响应体，然后根据状态码和 errcode 处理错误
async function handleResponse<T extends { errcode: number; msg: string }>(
  resp: Response,
  defaultErrorMsg: string
): Promise<T> {
  // 先尝试解析响应体（无论状态码如何）
  let data: T;
  try {
    data = await resp.json();
  } catch (e) {
    // 如果解析失败，抛出状态码相关的错误
    throw new Error(resp.ok ? defaultErrorMsg : `${defaultErrorMsg}: ${resp.status}`);
  }

  // 如果状态码不是 200，使用响应体中的 msg 作为错误信息
  if (!resp.ok) {
    throw new Error(data.msg || `${defaultErrorMsg}: ${resp.status}`);
  }

  // 如果状态码是 200，检查 errcode 是否为 0
  if (data.errcode !== 0) {
    throw new Error(data.msg || defaultErrorMsg);
  }

  return data;
}

// 调用后端 /ocr 接口
export const performOCR = async (base64Image: string): Promise<OCRResult> => {
  const token = getToken();
  if (!token) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/ocr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image: base64Image }),
  });

  const data = await handleResponse<BackendOCRResponse>(resp, "OCR 识别失败");

  // 将后端 box 映射为前端使用的 0-1000 归一化坐标
  const { width, height } = data;
  const blocks: OCRBlock[] = (data.boxes || []).map((b) => {
    const ymin = Math.round((b.top / height) * 1000);
    const xmin = Math.round((b.left / width) * 1000);
    const ymax = Math.round((b.bottom / height) * 1000);
    const xmax = Math.round((b.right / width) * 1000);
    return {
      text: b.text,
      box_2d: [ymin, xmin, ymax, xmax],
    };
  });

  return {
    fullText: data.text,
    blocks,
  };
};

// 获取后端 OCR 历史记录
export const fetchOCRHistory = async (): Promise<HistoryItem[]> => {
  const token = getToken();
  if (!token) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/ocr/history`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await handleResponse<BackendListHistoryResponse>(resp, "获取历史记录失败");

  // 由于后端只保存文本和时间，这里不再还原缩略图和标注框
  const list: HistoryItem[] = data.data.map((item) => ({
    id: String(item.ID),
    timestamp: new Date(item.CreatedAt).getTime(),
    thumbnail: "", // 无法从后端恢复图片，留空
    fullText: item.Text,
    blocks: [],
  }));

  return list;
};

// 清空后端 OCR 历史记录
export const clearOCRHistory = async (): Promise<void> => {
  const token = getToken();
  if (!token) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/ocr/history`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await handleResponse<{ errcode: number; msg: string }>(resp, "清空历史记录失败");
};

// 登录接口
export const login = async (username: string, password: string): Promise<void> => {
  const resp = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await handleResponse<{ errcode: number; msg: string; token?: string }>(resp, "登录失败");
  
  if (!data.token) {
    throw new Error(data.msg || "登录失败：未返回 token");
  }

  localStorage.setItem("token", data.token);
};

// 注册接口
export const register = async (username: string, password: string): Promise<void> => {
  const resp = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  await handleResponse<{ errcode: number; msg: string }>(resp, "注册失败");
};

// 设置 OCR 引擎 token（仅管理员）
export const setOCREngineToken = async (token: string): Promise<void> => {
  const userToken = getToken();
  if (!userToken) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/admin/ocr-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ token }),
  });

  await handleResponse<{ errcode: number; msg: string }>(resp, "设置失败");
};

// 获取 OCR 引擎配置（仅管理员，一次返回 URL 和 Token 状态）
export const getOCREngineConfig = async (): Promise<{ hasToken: boolean; hasURL: boolean; currentURL: string }> => {
  const userToken = getToken();
  if (!userToken) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/admin/ocr-config`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  const data = await handleResponse<{ errcode: number; msg: string; hasToken: boolean; hasURL: boolean; currentURL: string }>(resp, "获取配置失败");

  return { hasToken: data.hasToken, hasURL: data.hasURL, currentURL: data.currentURL };
};

// 获取 OCR 引擎 token 状态（仅管理员，向后兼容）
export const getOCREngineTokenStatus = async (): Promise<{ hasToken: boolean }> => {
  const config = await getOCREngineConfig();
  return { hasToken: config.hasToken };
};

// 设置 OCR 引擎 URL（仅管理员）
export const setOCREngineURL = async (url: string): Promise<void> => {
  const userToken = getToken();
  if (!userToken) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/admin/ocr-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ url }),
  });

  await handleResponse<{ errcode: number; msg: string }>(resp, "设置失败");
};

// 获取 OCR 引擎 URL（仅管理员，向后兼容）
export const getOCREngineURL = async (): Promise<{ hasURL: boolean; currentURL: string }> => {
  const config = await getOCREngineConfig();
  return { hasURL: config.hasURL, currentURL: config.currentURL };
};

// 用户信息接口
export interface UserInfo {
  id: number;
  username: string;
  daily_limit: number;
  used_today: number;
  created_at: string;
}

// 获取用户列表（仅管理员）
export const getUserList = async (): Promise<UserInfo[]> => {
  const userToken = getToken();
  if (!userToken) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/admin/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  const data = await handleResponse<{ errcode: number; msg: string; data: UserInfo[] }>(resp, "获取用户列表失败");

  return data.data;
};

// 更新用户限制次数（仅管理员）
export const updateUserLimit = async (userId: number, limit: number): Promise<void> => {
  const userToken = getToken();
  if (!userToken) {
    throw new Error("未登录或 token 缺失");
  }

  const resp = await fetch(`${API_BASE}/admin/users/limit`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ user_id: userId, limit }),
  });

  await handleResponse<{ errcode: number; msg: string }>(resp, "更新失败");
};