import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/middlewares";
import httpStatus from "http-status";
import bookingService from "@/services/booking-service";

export async function getBooking(req: AuthenticatedRequest, res: Response) {
    const { userId } = req;

    try {
        const userBooking = await bookingService.fetchBooking(userId)

        return res.status(httpStatus.OK).send(userBooking);
    } catch (error) {
        return res.sendStatus(httpStatus.NOT_FOUND);
    }
}

export async function createBooking(req: AuthenticatedRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.body;

    if (!roomId) {
        return res.sendStatus(httpStatus.BAD_REQUEST);
    }

    try {
        const bookingDone = await bookingService.inputBooking(roomId, userId)

        return res.status(httpStatus.OK).send({ bookingId: bookingDone.id });

    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.sendStatus(httpStatus.NOT_FOUND);
        }
        return res.status(httpStatus.FORBIDDEN).send(error);
    }
}

export async function changeBooking(req: AuthenticatedRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.body;
    const { bookingId } = req.params;

    try {
        const bookingUpdate = await bookingService.updateBooking(roomId, userId, Number(bookingId))

        return res.status(httpStatus.OK).send({ bookingId: bookingUpdate });
    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.sendStatus(httpStatus.NOT_FOUND);
        }
        return res.status(httpStatus.FORBIDDEN).send(error);
    }
}