export class Track extends BaseModel {
  constructor(data, id = null) {
    super(data, id);
    this.title = data.title;
    this.duration = data.duration;
    this.composer = data.composer || [];
  }
}