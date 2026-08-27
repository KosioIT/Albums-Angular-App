export class BaseModel {
    constructor(data, id = null) {
        this.id = id;
        this.created_at = data.created_at || new Date().toISOString();
        this.updated_at = data.updated_at || null;
    }

    update(data) {
        Object.keys(data).forEach(key => {
            if (key in this) {
                this[key] = data[key];
            }
        });
        this.updated_at = new Date().toISOString();
    }

    toFirestore() {
        const obj = { ...this };
        delete obj.id; // Firestore does not store the id field (it's part of the document reference)
        return obj;
    }
}