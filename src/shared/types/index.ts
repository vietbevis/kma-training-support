import { Request } from 'express';

export interface IRequest extends Request {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

export interface IRouteInfo {
  module: string;
  controller: string;
  method: string;
  path: string;
  handler: string;
}
