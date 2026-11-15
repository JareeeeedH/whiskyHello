import { NextFunction, Request, Response } from 'express'
import { ObjectSchema } from 'joi'

type RequestPart = 'body' | 'query' | 'params'

export function validate(schema: ObjectSchema, property: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      res.status(400).json({
        message: 'Validation failed',
        details: error.details.map((detail) => detail.message),
      })
      return
    }

    if (property === 'query') {
      // Express 5 makes req.query a getter; redefine it so handlers read the validated value.
      Object.defineProperty(req, 'query', { value, writable: true, configurable: true, enumerable: true })
    } else {
      req[property] = value
    }
    next()
  }
}
