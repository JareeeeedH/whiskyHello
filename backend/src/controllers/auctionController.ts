import { NextFunction, Request, Response } from 'express'
import * as auctionService from '../services/auctionService'
import type {
  CancelAuctionBody,
  CreateAuctionBody,
  UpdateAuctionBody,
} from '../validations/auctionValidation'

export async function listPublic(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auctions = await auctionService.listPublicAuctions()
    res.status(200).json({ auctions })
  } catch (error) {
    next(error)
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auction = await auctionService.getPublicAuctionById(
      String(req.params.id),
    )
    res.status(200).json({ auction })
  } catch (error) {
    next(error)
  }
}

export async function list(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auctions = await auctionService.listAuctionsForAdmin()
    res.status(200).json({ auctions })
  } catch (error) {
    next(error)
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const auction = await auctionService.createAuction(
      req.user.userId,
      req.body as CreateAuctionBody,
    )
    res.status(201).json({ auction })
  } catch (error) {
    next(error)
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const auction = await auctionService.updateDraftAuction(
      String(req.params.id),
      req.body as UpdateAuctionBody,
    )
    res.status(200).json({ auction })
  } catch (error) {
    next(error)
  }
}

export async function start(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const auction = await auctionService.startDraftAuction(String(req.params.id))
    res.status(200).json({ auction })
  } catch (error) {
    next(error)
  }
}

export async function cancel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const auction = await auctionService.cancelAuction(
      String(req.params.id),
      req.user.userId,
      req.body as CancelAuctionBody,
    )
    res.status(200).json({ auction })
  } catch (error) {
    next(error)
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    await auctionService.deleteAuction(String(req.params.id))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
