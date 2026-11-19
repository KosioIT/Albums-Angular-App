import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';
import { MyActivity, SiteStats } from '../models/activity';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  // The signed-in user's likes, listens and downloads
  getMine(): Observable<MyActivity> {
    return apiRequest<MyActivity>(api.get('/users/me/activity'));
  }

  // Admins only
  getSiteStats(): Observable<SiteStats> {
    return apiRequest<SiteStats>(api.get('/stats'));
  }
}
