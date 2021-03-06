/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/first';
import {Http, XHRBackend, Request, RequestOptions, RequestOptionsArgs, Response, Headers, URLSearchParams} from '@angular/http';
import {AuditLogsQueryParams} from '@app/classes/queries/audit-logs-query-params.class';
import {ServiceLogsQueryParams} from '@app/classes/queries/service-logs-query-params.class';
import {ServiceLogsHistogramQueryParams} from '@app/classes/queries/service-logs-histogram-query-params.class';
import {AppStateService} from '@app/services/storage/app-state.service';

@Injectable()
export class HttpClientService extends Http {

  constructor(backend: XHRBackend, defaultOptions: RequestOptions, private appState: AppStateService) {
    super(backend, defaultOptions);
  }

  private readonly apiPrefix = 'api/v1/';

  private readonly endPoints = {
    status: {
      url: 'status'
    },
    auditLogs: {
      url: 'audit/logs',
      params: opts => new AuditLogsQueryParams(opts)
    },
    auditLogsFields: {
      url: 'audit/logs/schema/fields'
    },
    serviceLogs: {
      url: 'service/logs',
      params: opts => new ServiceLogsQueryParams(opts)
    },
    serviceLogsHistogram: {
      url: 'service/logs/histogram',
      params: opts => new ServiceLogsHistogramQueryParams(opts)
    },
    serviceLogsFields: {
      url: 'service/logs/schema/fields'
    },
    components: {
      url: 'service/logs/components'
    },
    clusters: {
      url: 'service/logs/clusters'
    },
    hosts: {
      url: 'service/logs/tree'
    }
  };

  private readonly unauthorizedStatuses = [401, 403, 419];

  private generateUrlString(url: string): string {
    const preset = this.endPoints[url];
    return preset ? `${this.apiPrefix}${preset.url}` : url;
  }

  private generateUrl(request: string | Request): string | Request {
    if (typeof request === 'string') {
      return this.generateUrlString(request);
    }
    if (request instanceof Request) {
      request.url = this.generateUrlString(request.url);
      return request;
    }
  }

  private generateOptions(url: string, params: {[key: string]: string}): RequestOptionsArgs {
    const preset = this.endPoints[url],
      rawParams = preset && preset.params ? preset.params(params) : params;
    if (rawParams) {
      const paramsString = Object.keys(rawParams).map(key => `${key}=${rawParams[key]}`).join('&'),
        urlParams = new URLSearchParams(paramsString, {
          encodeKey: key => key,
          encodeValue: value => encodeURIComponent(value)
        });
      return {
        params: urlParams
      };
    } else {
      return {
        params: rawParams
      };
    }
  }

  private handleError(request: Observable<Response>): void {
    request.subscribe(null, (error: any) => {
      if (this.unauthorizedStatuses.indexOf(error.status) > -1) {
        this.appState.setParameter('isAuthorized', false);
      }
    });
  }

  request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    let req = super.request(this.generateUrl(url), options).share().first();
    this.handleError(req);
    return req;
  }

  get(url, params?: {[key: string]: string}): Observable<Response> {
    return super.get(this.generateUrlString(url), this.generateOptions(url, params));
  }

  postFormData(url: string, params: {[key: string]: string}, options?: RequestOptionsArgs): Observable<Response> {
    const encodedParams = this.generateOptions(url, params).params;
    let body;
    if (encodedParams && encodedParams instanceof URLSearchParams) {
      body = encodedParams.rawParams;
    }
    let requestOptions = Object.assign({}, options);
    if (!requestOptions.headers) {
      requestOptions.headers = new Headers();
    }
    requestOptions.headers.append('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    return super.post(url, body, requestOptions);
  }

}
