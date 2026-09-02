import {
  CreatePollInput,
  Poll,
  PollOption,
  PollTallyResult,
  CastBallotResult,
} from '@psepho/core';

export class PsephoApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PsephoApiError';
  }
}

export interface PollDetailsResponse {
  poll: Poll;
  options: PollOption[];
  ballot?: {
    choice: string[];
    receiptCode: string;
    castAt: string;
    revisedAt: string | null;
  } | null;
}

export interface CreatePollResponse {
  slug: string;
  creatorToken: string;
}

export interface ReceiptResponse {
  found: boolean;
  code: string;
  question?: string;
  pollSlug?: string;
  optionLabel?: string;
  castAt?: string;
}

export interface PsephoClientConfig {
  baseUrl?: string;
  getBallotToken?: (pollSlug: string) => Promise<string | null> | string | null;
}

export class PsephoClient {
  private baseUrl: string;
  private getBallotToken?: (pollSlug: string) => Promise<string | null> | string | null;

  constructor(config: PsephoClientConfig = {}) {
    this.baseUrl = (config.baseUrl || '').replace(/\/$/, '');
    this.getBallotToken = config.getBallotToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; headers: Headers; status: number }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 304) {
      return { data: null as unknown as T, headers: response.headers, status: 304 };
    }

    if (!response.ok) {
      let errJson: any;
      try {
        errJson = await response.json();
      } catch {
        errJson = { error: response.statusText };
      }
      throw new PsephoApiError(
        errJson.error || errJson.message || 'API request failed',
        response.status,
        errJson.code,
        errJson.details
      );
    }

    const data = (await response.json()) as T;
    return { data, headers: response.headers, status: response.status };
  }

  async createPoll(input: CreatePollInput): Promise<CreatePollResponse> {
    const { data } = await this.request<CreatePollResponse>('/api/polls', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data;
  }

  async getPoll(slug: string, ballotToken?: string): Promise<PollDetailsResponse> {
    const headers: Record<string, string> = {};
    const token = ballotToken || (this.getBallotToken ? await this.getBallotToken(slug) : null);
    if (token) {
      headers['x-ballot-token'] = token;
    }
    const { data } = await this.request<PollDetailsResponse>(`/api/polls/${slug}`, {
      headers,
    });
    return data;
  }

  async castBallot(
    slug: string,
    choice: string[],
    ballotToken: string
  ): Promise<CastBallotResult> {
    const { data } = await this.request<CastBallotResult>(`/api/polls/${slug}/ballot`, {
      method: 'POST',
      headers: {
        'x-ballot-token': ballotToken,
      },
      body: JSON.stringify({ choice, ballotToken }),
    });
    return data;
  }

  async getTally(
    slug: string,
    options: { etag?: string; ballotToken?: string } = {}
  ): Promise<{ tally: PollTallyResult | null; etag: string | null; notModified: boolean }> {
    const headers: Record<string, string> = {};
    if (options.etag) {
      headers['If-None-Match'] = options.etag;
    }
    const token = options.ballotToken || (this.getBallotToken ? await this.getBallotToken(slug) : null);
    if (token) {
      headers['x-ballot-token'] = token;
    }

    const res = await this.request<PollTallyResult>(`/api/polls/${slug}/tally`, {
      headers,
    });

    if (res.status === 304) {
      return { tally: null, etag: options.etag || null, notModified: true };
    }

    return {
      tally: res.data,
      etag: res.headers.get('ETag'),
      notModified: false,
    };
  }

  async closePoll(slug: string, creatorToken: string): Promise<{ success: boolean; closedAt: string }> {
    const { data } = await this.request<{ success: boolean; closedAt: string }>(`/api/polls/${slug}/close`, {
      method: 'POST',
      headers: {
        'x-creator-token': creatorToken,
      },
      body: JSON.stringify({ creatorToken }),
    });
    return data;
  }

  async deletePoll(slug: string, creatorToken: string): Promise<{ success: boolean }> {
    const { data } = await this.request<{ success: boolean }>(`/api/polls/${slug}`, {
      method: 'DELETE',
      headers: {
        'x-creator-token': creatorToken,
      },
      body: JSON.stringify({ creatorToken }),
    });
    return data;
  }

  async exportCsv(slug: string, creatorToken: string): Promise<string> {
    const url = `${this.baseUrl}/api/polls/${slug}/export.csv`;
    const response = await fetch(url, {
      headers: {
        'x-creator-token': creatorToken,
      },
    });
    if (!response.ok) {
      throw new PsephoApiError('Failed to export CSV', response.status);
    }
    return response.text();
  }

  async checkReceipt(code: string, pollSlug?: string): Promise<ReceiptResponse> {
    const query = pollSlug ? `?poll=${encodeURIComponent(pollSlug)}` : '';
    const { data } = await this.request<ReceiptResponse>(`/api/receipts/${code}${query}`);
    return data;
  }
}
