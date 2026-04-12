import type {
  ConfigCenterApiError,
  ConfigCenterApiErrorCode,
  ConfigCenterResource
} from '@openfons/contracts';

export type ConfigCenterHttpStatus = 400 | 404 | 409 | 423 | 500;

export class ConfigCenterError extends Error {
  readonly code: ConfigCenterApiErrorCode;
  readonly resource?: ConfigCenterResource;
  readonly resourceId?: string;
  readonly projectId?: string;
  readonly routeKey?: string;
  readonly retryable: boolean;
  readonly httpStatus: ConfigCenterHttpStatus;

  constructor(args: {
    code: ConfigCenterApiErrorCode;
    message: string;
    httpStatus: ConfigCenterHttpStatus;
    resource?: ConfigCenterResource;
    resourceId?: string;
    projectId?: string;
    routeKey?: string;
    retryable?: boolean;
  }) {
    super(args.message);
    this.code = args.code;
    this.resource = args.resource;
    this.resourceId = args.resourceId;
    this.projectId = args.projectId;
    this.routeKey = args.routeKey;
    this.retryable = args.retryable ?? false;
    this.httpStatus = args.httpStatus;
  }
}

export const isConfigCenterError = (
  value: unknown
): value is ConfigCenterError => value instanceof ConfigCenterError;

export const toConfigCenterApiError = (
  error: ConfigCenterError
): ConfigCenterApiError => ({
  error: error.code,
  message: error.message,
  resource: error.resource,
  resourceId: error.resourceId,
  projectId: error.projectId,
  routeKey: error.routeKey,
  retryable: error.retryable
});
