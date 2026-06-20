import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Express 5: req.query is read-only getter. Store parsed data on req instead of replacing.
    if (source === 'query') {
      (req as any).validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
}
