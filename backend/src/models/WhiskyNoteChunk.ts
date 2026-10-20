import { Schema, model } from 'mongoose'

/** Length of every embedding vector; text-embedding-3-small returns 1536 numbers by default. */
export const EMBEDDING_DIMENSIONS = 1536

const whiskyNoteChunkSchema = new Schema(
  {
    whiskyId: {
      type: String,
      required: [true, 'Whisky id is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Whisky name is required'],
      trim: true,
    },
    /** The exact text that was embedded: the name, then Nose, Mouth, Finish and Comments. */
    text: {
      type: String,
      required: [true, 'Chunk text is required'],
    },
    /** SHA-256 of `text`; an unchanged hash means the chunk does not need embedding again. */
    sourceHash: {
      type: String,
      required: [true, 'Source hash is required'],
    },
    embedding: {
      type: [Number],
      // An empty or wrong-length vector cannot be searched, so it is refused here.
      validate: {
        validator: (vector: number[]) => vector.length === EMBEDDING_DIMENSIONS,
        message: `Embedding must have ${EMBEDDING_DIMENSIONS} dimensions`,
      },
    },
    /** The model that produced `embedding`; searches must embed the question with the same one. */
    embeddingModel: {
      type: String,
      required: [true, 'Embedding model is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

// One chunk per whisky per embedding model.
whiskyNoteChunkSchema.index({ whiskyId: 1, embeddingModel: 1 }, { unique: true })

export const WhiskyNoteChunk = model('WhiskyNoteChunk', whiskyNoteChunkSchema)
