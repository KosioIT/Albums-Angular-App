import { BaseModel } from './BaseModel.js';
import { makeSlug } from '../utils/slugify.js';

export class Track extends BaseModel {
  constructor(data, id = null) {
    const finalId = id || makeSlug(data.title);

    super(data, finalId);

    this.id = finalId;

    this.title = data.title;
    this.duration = data.duration;
    this.composer = data.composer || [];
  }
}