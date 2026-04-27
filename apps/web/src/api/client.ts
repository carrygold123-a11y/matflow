import type {
  AuthUser,
  CreateDriverNotePayload,
  DriverLoadingScanPayload,
  DriverLoginPayload,
  DriverLoginResponse,
  DriverNoteItem,
  DriverUnloadingScanPayload,
  LoginPayload,
  LoginResponse,
  MaterialFilters,
  MaterialItem,
  NotificationEventItem,
  SiteSummary,
  SitePlanItem,
  TransportRequestItem,
  TruckItem,
  UpsertSitePlanPayload,
} from '@matflow/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_UNREACHABLE_ERROR_CODE = 'api_unreachable';

export class ApiError extends Error {
  status: number;
  code?: string;
  responseBody?: unknown;

  constructor(message: string, options: { status?: number; code?: string; responseBody?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.code = options.code;
    this.responseBody = options.responseBody;
  }
}

export interface CreateMaterialPayload {
  title: string;
  description: string;
  category?: string;
  quantity: number;
  condition: 'new' | 'good' | 'used' | 'damaged';
  siteId: string;
  latitude: number;
  longitude: number;
  image: File;
}

export interface CreateTransportPayload {
  materialId: string;
  toSiteId: string;
  truckId: string;
}

export interface CreateSitePayload {
  name: string;
  latitude: number;
  longitude: number;
}

function extractErrorMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map(String).join(', ');
  }

  if (typeof body === 'object' && body !== null) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.map(String).join(', ');
    }
  }

  return null;
}

async function readErrorResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await response.json();
    return {
      body,
      message: extractErrorMessage(body) || `Request failed with ${response.status}`,
    };
  }

  const body = await response.text();
  return {
    body,
    message: body || `Request failed with ${response.status}`,
  };
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    throw new ApiError('API unavailable', {
      code: API_UNREACHABLE_ERROR_CODE,
      responseBody: error,
    });
  }

  if (!response.ok) {
    const { body, message } = await readErrorResponse(response);
    throw new ApiError(message, {
      status: response.status,
      responseBody: body,
    });
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  driverLogin(payload: DriverLoginPayload): Promise<DriverLoginResponse> {
    return request<DriverLoginResponse>('/auth/driver-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createDriverNote(token: string, payload: CreateDriverNotePayload): Promise<DriverNoteItem> {
    return request<DriverNoteItem>('/driver-notes', { method: 'POST', body: JSON.stringify(payload) }, token);
  },
  getMaterials(token: string, filters: MaterialFilters = {}): Promise<MaterialItem[]> {
    const searchParams = new URLSearchParams();

    if (filters.text) searchParams.set('text', filters.text);
    if (filters.category) searchParams.set('category', filters.category);
    if (filters.status) searchParams.set('status', filters.status);
    if (filters.distance !== undefined) searchParams.set('distance', String(filters.distance));
    if (filters.lat !== undefined) searchParams.set('lat', String(filters.lat));
    if (filters.lng !== undefined) searchParams.set('lng', String(filters.lng));

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<MaterialItem[]>(`/materials${suffix}`, {}, token);
  },
  getNearbyMaterials(token: string, lat: number, lng: number): Promise<MaterialItem[]> {
    return request<MaterialItem[]>(`/materials/nearby?lat=${lat}&lng=${lng}`, {}, token);
  },
  getMaterial(token: string, id: string): Promise<MaterialItem> {
    return request<MaterialItem>(`/materials/${id}`, {}, token);
  },
  async createMaterial(token: string, payload: CreateMaterialPayload): Promise<MaterialItem> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    if (payload.category) formData.append('category', payload.category);
    formData.append('quantity', String(payload.quantity));
    formData.append('condition', payload.condition);
    formData.append('siteId', payload.siteId);
    formData.append('latitude', String(payload.latitude));
    formData.append('longitude', String(payload.longitude));
    formData.append('image', payload.image);

    return request<MaterialItem>('/materials', {
      method: 'POST',
      body: formData,
    }, token);
  },
  reserveMaterial(token: string, id: string): Promise<MaterialItem> {
    return request<MaterialItem>(`/materials/${id}/reserve`, { method: 'POST' }, token);
  },
  updateMaterialStatus(token: string, id: string, status: MaterialItem['status']): Promise<MaterialItem> {
    return request<MaterialItem>(`/materials/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, token);
  },
  deleteMaterial(token: string, id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/materials/${id}`, { method: 'DELETE' }, token);
  },
  getMaterialDependents(token: string, id: string): Promise<{ transports: number; zones: number }> {
    return request<{ transports: number; zones: number }>(`/materials/${id}/dependents`, {}, token);
  },
  getTransportRequests(token: string, status?: TransportRequestItem['status']): Promise<TransportRequestItem[]> {
    const suffix = status ? `?status=${status}` : '';
    return request<TransportRequestItem[]>(`/transport-requests${suffix}`, {}, token);
  },
  createTransportRequest(token: string, payload: CreateTransportPayload): Promise<TransportRequestItem> {
    return request<TransportRequestItem>('/transport-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },
  updateTransportStatus(token: string, id: string, status: TransportRequestItem['status']): Promise<TransportRequestItem> {
    return request<TransportRequestItem>(`/transport-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, token);
  },
  getDriverCurrentTransport(token: string): Promise<TransportRequestItem> {
    return request<TransportRequestItem>('/transport-requests/driver/current', {}, token);
  },
  confirmDriverLoading(token: string, id: string, payload: DriverLoadingScanPayload): Promise<TransportRequestItem> {
    return request<TransportRequestItem>(`/transport-requests/${id}/driver/loading-scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },
  confirmDriverUnloading(token: string, id: string, payload: DriverUnloadingScanPayload): Promise<TransportRequestItem> {
    return request<TransportRequestItem>(`/transport-requests/${id}/driver/unloading-scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },
  getTrucks(token: string, available?: boolean): Promise<TruckItem[]> {
    const suffix = available === undefined ? '' : `?available=${available}`;
    return request<TruckItem[]>(`/trucks${suffix}`, {}, token);
  },
  getSites(token: string): Promise<SiteSummary[]> {
    return request<SiteSummary[]>('/sites', {}, token);
  },
  createSite(token: string, payload: CreateSitePayload): Promise<SiteSummary> {
    return request<SiteSummary>('/sites', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },
  deleteSite(token: string, id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/sites/${id}`, { method: 'DELETE' }, token);
  },
  getSiteDependents(token: string, id: string): Promise<{ users: number; materials: number; trucks: number; sitePlans: number; transports: number }> {
    return request<{ users: number; materials: number; trucks: number; sitePlans: number; transports: number }>(`/sites/${id}/dependents`, {}, token);
  },
  getNotifications(token: string): Promise<NotificationEventItem[]> {
    return request<NotificationEventItem[]>('/notifications', {}, token);
  },
  getSitePlan(token: string, planDate: string, siteId?: string): Promise<SitePlanItem> {
    const searchParams = new URLSearchParams({ planDate });
    if (siteId) {
      searchParams.set('siteId', siteId);
    }

    return request<SitePlanItem>(`/site-plans?${searchParams.toString()}`, {}, token);
  },
  upsertSitePlan(token: string, payload: UpsertSitePlanPayload, siteId?: string): Promise<SitePlanItem> {
    const searchParams = new URLSearchParams();
    if (siteId) {
      searchParams.set('siteId', siteId);
    }

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<SitePlanItem>(`/site-plans${suffix}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token);
  },
  getUsers(token: string): Promise<AuthUser[]> {
    return request<AuthUser[]>('/users', {}, token);
  },
  getCurrentUser(token: string): Promise<AuthUser> {
    return request<AuthUser>('/users/me', {}, token);
  },
};
