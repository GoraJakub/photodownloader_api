import mongoose, { Document } from 'mongoose';

// Definicja interfejsu dla obiektu Image
interface Image extends Document {
  sourceUrl: string;
  storedUrl?: string;
  createdAt: Date;
  finishedAt?: Date;
}

// Schemat dla obiektu Image
const ImageSchema = new mongoose.Schema<Image>({
    
  sourceUrl: { type: String, required: true },
  storedUrl: { type: String },
  createdAt: { type: Date, required: true, default: Date.now },
  finishedAt: { type: Date },
    },
  { collection: 'images' }
);


// Model dla obiektu Image
const ImageModel = mongoose.model<Image>('Image', ImageSchema);

export { Image, ImageModel };