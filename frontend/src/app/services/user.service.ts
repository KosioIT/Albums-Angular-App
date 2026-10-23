import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor() {}

  getAll(): Observable<User[]> {
    return apiRequest<User[]>(api.get('/users'));
  }

  getById(id: string): Observable<User> {
    return apiRequest<User>(api.get(`/users/id/${id}`));
  }

  getByUsername(username: string): Observable<User> {
    return apiRequest<User>(api.get(`/users/username/${username}`));
  }
}
